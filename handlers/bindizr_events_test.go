package handlers

import (
	"bytes"
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"
	"time"

	"bindizr-ui/db"
	"bindizr-ui/webhooks"
)

func TestBindizrProxyEnqueuesAppliedRecordWrites(t *testing.T) {
	useSettingsDatabase(t)
	const body = `{"applied":true,"dry_run":false,"record":{"id":27,"zone_name":"example.test","name":"www.example.test.","type":"A","value":"private-fixture"}}`
	var compressed bytes.Buffer
	writer := gzip.NewWriter(&compressed)
	if _, err := io.WriteString(writer, body); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/records" {
			t.Errorf("upstream path = %q", r.URL.Path)
		}
		if encoding := r.Header.Get("Accept-Encoding"); encoding != "gzip, br" {
			t.Errorf("upstream Accept-Encoding = %q, want gzip, br", encoding)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Encoding", "gzip")
		w.WriteHeader(http.StatusCreated)
		w.Write(compressed.Bytes())
	}))
	defer upstream.Close()
	if err := db.SaveBindizrConnection(t.Context(), db.BindizrConnection{URL: upstream.URL}); err != nil {
		t.Fatal(err)
	}

	var queued []webhooks.Event
	proxy := BindizrProxyHandler(func(_ context.Context, events ...webhooks.Event) error {
		queued = append(queued, events...)
		return nil
	})
	request := httptest.NewRequest(http.MethodPost, bindizrProxyPrefix+"/records", nil)
	request.Header.Set("Accept-Encoding", "gzip, br")
	response := httptest.NewRecorder()
	proxy(response, request)
	if response.Code != http.StatusCreated || response.Header().Get("Content-Encoding") != "gzip" ||
		!bytes.Equal(response.Body.Bytes(), compressed.Bytes()) {
		t.Fatalf("proxy did not preserve the encoded response: %d %+v", response.Code, response.Header())
	}
	if len(queued) != 1 || queued[0].CreatedAt.IsZero() {
		t.Fatalf("queued events = %+v", queued)
	}
	want := webhooks.Event{
		Operation: "record.create", Result: "changed", CreatedAt: queued[0].CreatedAt,
		Target: webhooks.EventTarget{ZoneName: "example.test", RecordID: 27, RecordName: "www", RecordType: "A"},
	}
	if queued[0] != want {
		t.Fatalf("queued event = %+v, want %+v", queued[0], want)
	}
}

func TestBindizrProxySkipsRejectedAndPreviewedChanges(t *testing.T) {
	useSettingsDatabase(t)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			w.WriteHeader(http.StatusUnprocessableEntity)
			io.WriteString(w, `{"applied":true,"record":{"id":27,"zone_name":"example.test"}}`)
		case http.MethodPut:
			io.WriteString(w, `{"applied":false,"dry_run":true,"zone":{"name":"example.test"}}`)
		default:
			io.WriteString(w, `{"applied":true,"zone":{"name":"example.test"}}`)
		}
	}))
	defer upstream.Close()
	if err := db.SaveBindizrConnection(t.Context(), db.BindizrConnection{URL: upstream.URL}); err != nil {
		t.Fatal(err)
	}
	proxy := BindizrProxyHandler(func(_ context.Context, events ...webhooks.Event) error {
		t.Errorf("unexpected events: %+v", events)
		return nil
	})
	for _, request := range []struct{ method, suffix string }{
		{http.MethodPost, "/records"},
		{http.MethodPut, "/zones/example.test"},
		{http.MethodDelete, "/zones/example.test?dry_run=true"},
		{http.MethodGet, "/zones/example.test"},
	} {
		proxy(httptest.NewRecorder(), httptest.NewRequest(request.method, bindizrProxyPrefix+request.suffix, nil))
	}
}

func TestWebhookMutationProjectsOnlyConfirmedTargets(t *testing.T) {
	createdAt := time.Unix(1_700_000_000, 0).UTC()
	for _, test := range []struct {
		method, path, body, operation, result string
		targets                               []webhooks.EventTarget
	}{
		{
			http.MethodPost, "/import",
			`{"dry_run":false,"zones":[
				{"zone_name":"one.example","result":"ok","import":{"applied":true,"changed":true,"summary":{"unchanged":1}}},
				{"zone_name":"two.example","result":"rejected","import":{"applied":false}},
				{"zone_name":"three.example","result":"failed","import":null},
				{"zone_name":"four.example","result":"ok","import":{"applied":true,"dry_run":true}},
				{"zone_name":"five.example","result":"ok","import":{"applied":true,"changed":false}}
			]}`,
			"zone.import", "changed", []webhooks.EventTarget{{ZoneName: "one.example"}},
		},
		{
			http.MethodPost, "/zones/example.test/import",
			`{"applied":true,"changed":true}`,
			"zone.import", "changed", []webhooks.EventTarget{{ZoneName: "example.test"}},
		},
		{
			http.MethodPost, "/zones/example.test/import",
			`{"applied":true,"changed":false}`,
			"zone.import", "", nil,
		},
		{
			http.MethodPost, "/zones/example.test/import",
			`{"applied":true,"summary":{"added":1}}`,
			"zone.import", "changed", []webhooks.EventTarget{{ZoneName: "example.test"}},
		},
		{
			http.MethodPost, "/zones/encoded%2Fname.example/versions/42/rollback",
			`{"applied":true,"dry_run":false}`,
			"zone.rollback", "changed", []webhooks.EventTarget{{ZoneName: "encoded/name.example"}},
		},
		{
			http.MethodPost, "/records/bulk",
			`{"applied":true,"records":[
				{"id":4,"zone_name":"example.test","name":"example.test.","type":"TXT","value":"never-copy"},
				{"id":5,"zone_name":"example.test","name":"api.example.test.","type":"A","value":"192.0.2.11"}
			]}`,
			"record.bulk_create", "changed", []webhooks.EventTarget{
				{ZoneName: "example.test", RecordID: 4, RecordName: "@", RecordType: "TXT"},
				{ZoneName: "example.test", RecordID: 5, RecordName: "api", RecordType: "A"},
			},
		},
		{
			http.MethodDelete, "/records/27", `{"applied":true,"deleted":1,"records":[]}`,
			"record.delete", "changed", []webhooks.EventTarget{{RecordID: 27}},
		},
		{
			http.MethodDelete, "/records/27", `{"applied":true,"deleted":0,"records":[]}`,
			"record.delete", "changed", nil,
		},
		{
			http.MethodPost, "/tokens", `{"token":{"name":"deploy"},"secret":"never-copy"}`,
			"token.create", "changed", []webhooks.EventTarget{{Name: "deploy"}},
		},
		{
			http.MethodPost, "/tsig-keys", `{"tsig_key":{"name":"key.example","secret":"never-copy"}}`,
			"tsig_key.create", "changed", []webhooks.EventTarget{{Name: "key.example"}},
		},
		{
			http.MethodDelete, "/tsig-keys/Key.Example.", `{"message":"deleted"}`,
			"tsig_key.delete", "changed", []webhooks.EventTarget{{Name: "key.example"}},
		},
		{
			http.MethodPost, "/roles", `{"role":{"name":"admin-ops","description":"never-copy"}}`,
			"role.create", "changed", []webhooks.EventTarget{{Name: "admin-ops"}},
		},
		{
			http.MethodPost, "/roles/admin-ops/grants", `{"role_grant":{"role_name":"admin-ops","zone_name":"zone.test"}}`,
			"role_grant.create", "changed", []webhooks.EventTarget{{Name: "admin-ops", ZoneName: "zone.test"}},
		},
		{
			http.MethodDelete, "/roles/admin-ops/grants/23", `{"message":"revoked"}`,
			"role_grant.delete", "changed", []webhooks.EventTarget{{Name: "admin-ops"}},
		},
		{
			http.MethodPut, "/secondaries/ns2", `{"secondary":{"name":"ns2","address":"never-copy"}}`,
			"secondary.update", "succeeded", []webhooks.EventTarget{{Name: "ns2"}},
		},
		{
			http.MethodPost, "/secondaries/ns2/check",
			`{"secondary":{"name":"ns2"},"resolve_error":null,"catalog":{"status":"in_sync"},"notifies":[{"error":null}]}`,
			"secondary.check", "succeeded", []webhooks.EventTarget{{Name: "ns2"}},
		},
		{
			http.MethodPost, "/secondaries/ns2/check",
			`{"secondary":{"name":"ns2"},"resolve_error":null,"catalog":{"status":"in_sync"},"notifies":[{"error":"never-copy"}]}`,
			"secondary.check", "failed", []webhooks.EventTarget{{Name: "ns2"}},
		},
		{
			http.MethodPost, "/zones/example.test/dnssec/check-ds", `{"zone_name":"example.test","delegation":{"ds_state":"hidden"}}`,
			"dnssec.check_ds", "succeeded", []webhooks.EventTarget{{ZoneName: "example.test"}},
		},
		{
			http.MethodPost, "/zones/example.test/dnssec", `{"zone_name":"example.test","enabled":true}`,
			"dnssec.enable", "changed", []webhooks.EventTarget{{ZoneName: "example.test"}},
		},
		{
			http.MethodPut, "/dnssec-policies/strict", `{"dnssec_policy":{"name":"strict"}}`,
			"dnssec_policy.update", "succeeded", []webhooks.EventTarget{{Name: "strict"}},
		},
		{
			http.MethodPost, "/notify", `{"message":"NOTIFY sent successfully for all zones"}`,
			"zone.notify", "succeeded", []webhooks.EventTarget{{}},
		},
	} {
		t.Run(test.method+" "+test.path+" "+test.result, func(t *testing.T) {
			mutation, matched := webhookMutation(test.method, test.path)
			if !matched {
				t.Fatal("supported remote operation did not match")
			}
			events, err := mutation.events([]byte(test.body), createdAt)
			if err != nil || len(events) != len(test.targets) {
				t.Fatalf("events = %+v, error = %v, want targets %+v", events, err, test.targets)
			}
			for i, target := range test.targets {
				want := webhooks.Event{Operation: test.operation, Target: target, Result: test.result, CreatedAt: createdAt}
				if events[i] != want {
					t.Fatalf("event = %+v, want %+v", events[i], want)
				}
			}
		})
	}
}

func TestBindizrWebhookOperationsMatchTheProxyRules(t *testing.T) {
	operations := BindizrWebhookOperations()
	if !slices.IsSorted(operations) || len(operations) != len(slices.Compact(slices.Clone(operations))) {
		t.Fatalf("webhook catalogue is not sorted and unique: %v", operations)
	}
	for _, op := range []string{"record.create", "role_grant.create", "dnssec.enable", "secondary.check", "zone.notify"} {
		if !slices.Contains(operations, op) {
			t.Fatalf("catalogue omitted %q", op)
		}
	}
	for _, request := range []struct{ method, path string }{
		{http.MethodGet, "/operations"},
		{http.MethodGet, "/events"},
		{http.MethodGet, "/records/1"},
		{http.MethodPost, "/unrelated"},
		{http.MethodDelete, "/records/bulk"},
		{http.MethodPost, "/zones/example.test/versions/not-a-serial/rollback"},
	} {
		if _, matched := webhookMutation(request.method, request.path); matched {
			t.Fatalf("unsupported path matched: %s %s", request.method, request.path)
		}
	}
}
