package webhooks

import (
	"context"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

func TestWebhookDestinationRejectsInvalidURLs(t *testing.T) {
	for _, rawURL := range []string{
		" ",
		"//receiver.example/notify",
		"ftp://receiver.example/notify",
		"https://:443/notify",
		"https://receiver.example:65536/notify",
		"https://receiver.example:0/notify",
		"https://user:private-fixture@receiver.example/notify",
		"https://@receiver.example/notify",
		"https://receiver.example/notify#private-fixture",
		"https://receiver.example/notify#",
	} {
		_, err := parseDestination(rawURL)
		if !errors.Is(err, errInvalidDestination) {
			t.Errorf("expected invalid destination for %q, got %v", rawURL, err)
		}
	}
}

func TestWebhookDestinationPreservesEscapedPathAndQuery(t *testing.T) {
	const expected = "https://receiver.example/path%2Fname?token=private%23fixture&token=second&empty="
	destination, err := parseDestination(" " + expected + " ")
	if err != nil {
		t.Fatal(err)
	}
	if destination.String() != expected {
		t.Errorf("destination = %q, want %q", destination.String(), expected)
	}
}

func TestWebhookDeliverySignsExactRequestBody(t *testing.T) {
	const payload = `{"id":"event-fixture","type":"record.updated"}`
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.RequestURI() != "/path%2Fname?token=query-fixture" {
			t.Errorf("request is %s %s", r.Method, r.URL.RequestURI())
		}
		for name, expected := range map[string]string{
			"Content-Type":                "application/json",
			"X-Bindizr-Webhook-Id":        "event-fixture",
			"X-Bindizr-Webhook-Event":     "record.updated",
			"X-Bindizr-Webhook-Timestamp": "1795000123",
			"X-Bindizr-Webhook-Signature": "sha256=d4260e7373da9d73808a9eb6d320bdbe5703b818e206bd4a80af2041bfb4d63b",
		} {
			if got := r.Header.Get(name); got != expected {
				t.Errorf("header %s = %q, want %q", name, got, expected)
			}
		}
		body, err := io.ReadAll(r.Body)
		if err != nil || string(body) != payload {
			t.Errorf("request body = %q, error = %v", body, err)
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	defer server.Close()

	job := &deliveryJob{
		URL:       server.URL + "/path%2Fname?token=query-fixture",
		Secret:    "shared-fixture",
		EventID:   "event-fixture",
		EventType: "record.updated",
		Payload:   []byte(payload),
	}
	if statusCode, failure := sendDelivery(t.Context(), job, time.Unix(1795000123, 0)); statusCode != http.StatusAccepted || failure != "" {
		t.Fatalf("delivery returned status %d and failure %q", statusCode, failure)
	}
}

func TestWebhookDeliveryKeepsHTTPStatusWhenReceiverRedirects(t *testing.T) {
	var redirected atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/redirected" {
			redirected.Store(true)
			return
		}
		w.Header().Set("Location", "/redirected?token=private-fixture")
		w.WriteHeader(http.StatusTemporaryRedirect)
		w.Write([]byte("private-fixture"))
	}))
	defer server.Close()

	job := &deliveryJob{URL: server.URL + "/initial?token=private-fixture"}
	statusCode, failure := sendDelivery(t.Context(), job, time.Now())
	if statusCode != http.StatusTemporaryRedirect || failure == "" || strings.Contains(failure, "private-fixture") || redirected.Load() {
		t.Fatalf("redirected = %t, status = %d, failure = %q", redirected.Load(), statusCode, failure)
	}
}

func TestWebhookDeliveryReturnsGenericErrorWhenReceiverIsUnavailable(t *testing.T) {
	server := httptest.NewServer(http.NotFoundHandler())
	server.Close()

	job := &deliveryJob{URL: server.URL + "/notify?token=private-fixture"}
	statusCode, failure := sendDelivery(t.Context(), job, time.Now())
	if statusCode != 0 || failure == "" || strings.Contains(failure, "private-fixture") {
		t.Fatalf("status = %d, failure = %q", statusCode, failure)
	}
}

func TestWebhookWorkerPreservesStoredPayloadWhenRetryingAfterRestart(t *testing.T) {
	type receivedDelivery struct {
		id   string
		body string
	}
	requests := make(chan receivedDelivery, maxDeliveryAttempts)
	var attempts atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error(err)
		}
		select {
		case requests <- receivedDelivery{r.Header.Get("X-Bindizr-Webhook-Id"), string(body)}:
		default:
			t.Error("receiver got more requests than allowed")
		}
		if attempts.Add(1) == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	path := filepath.Join(t.TempDir(), "webhooks.db")
	openService := func() *Service {
		database, err := sql.Open("sqlite3", path)
		if err != nil {
			t.Fatal(err)
		}
		database.SetMaxOpenConns(1)
		t.Cleanup(func() { database.Close() })
		service, err := New(database, []string{"zone.create"})
		if err != nil {
			t.Fatal(err)
		}
		return service
	}

	firstService := openService()
	item, err := firstService.createWebhook(t.Context(), webhookSettings{
		webhook: webhook{Name: "Receiver", URL: server.URL, Operations: []string{"zone.create"}, Enabled: true},
		Secret:  "shared-fixture",
	})
	if err != nil {
		t.Fatal(err)
	}
	const eventID = "previously-queued-event"
	const payload = `{"id":"previously-queued-event","type":"zone.create","occurred_at":"2023-11-14T22:13:20Z","target":{"zone_name":"example.org"},"result":"changed","source":"api"}`
	now := time.Now().UnixMilli()
	if _, err := firstService.db.ExecContext(t.Context(), `
		INSERT INTO webhook_deliveries (
			webhook_id, destination_revision, event_id, event_type, payload, created_at, updated_at, next_attempt_at
		) VALUES (?, 0, ?, ?, ?, ?, ?, ?)`,
		item.ID, eventID, "zone.create", []byte(payload), now, now, now,
	); err != nil {
		t.Fatal(err)
	}
	started := time.Now()
	stopFirst := runWebhookWorker(t, firstService)
	firstDelivery := awaitWebhookStatus(t, firstService, item.ID, http.StatusServiceUnavailable)
	stopFirst()
	if firstDelivery.Status != "pending" || firstDelivery.Attempts != 1 || firstDelivery.ErrorMessage == "" {
		t.Fatalf("first delivery = %+v", firstDelivery)
	}
	latestRetry := time.Now().Add(initialRetryDelay).UnixMilli()
	if err := firstService.db.Close(); err != nil {
		t.Fatal(err)
	}

	secondService := openService()
	var nextAttempt int64
	if err := secondService.db.QueryRow("SELECT next_attempt_at FROM webhook_deliveries WHERE id = ?", firstDelivery.ID).Scan(&nextAttempt); err != nil {
		t.Fatal(err)
	}
	if nextAttempt < started.Add(initialRetryDelay).UnixMilli() || nextAttempt > latestRetry {
		t.Fatalf("retry was scheduled for %v", time.UnixMilli(nextAttempt))
	}
	if _, err := secondService.db.Exec("UPDATE webhook_deliveries SET next_attempt_at = 0 WHERE id = ?", firstDelivery.ID); err != nil {
		t.Fatal(err)
	}
	stopSecond := runWebhookWorker(t, secondService)
	secondDelivery := awaitWebhookStatus(t, secondService, item.ID, http.StatusNoContent)
	stopSecond()
	if secondDelivery.Status != "delivered" || secondDelivery.Attempts != 2 || secondDelivery.ErrorMessage != "" || secondDelivery.EventID != firstDelivery.EventID {
		t.Fatalf("retried delivery = %+v", secondDelivery)
	}
	expected := receivedDelivery{id: eventID, body: payload}
	if first, second := <-requests, <-requests; first != expected || second != expected || second.id != secondDelivery.EventID {
		t.Fatalf("first request = %+v, second request = %+v", first, second)
	}
}

func runWebhookWorker(t *testing.T, service *Service) func() {
	t.Helper()
	ctx, cancel := context.WithCancel(t.Context())
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		service.Run(ctx)
	}()
	stop := sync.OnceFunc(func() {
		cancel()
		<-stopped
	})
	t.Cleanup(stop)
	return stop
}

func awaitWebhookStatus(t *testing.T, service *Service, webhookID int64, statusCode int) delivery {
	t.Helper()
	ctx, cancel := context.WithTimeout(t.Context(), 3*time.Second)
	defer cancel()
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	for {
		history, err := service.listDeliveries(ctx, webhookID)
		if err != nil {
			t.Fatal(err)
		}
		if len(history) == 1 && history[0].HTTPStatus != nil && *history[0].HTTPStatus == statusCode {
			return history[0]
		}
		select {
		case <-ticker.C:
		case <-ctx.Done():
			t.Fatalf("timed out waiting for HTTP %d, history = %+v", statusCode, history)
		}
	}
}
