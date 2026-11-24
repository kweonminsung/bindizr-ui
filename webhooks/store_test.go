package webhooks

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func openWebhookStore(t *testing.T) *Service {
	t.Helper()
	database, err := sql.Open("sqlite3", filepath.Join(t.TempDir(), "webhooks.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })
	service, err := New(database, []string{"zone.create", "zone.update", "record.update", "record.delete", "role.create"})
	if err != nil {
		t.Fatal(err)
	}
	return service
}

func requestWebhookAPI(t *testing.T, service *Service, method, path, body string, status int) []byte {
	t.Helper()
	request := httptest.NewRequest(method, path, strings.NewReader(body)).WithContext(t.Context())
	response := httptest.NewRecorder()
	service.ServeHTTP(response, request)
	if response.Code != status {
		t.Fatalf("%s %s = %d %s, want %d", method, path, response.Code, response.Body, status)
	}
	return response.Body.Bytes()
}

func addSubscription(t *testing.T, service *Service, name, eventType string, enabled bool) webhook {
	t.Helper()
	body, err := json.Marshal(webhookSettings{
		webhook: webhook{Name: name, URL: "https://example.com/hook", Operations: []string{eventType}, Enabled: enabled},
		Secret:  " initial signing secret ",
	})
	if err != nil {
		t.Fatal(err)
	}
	response := requestWebhookAPI(t, service, http.MethodPost, route, string(body), http.StatusCreated)
	var item webhook
	if err := json.Unmarshal(response, &item); err != nil {
		t.Fatal(err)
	}
	if item.ID == 0 || item.Name != name || len(item.Operations) != 1 || item.Operations[0] != eventType || item.Enabled != enabled || !item.SigningEnabled {
		t.Fatalf("unexpected subscription: %+v", item)
	}
	if bytes.Contains(response, []byte("secret")) {
		t.Fatalf("created webhook exposes secret: %s", response)
	}
	return item
}

func TestWebhookStorePreservesLegacySubscriptionsAndDeliveryBodies(t *testing.T) {
	database, err := sql.Open("sqlite3", filepath.Join(t.TempDir(), "legacy.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	legacySchema := strings.NewReplacer(
		"operations TEXT", "events TEXT",
		"http_status INTEGER", "status_code INTEGER",
		"error_message TEXT", "error TEXT",
	).Replace(schema)
	if _, err := database.Exec(legacySchema); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`
		INSERT INTO webhooks (id, name, url, events, enabled, secret)
		VALUES (1, 'Fixture', 'https://example.com/hook',
			'["zone.import_many","zone.import","dnssec.confirm_ds"]', 1, 'private-fixture')
	`); err != nil {
		t.Fatal(err)
	}
	body := []byte(`{"id":"fixture","type":"zone.import_many","target":{"zone_name":"example.com"}}`)
	if _, err := database.Exec(`
		INSERT INTO webhook_deliveries (
			id, webhook_id, destination_revision, event_id, event_type, payload, status, attempts,
			status_code, error, created_at, updated_at, next_attempt_at
		) VALUES (1, 1, 0, 'fixture', 'zone.import_many', ?, 'pending', 1, 503, 'receiver unavailable', 1, 2, 3)
	`, body); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		service, err := New(database, []string{"zone.import", "dnssec.advance_rollover"})
		if err != nil {
			t.Fatal(err)
		}
		item, err := service.getWebhook(t.Context(), 1)
		if err != nil || !slices.Equal(item.Operations, []string{"dnssec.advance_rollover", "zone.import"}) {
			t.Fatalf("legacy subscription = %+v, error = %v", item, err)
		}
		deliveries, err := service.listDeliveries(t.Context(), 1)
		if err != nil || len(deliveries) != 1 || deliveries[0].HTTPStatus == nil ||
			*deliveries[0].HTTPStatus != 503 || deliveries[0].ErrorMessage != "receiver unavailable" {
			t.Fatalf("legacy delivery = %+v, error = %v", deliveries, err)
		}
		var retained []byte
		if err := database.QueryRow("SELECT payload FROM webhook_deliveries WHERE id = 1").Scan(&retained); err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(retained, body) {
			t.Fatalf("legacy delivery body changed: %s", retained)
		}
	}
}

func TestWebhookSettingsPreserveSigningSecretWhenEditLeavesItBlank(t *testing.T) {
	service := openWebhookStore(t)
	item := addSubscription(t, service, "Changes", "zone.create", true)
	path := route + "/" + strconv.FormatInt(item.ID, 10)
	update := `{"name":" Changes edited ","url":"https://example.com/receiver","operations":["zone.update","zone.update"],"enabled":false,"secret":" "}`
	response := requestWebhookAPI(t, service, http.MethodPut, path, update, http.StatusOK)
	if bytes.Contains(response, []byte("secret")) {
		t.Fatalf("updated webhook exposes secret: %s", response)
	}
	var edited webhook
	if err := json.Unmarshal(response, &edited); err != nil {
		t.Fatal(err)
	}
	if edited.ID != item.ID || edited.Name != "Changes edited" || edited.URL != "https://example.com/receiver" ||
		edited.Enabled || len(edited.Operations) != 1 || edited.Operations[0] != "zone.update" {
		t.Fatalf("unexpected edited webhook: %+v", edited)
	}

	requestWebhookAPI(t, service, http.MethodPost, path+"/test", "", http.StatusAccepted)
	job, err := service.claim(t.Context(), time.Now())
	if err != nil || job == nil {
		t.Fatalf("claim test delivery: %v", err)
	}
	if job.Secret != " initial signing secret " || job.URL != edited.URL || job.EventType != testEventType {
		t.Fatal("test delivery did not use the saved configuration")
	}
	var payload eventPayload
	if err := json.Unmarshal(job.Payload, &payload); err != nil || payload.CreatedAt.IsZero() ||
		!bytes.Contains(job.Payload, []byte(`"created_at":`)) {
		t.Fatalf("unexpected test payload: %s (%v)", job.Payload, err)
	}
	if err := service.finish(t.Context(), job, http.StatusNoContent, "", time.Time{}); err != nil {
		t.Fatal(err)
	}
	history := requestWebhookAPI(t, service, http.MethodGet, path+"/deliveries", "", http.StatusOK)
	var deliveries listResponse[delivery]
	if err := json.Unmarshal(history, &deliveries); err != nil {
		t.Fatal(err)
	}
	if len(deliveries.Items) != 1 {
		t.Fatalf("expected one test delivery: %s", history)
	}
	result := deliveries.Items[0]
	if result.EventID != job.EventID || result.EventType != testEventType || result.Status != "delivered" ||
		result.HTTPStatus == nil || *result.HTTPStatus != http.StatusNoContent || result.Attempts != 1 ||
		result.CreatedAt.IsZero() || result.UpdatedAt.Before(result.CreatedAt) || bytes.Contains(history, []byte("secret")) {
		t.Fatalf("unexpected test history: %s", history)
	}
	if bytes.Contains(history, []byte(`"zone_name"`)) || bytes.Contains(history, []byte(`"record_id"`)) {
		t.Fatalf("test history exposes a target: %s", history)
	}
	requestWebhookAPI(t, service, http.MethodDelete, path, "", http.StatusNoContent)
	requestWebhookAPI(t, service, http.MethodGet, path+"/deliveries", "", http.StatusNotFound)
	requestWebhookAPI(t, service, http.MethodPost, path+"/test", "", http.StatusNotFound)
	response = requestWebhookAPI(t, service, http.MethodGet, route, "", http.StatusOK)
	var collection webhookCollection
	if err := json.Unmarshal(response, &collection); err != nil || len(collection.Items) != 0 || len(collection.Operations) != 5 {
		t.Fatalf("unexpected empty collection: %s", response)
	}
}

func TestWebhookCreateAcceptsAbsentSigningSecret(t *testing.T) {
	service := openWebhookStore(t)
	body := `{"name":"Unsigned","url":"https://example.com/hook","operations":["zone.create"],"enabled":true}`
	response := requestWebhookAPI(t, service, http.MethodPost, route, body, http.StatusCreated)
	if !bytes.Contains(response, []byte(`"signing_enabled":false`)) || bytes.Contains(response, []byte(`"secret"`)) {
		t.Fatalf("unexpected unsigned webhook: %s", response)
	}
}

func TestWebhookSettingsClearSigningSecretOnRequest(t *testing.T) {
	service := openWebhookStore(t)
	item := addSubscription(t, service, "Changes", "zone.update", true)
	path := route + "/" + strconv.FormatInt(item.ID, 10)
	body := `{"name":"Changes","url":"https://example.com/hook","operations":["zone.update"],"enabled":true,"clear_secret":true}`
	response := requestWebhookAPI(t, service, http.MethodPut, path, body, http.StatusOK)
	if !bytes.Contains(response, []byte(`"signing_enabled":false`)) || bytes.Contains(response, []byte(`"secret"`)) {
		t.Fatalf("unexpected webhook after clearing its secret: %s", response)
	}

	requestWebhookAPI(t, service, http.MethodPost, path+"/test", "", http.StatusAccepted)
	job, err := service.claim(t.Context(), time.Now())
	if err != nil || job == nil || job.Secret != "" {
		t.Fatalf("expected unsigned test delivery after clearing the secret: %v", err)
	}
}

func TestWebhookCreateRejectsUnsupportedSettings(t *testing.T) {
	service := openWebhookStore(t)
	for _, fixture := range []struct {
		name string
		body string
	}{
		{"missing name", `{"url":"https://example.com/hook","operations":["zone.create"],"secret":"key"}`},
		{"conflicting signing settings", `{"name":"events","url":"https://example.com/hook","operations":["zone.create"],"secret":"key","clear_secret":true}`},
		{"missing operations", `{"name":"events","url":"https://example.com/hook","secret":"key"}`},
		{"test subscription", `{"name":"events","url":"https://example.com/hook","operations":["webhook.test"],"secret":"key"}`},
		{"inline credentials", `{"name":"events","url":"https://user:example-secret@example.com/hook","operations":["zone.create"],"secret":"key"}`},
		{"multiple JSON values", `{"name":"events","url":"https://example.com/hook","operations":["zone.create"],"secret":"key"}{}`},
	} {
		t.Run(fixture.name, func(t *testing.T) {
			response := requestWebhookAPI(t, service, http.MethodPost, route, fixture.body, http.StatusBadRequest)
			var failure struct {
				Error string `json:"error"`
			}
			if err := json.Unmarshal(response, &failure); err != nil || failure.Error == "" || bytes.Contains(response, []byte("example-secret")) {
				t.Fatalf("unexpected error response: %s", response)
			}
		})
	}
}

func TestWebhookQueueReclaimsInterruptedDeliveriesAndLimitsAttempts(t *testing.T) {
	service := openWebhookStore(t)
	subscriber := addSubscription(t, service, "Updates", "record.update", true)
	addSubscription(t, service, "Disabled updates", "record.update", false)
	addSubscription(t, service, "Deletes", "record.delete", true)
	ctx := t.Context()
	createdAt := time.Unix(1_700_000_000, 0).UTC()
	event := Event{
		Operation: "record.update", Target: EventTarget{ZoneName: "example.com.", RecordID: 75},
		Result: "changed", CreatedAt: createdAt,
	}
	if err := service.Enqueue(ctx, event); err != nil {
		t.Fatal(err)
	}

	now := time.Now()
	first, err := service.claim(ctx, now)
	if err != nil || first == nil || first.Attempts != 1 {
		t.Fatalf("claim initial attempt: %v", err)
	}
	var payload eventPayload
	if err := json.Unmarshal(first.Payload, &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Type != "record.update" || payload.ID == "" || payload.ID != first.EventID || !payload.CreatedAt.Equal(createdAt) ||
		payload.Target == nil || payload.Target.ZoneName != "example.com." || payload.Target.RecordID != 75 ||
		payload.Result != "changed" || !bytes.Contains(first.Payload, []byte(`"created_at":`)) ||
		bytes.Contains(first.Payload, []byte(`"occurred_at":`)) || bytes.Contains(first.Payload, []byte(`"outcome":`)) {
		t.Fatalf("unexpected payload: %s", first.Payload)
	}
	job, err := service.claim(ctx, now)
	if err != nil || job != nil {
		t.Fatalf("unexpected delivery while first attempt is leased: %v", err)
	}

	now = first.Lease.Add(time.Millisecond)
	second, err := service.claim(ctx, now)
	if err != nil || second == nil || second.ID != first.ID || second.Attempts != 2 || !bytes.Equal(second.Payload, first.Payload) {
		t.Fatalf("claim expired attempt with same stable payload: %v", err)
	}
	if err := service.finish(ctx, first, http.StatusOK, "", time.Time{}); err != nil {
		t.Fatal(err)
	}
	if err := service.finish(ctx, second, http.StatusServiceUnavailable, "Receiver unavailable", now.Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	if job, err := service.claim(ctx, now); err != nil || job != nil {
		t.Fatalf("unexpected delivery before retry deadline: %v", err)
	}
	final, err := service.claim(ctx, now.Add(time.Second))
	if err != nil || final == nil || final.ID != first.ID || final.Attempts != maxDeliveryAttempts {
		t.Fatalf("claim final attempt: %v", err)
	}
	if job, err := service.claim(ctx, final.Lease.Add(time.Millisecond)); err != nil || job != nil {
		t.Fatalf("unexpected delivery after final attempt expiry: %v", err)
	}
	path := route + "/" + strconv.FormatInt(subscriber.ID, 10)
	response := requestWebhookAPI(t, service, http.MethodGet, path+"/deliveries", "", http.StatusOK)
	var history listResponse[delivery]
	if err := json.Unmarshal(response, &history); err != nil {
		t.Fatal(err)
	}
	if len(history.Items) != 1 {
		t.Fatalf("expected one terminal delivery: %s", response)
	}
	delivery := history.Items[0]
	if delivery.Status != "failed" || delivery.Attempts != maxDeliveryAttempts || delivery.ErrorMessage == "" ||
		delivery.EventID != payload.ID || delivery.Target.ZoneName != payload.Target.ZoneName || delivery.Target.RecordID != payload.Target.RecordID {
		t.Fatalf("unexpected terminal history: %s", response)
	}
}

func TestWebhookQueueDiscardsPreviousDestinationAfterEdit(t *testing.T) {
	service := openWebhookStore(t)
	item := addSubscription(t, service, "Zone changes", "zone.update", true)
	ctx := t.Context()
	event := Event{Operation: "zone.update", Target: EventTarget{ZoneName: "example.com."}}
	if err := service.Enqueue(ctx, event, event); err != nil {
		t.Fatal(err)
	}
	first, err := service.claim(ctx, time.Now())
	if err != nil || first == nil {
		t.Fatalf("claim before edit: %v", err)
	}
	path := route + "/" + strconv.FormatInt(item.ID, 10)
	update := `{"name":"Zone changes","url":"https://example.com/other-receiver","operations":["zone.update"],"enabled":true}`
	requestWebhookAPI(t, service, http.MethodPut, path, update, http.StatusOK)

	nextAttempt := time.Now().Add(time.Second)
	if err := service.finish(ctx, first, http.StatusServiceUnavailable, "Receiver unavailable", nextAttempt); err != nil {
		t.Fatal(err)
	}
	if next, err := service.claim(ctx, nextAttempt); err != nil || next != nil {
		t.Fatalf("previous destination can still be claimed after edit: %v", err)
	}
	history, err := service.listDeliveries(ctx, item.ID)
	if err != nil || len(history) != 2 || history[0].Status != "failed" || history[0].Attempts != 0 ||
		history[1].Status != "failed" || history[1].Attempts != 1 {
		t.Fatalf("unexpected history after destination edit: %+v %v", history, err)
	}
	if err := service.Enqueue(ctx, event); err != nil {
		t.Fatal(err)
	}
	next, err := service.claim(ctx, time.Now())
	if err != nil || next == nil || next.URL != "https://example.com/other-receiver" {
		t.Fatalf("new delivery does not use edited destination: %v", err)
	}
}

func TestWebhookRetentionKeepsNewestFiftyTerminalRowsAndPendingRows(t *testing.T) {
	service := openWebhookStore(t)
	item := addSubscription(t, service, "Zone changes", "zone.update", true)
	ctx := t.Context()
	events := make([]Event, 52)
	for i := range events {
		events[i] = Event{Operation: "zone.update", Target: EventTarget{ZoneName: "example.com."}}
	}
	if err := service.Enqueue(ctx, events...); err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	pending, err := service.claim(ctx, now)
	if err != nil || pending == nil {
		t.Fatalf("claim leased delivery: %v", err)
	}
	for range len(events) - 1 {
		job, err := service.claim(ctx, now)
		if err != nil || job == nil {
			t.Fatalf("claim available delivery: %v", err)
		}
		if err := service.finish(ctx, job, http.StatusOK, "", time.Time{}); err != nil {
			t.Fatal(err)
		}
	}
	var terminalCount, pendingCount int
	if err := service.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FILTER (WHERE status <> 'pending'), COUNT(*) FILTER (WHERE status = 'pending')
		FROM webhook_deliveries WHERE webhook_id = ?`, item.ID).Scan(&terminalCount, &pendingCount); err != nil {
		t.Fatal(err)
	}
	if terminalCount != 50 || pendingCount != 1 {
		t.Fatalf("unexpected retained counts: %d terminal and %d pending", terminalCount, pendingCount)
	}
	history, err := service.listDeliveries(ctx, item.ID)
	if err != nil || len(history) != 50 || history[0].ID != 52 || history[49].ID != 3 {
		t.Fatalf("unexpected latest delivery history length %d, query error %v", len(history), err)
	}
}
