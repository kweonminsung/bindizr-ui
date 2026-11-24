package webhooks

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"slices"
	"time"
)

const (
	testEventType       = "webhook.test"
	maxDeliveryAttempts = 3
	deliveryLease       = 30 * time.Second
)

const schema = `
CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    operations TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    secret TEXT NOT NULL,
    destination_revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id),
    destination_revision INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload BLOB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    http_status INTEGER,
    error_message TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    next_attempt_at INTEGER NOT NULL,
    leased_until INTEGER
);
CREATE INDEX IF NOT EXISTS webhook_deliveries_history ON webhook_deliveries (webhook_id, id DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_schedule ON webhook_deliveries (next_attempt_at, id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS webhook_deliveries_terminal ON webhook_deliveries (webhook_id, id DESC) WHERE status <> 'pending';
CREATE TRIGGER IF NOT EXISTS webhook_deliveries_prune
AFTER UPDATE OF status ON webhook_deliveries
WHEN OLD.status = 'pending' AND NEW.status <> 'pending'
BEGIN
    DELETE FROM webhook_deliveries WHERE id IN (
        SELECT id FROM webhook_deliveries WHERE webhook_id = NEW.webhook_id AND status <> 'pending'
        ORDER BY id DESC LIMIT -1 OFFSET 50
    );
END;
`

type EventTarget struct {
	Name       string `json:"name,omitempty"`
	ZoneName   string `json:"zone_name,omitempty"`
	RecordID   int64  `json:"record_id,omitempty"`
	RecordName string `json:"record_name,omitempty"`
	RecordType string `json:"record_type,omitempty"`
}

type Event struct {
	Operation string
	Target    EventTarget
	Result    string
	CreatedAt time.Time
}

type eventPayload struct {
	ID        string       `json:"id"`
	Type      string       `json:"type"`
	CreatedAt time.Time    `json:"created_at"`
	Target    *EventTarget `json:"target,omitempty"`
	Result    string       `json:"result,omitempty"`
	Source    string       `json:"source,omitempty"`
}

type webhook struct {
	ID         int64    `json:"id"`
	Name       string   `json:"name"`
	URL        string   `json:"url"`
	Operations []string `json:"operations"`
	Enabled    bool     `json:"enabled"`
}

type webhookSettings struct {
	webhook
	Secret string `json:"secret"`
}

type delivery struct {
	ID           int64        `json:"id"`
	EventID      string       `json:"event_id"`
	EventType    string       `json:"event_type"`
	Target       *EventTarget `json:"target,omitempty"`
	Status       string       `json:"status"`
	Attempts     int          `json:"attempts"`
	HTTPStatus   *int         `json:"http_status,omitempty"`
	ErrorMessage string       `json:"error_message,omitempty"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

type deliveryJob struct {
	ID        int64
	URL       string
	Secret    string
	EventID   string
	EventType string
	Payload   []byte
	Attempts  int
	Lease     time.Time
}

type Service struct {
	db         *sql.DB
	wake       chan struct{}
	operations []string
}

func New(database *sql.DB, operations []string) (*Service, error) {
	if err := initializeStore(database); err != nil {
		return nil, err
	}
	catalog := append([]string{}, operations...)
	slices.Sort(catalog)
	catalog = slices.Compact(catalog)
	return &Service{db: database, wake: make(chan struct{}, 1), operations: catalog}, nil
}

// initializeStore upgrades local metadata without rewriting queued event bodies.
func initializeStore(database *sql.DB) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(schema); err != nil {
		return err
	}
	for _, change := range []struct {
		table, column, statement string
	}{
		{"webhooks", "events", "ALTER TABLE webhooks RENAME COLUMN events TO operations"},
		{"webhook_deliveries", "status_code", "ALTER TABLE webhook_deliveries RENAME COLUMN status_code TO http_status"},
		{"webhook_deliveries", "error", "ALTER TABLE webhook_deliveries RENAME COLUMN error TO error_message"},
	} {
		var exists bool
		err := tx.QueryRow("SELECT EXISTS (SELECT 1 FROM pragma_table_info(?) WHERE name = ?)", change.table, change.column).
			Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			if _, err := tx.Exec(change.statement); err != nil {
				return err
			}
		}
	}
	if _, err := tx.Exec(`
		WITH renamed(old, operation) AS (
		    VALUES ('zone.created', 'zone.create'), ('zone.updated', 'zone.update'),
		           ('zone.deleted', 'zone.delete'), ('zone.imported', 'zone.import'),
		           ('zone.import_many', 'zone.import'), ('zone.rolled_back', 'zone.rollback'),
		           ('record.created', 'record.create'), ('record.updated', 'record.update'),
		           ('record.deleted', 'record.delete'), ('dnssec.confirm_ds', 'dnssec.advance_rollover')
		)
		UPDATE webhooks SET operations = (
		    SELECT json_group_array(operation)
		    FROM (
		        SELECT DISTINCT COALESCE(renamed.operation, subscription.value) AS operation
		        FROM json_each(webhooks.operations) AS subscription
		        LEFT JOIN renamed ON renamed.old = subscription.value
		        ORDER BY operation
		    )
		)
		WHERE EXISTS (
		    SELECT 1 FROM json_each(webhooks.operations) AS subscription
		    JOIN renamed ON renamed.old = subscription.value
		)`); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) supports(operation string) bool {
	_, found := slices.BinarySearch(s.operations, operation)
	return found && operation != testEventType
}

func (s *Service) listWebhooks(ctx context.Context) ([]webhook, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name, url, operations, enabled FROM webhooks ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []webhook{}
	for rows.Next() {
		item, err := scanWebhook(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Service) getWebhook(ctx context.Context, id int64) (webhook, error) {
	return scanWebhook(s.db.QueryRowContext(ctx, "SELECT id, name, url, operations, enabled FROM webhooks WHERE id = ?", id))
}

func scanWebhook(row interface{ Scan(...any) error }) (webhook, error) {
	var item webhook
	var operations string
	err := row.Scan(&item.ID, &item.Name, &item.URL, &operations, &item.Enabled)
	if err == nil {
		err = json.Unmarshal([]byte(operations), &item.Operations)
	}
	return item, err
}

func (s *Service) createWebhook(ctx context.Context, settings webhookSettings) (webhook, error) {
	operations, err := json.Marshal(settings.Operations)
	if err != nil {
		return webhook{}, err
	}
	return scanWebhook(s.db.QueryRowContext(ctx, `
		INSERT INTO webhooks (name, url, operations, enabled, secret) VALUES (?, ?, ?, ?, ?)
		RETURNING id, name, url, operations, enabled`, settings.Name, settings.URL, string(operations), settings.Enabled, settings.Secret))
}

func (s *Service) updateWebhook(ctx context.Context, id int64, settings webhookSettings) (webhook, error) {
	operations, err := json.Marshal(settings.Operations)
	if err != nil {
		return webhook{}, err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return webhook{}, err
	}
	defer tx.Rollback()

	item, err := scanWebhook(tx.QueryRowContext(ctx, `
		UPDATE webhooks SET name = ?, url = ?, operations = ?, enabled = ?, secret = COALESCE(NULLIF(?, ''), secret),
			destination_revision = destination_revision + (url <> ?)
		WHERE id = ? RETURNING id, name, url, operations, enabled`,
		settings.Name, settings.URL, string(operations), settings.Enabled, settings.Secret, settings.URL, id))
	if err != nil {
		return webhook{}, err
	}
	// A leased attempt can finish, but pending sends must still match the saved destination.
	_, err = tx.ExecContext(ctx, `
		UPDATE webhook_deliveries AS d SET status = 'failed', http_status = NULL, updated_at = ?,
			error_message = CASE WHEN d.destination_revision <> w.destination_revision THEN 'Webhook destination changed' ELSE 'Webhook disabled' END
		FROM webhooks AS w
		WHERE d.webhook_id = ? AND d.webhook_id = w.id AND d.status = 'pending' AND d.leased_until IS NULL
			AND (d.destination_revision <> w.destination_revision OR (w.enabled = 0 AND d.event_type <> ?))`,
		time.Now().UnixMilli(), id, testEventType)
	if err != nil {
		return webhook{}, err
	}
	return item, tx.Commit()
}

func (s *Service) removeWebhook(ctx context.Context, id int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, "DELETE FROM webhook_deliveries WHERE webhook_id = ?", id); err != nil {
		return err
	}
	var deletedID int64
	if err := tx.QueryRowContext(ctx, "DELETE FROM webhooks WHERE id = ? RETURNING id", id).Scan(&deletedID); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) listDeliveries(ctx context.Context, webhookID int64) ([]delivery, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var id int64
	if err := tx.QueryRowContext(ctx, "SELECT id FROM webhooks WHERE id = ?", webhookID).Scan(&id); err != nil {
		return nil, err
	}
	rows, err := tx.QueryContext(ctx, `
		SELECT id, event_id, event_type, payload, status, attempts, http_status, error_message, created_at, updated_at
		FROM webhook_deliveries WHERE webhook_id = ? ORDER BY id DESC LIMIT 50`, webhookID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []delivery{}
	for rows.Next() {
		var item delivery
		var payload []byte
		var createdAt, updatedAt int64
		if err := rows.Scan(&item.ID, &item.EventID, &item.EventType, &payload, &item.Status, &item.Attempts,
			&item.HTTPStatus, &item.ErrorMessage, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		var event struct {
			eventPayload
			ZoneName string `json:"zone_name"`
			RecordID int64  `json:"record_id"`
		}
		if err := json.Unmarshal(payload, &event); err != nil {
			return nil, err
		}
		item.Target = event.Target
		if item.Target == nil && (event.ZoneName != "" || event.RecordID != 0) {
			item.Target = &EventTarget{ZoneName: event.ZoneName, RecordID: event.RecordID}
		}
		item.CreatedAt = time.UnixMilli(createdAt).UTC()
		item.UpdatedAt = time.UnixMilli(updatedAt).UTC()
		items = append(items, item)
	}
	return items, rows.Err()
}

// Enqueue records one delivery per active subscription after a confirmed Bindizr response.
func (s *Service) Enqueue(ctx context.Context, events ...Event) error {
	for _, event := range events {
		if !s.supports(event.Operation) {
			return errors.New("unsupported webhook operation")
		}
	}
	return s.enqueue(ctx, 0, events...)
}

func (s *Service) enqueueTest(ctx context.Context, webhookID int64) error {
	return s.enqueue(ctx, webhookID, Event{Operation: testEventType})
}

func (s *Service) enqueue(ctx context.Context, webhookID int64, events ...Event) error {
	if len(events) == 0 {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO webhook_deliveries (webhook_id, destination_revision, event_id, event_type, payload, created_at, updated_at, next_attempt_at)
		SELECT id, destination_revision, ?, ?, ?, ?, ?, ? FROM webhooks
		WHERE id = ? OR (? = 0 AND enabled = 1 AND EXISTS (SELECT 1 FROM json_each(operations) WHERE value = ?))`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	now := time.Now().UTC()
	var queued int64
	for _, event := range events {
		var randomID [16]byte
		if _, err := rand.Read(randomID[:]); err != nil {
			return err
		}
		payload := eventPayload{
			ID: hex.EncodeToString(randomID[:]), Type: event.Operation, CreatedAt: event.CreatedAt, Result: event.Result,
		}
		if payload.CreatedAt.IsZero() {
			payload.CreatedAt = now
		}
		if webhookID == 0 {
			payload.Source = "api"
			if event.Target != (EventTarget{}) {
				payload.Target = &event.Target
			}
		}
		body, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		result, err := stmt.ExecContext(ctx, payload.ID, payload.Type, body, now.UnixMilli(), now.UnixMilli(), now.UnixMilli(), webhookID, webhookID, payload.Type)
		if err != nil {
			return err
		}
		count, err := result.RowsAffected()
		if err != nil {
			return err
		}
		queued += count
	}
	if queued == 0 && webhookID != 0 {
		return sql.ErrNoRows
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if queued > 0 {
		select {
		case s.wake <- struct{}{}:
		default:
		}
	}
	return nil
}

func (s *Service) claim(ctx context.Context, now time.Time) (*deliveryJob, error) {
	// Recover expired final attempts and discard deliveries whose destination is no longer active.
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries AS d SET status = 'failed', http_status = NULL, leased_until = NULL, updated_at = ?,
			error_message = CASE
				WHEN d.attempts >= ? THEN 'Delivery interrupted'
				WHEN d.destination_revision <> w.destination_revision THEN 'Webhook destination changed'
				ELSE 'Webhook disabled'
			END
		FROM webhooks AS w
		WHERE d.webhook_id = w.id AND d.status = 'pending' AND (d.leased_until IS NULL OR d.leased_until <= ?)
			AND (d.attempts >= ? OR d.destination_revision <> w.destination_revision OR (w.enabled = 0 AND d.event_type <> ?))`,
		now.UnixMilli(), maxDeliveryAttempts, now.UnixMilli(), maxDeliveryAttempts, testEventType)
	if err != nil {
		return nil, err
	}

	var job deliveryJob
	job.Lease = now.Add(deliveryLease)
	err = s.db.QueryRowContext(ctx, `
		UPDATE webhook_deliveries SET attempts = attempts + 1, leased_until = ?, http_status = NULL, error_message = '', updated_at = ?
		WHERE id = (
			SELECT d.id FROM webhook_deliveries d JOIN webhooks w ON w.id = d.webhook_id
			WHERE d.status = 'pending' AND d.next_attempt_at <= ? AND (d.leased_until IS NULL OR d.leased_until <= ?)
				AND d.attempts < ? AND d.destination_revision = w.destination_revision AND (w.enabled = 1 OR d.event_type = ?)
			ORDER BY d.next_attempt_at, d.id LIMIT 1
		)
		RETURNING id, event_id, event_type, payload, attempts,
			(SELECT url FROM webhooks WHERE id = webhook_id), (SELECT secret FROM webhooks WHERE id = webhook_id)`,
		job.Lease.UnixMilli(), now.UnixMilli(), now.UnixMilli(), now.UnixMilli(), maxDeliveryAttempts, testEventType).
		Scan(&job.ID, &job.EventID, &job.EventType, &job.Payload, &job.Attempts, &job.URL, &job.Secret)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &job, err
}

func (s *Service) finish(ctx context.Context, job *deliveryJob, httpStatus int, errorMessage string, nextAttempt time.Time) error {
	status := "delivered"
	if errorMessage != "" {
		status = "failed"
		if !nextAttempt.IsZero() && job.Attempts < maxDeliveryAttempts {
			status = "pending"
		}
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE webhook_deliveries AS d SET
			status = CASE
				WHEN ? = 'pending' AND (d.destination_revision <> w.destination_revision OR (w.enabled = 0 AND d.event_type <> ?)) THEN 'failed'
				ELSE ?
			END,
			http_status = NULLIF(?, 0), error_message = ?, updated_at = ?, next_attempt_at = ?, leased_until = NULL
		FROM webhooks AS w
		WHERE d.webhook_id = w.id AND d.id = ? AND d.status = 'pending' AND d.attempts = ? AND d.leased_until = ?`,
		status, testEventType, status, httpStatus, errorMessage, time.Now().UnixMilli(), nextAttempt.UnixMilli(),
		job.ID, job.Attempts, job.Lease.UnixMilli())
	return err
}
