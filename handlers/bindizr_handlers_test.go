package handlers

import (
	"bytes"
	"compress/gzip"
	"database/sql"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"bindizr-ui/db"
)

func useSettingsDatabase(t *testing.T) *sql.DB {
	t.Helper()

	database, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	database.SetMaxOpenConns(1)

	previous := db.DB
	db.DB = database
	t.Cleanup(func() {
		db.DB = previous
		database.Close()
	})
	if _, err := database.Exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)"); err != nil {
		t.Fatal(err)
	}
	return database
}

func TestBindizrURLRejectsInvalidUpstreams(t *testing.T) {
	for _, rawURL := range []string{
		"ftp://bindizr.example",
		"http://:8000",
		"http://user:private-fixture@bindizr.example",
		"http://@bindizr.example",
		"http://bindizr.example?token=private-fixture",
		"http://bindizr.example?",
		"http://bindizr.example#private-fixture",
		"http://bindizr.example#",
	} {
		_, err := parseBindizrURL(rawURL)
		if !errors.Is(err, errBindizrURLInvalid) {
			t.Fatalf("unexpected error for %q: %v", rawURL, err)
		}
	}
	if _, err := parseBindizrURL(" "); !errors.Is(err, errBindizrURLRequired) {
		t.Fatalf("unexpected error for empty URL: %v", err)
	}
}

func TestBindizrProxyURLPreservesBasePathEscapedSegmentsAndQuery(t *testing.T) {
	baseURL := " https://bindizr.example/custom%2Fprefix/ "
	request := httptest.NewRequest(http.MethodGet, "/%61pi/bindizr/proxy/zones/branch%2Fteam.example?name=a%2Fb&name=c&blank=", nil)
	suffix, err := bindizrProxySuffix(request.URL.EscapedPath())
	if err != nil {
		t.Fatal(err)
	}
	target, err := buildBindizrProxyURL(baseURL, suffix, request.URL)
	if err != nil {
		t.Fatal(err)
	}
	want := "https://bindizr.example/custom%2Fprefix/zones/branch%2Fteam.example?name=a%2Fb&name=c&blank="
	if target != want {
		t.Fatalf("target = %q, want %q", target, want)
	}
}

func TestBindizrSettingsRejectsInvalidURLBeforeSaving(t *testing.T) {
	useSettingsDatabase(t)
	request := httptest.NewRequest(http.MethodPost, "/api/bindizr/settings", strings.NewReader(
		`{"bindizrUrl":"http://user:private-fixture@bindizr.example","apiToken":"token-fixture"}`,
	))
	recorder := httptest.NewRecorder()
	BindizrSettingsHandler(recorder, request)

	if recorder.Code != http.StatusBadRequest || strings.Contains(recorder.Body.String(), "private-fixture") {
		t.Fatalf("unexpected validation response: %d %s", recorder.Code, recorder.Body.String())
	}
	connection, err := db.LoadBindizrConnection(t.Context())
	if err != nil || connection != (db.BindizrConnection{}) {
		t.Fatal("invalid settings were persisted", err)
	}
}

func TestBindizrSettingsPreservesConnectionWhenTokenWriteFails(t *testing.T) {
	database := useSettingsDatabase(t)
	previous := db.BindizrConnection{URL: "https://original.example/path", APIToken: "previous-token"}
	if err := db.SaveBindizrConnection(t.Context(), previous); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`
		CREATE TRIGGER fail_token_write BEFORE INSERT ON settings WHEN NEW.key = 'api_token'
		BEGIN SELECT RAISE(ABORT, 'private-db-diagnostic'); END
	`); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodPost, "/api/bindizr/settings", strings.NewReader(
		`{"bindizrUrl":"https://replacement.example","apiToken":"new-token"}`,
	))
	recorder := httptest.NewRecorder()
	BindizrSettingsHandler(recorder, request)
	if recorder.Code != http.StatusInternalServerError || strings.Contains(recorder.Body.String(), "private-db-diagnostic") {
		t.Fatalf("unexpected write failure response: %d %s", recorder.Code, recorder.Body.String())
	}
	connection, err := db.LoadBindizrConnection(t.Context())
	if err != nil || connection != previous {
		t.Fatal("failed save changed the previously paired settings", err)
	}
}

func TestSetupPreservesSettingsWhenCompletionWriteFails(t *testing.T) {
	database := useSettingsDatabase(t)
	if _, err := database.Exec(`
		CREATE TRIGGER fail_completion_write BEFORE INSERT ON settings WHEN NEW.key = 'setup_complete'
		BEGIN SELECT RAISE(ABORT, 'private-db-diagnostic'); END
	`); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/public/settings", strings.NewReader(
		`{"bindizrUrl":"https://bindizr.example/path","apiToken":"token-fixture"}`,
	))
	recorder := httptest.NewRecorder()
	PublicSettingsHandler(recorder, request)

	if recorder.Code != http.StatusInternalServerError || strings.Contains(recorder.Body.String(), "private-db-diagnostic") {
		t.Fatalf("unexpected setup failure response: %d %s", recorder.Code, recorder.Body.String())
	}
	var stored int
	if err := database.QueryRow("SELECT COUNT(*) FROM settings").Scan(&stored); err != nil || stored != 0 {
		t.Fatalf("setup persisted %d settings after failure: %v", stored, err)
	}
}

func TestSetupPreservesFirstCompletedConnection(t *testing.T) {
	useSettingsDatabase(t)
	previous := db.BindizrConnection{URL: "https://original.example/path", APIToken: "previous-token"}
	if written, err := db.CompleteSetup(t.Context(), previous, "operator", "password-hash"); !written || err != nil {
		t.Fatalf("first setup failed: %v", err)
	}
	replacement := db.BindizrConnection{URL: "https://replacement.example", APIToken: "new-token"}
	if written, err := db.CompleteSetup(t.Context(), replacement, "", ""); written || err != nil {
		t.Fatalf("duplicate setup unexpectedly wrote settings: %v", err)
	}
	connection, err := db.LoadBindizrConnection(t.Context())
	if err != nil || connection != previous {
		t.Fatal("duplicate setup changed the existing connection", err)
	}
}

func TestBindizrProxyRejectsUpstreamRedirects(t *testing.T) {
	useSettingsDatabase(t)
	var followed atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/redirected" {
			followed.Store(true)
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Header.Get("Authorization") != "Bearer bindizr-fixture" {
			t.Error("upstream did not receive the configured token")
		}
		http.Redirect(w, r, "/redirected", http.StatusTemporaryRedirect)
	}))
	defer server.Close()

	connection := db.BindizrConnection{URL: server.URL, APIToken: "bindizr-fixture"}
	if err := db.SaveBindizrConnection(t.Context(), connection); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "/api/bindizr/proxy/zones", nil)
	recorder := httptest.NewRecorder()
	BindizrProxyHandler(recorder, request)

	if recorder.Code != http.StatusBadGateway || recorder.Header().Get("Location") != "" || followed.Load() {
		t.Fatalf("upstream redirect was not rejected: %d %s", recorder.Code, recorder.Body.String())
	}
}

func TestBindizrProxyWithholdsCookiesAndPreservesAPIResponse(t *testing.T) {
	useSettingsDatabase(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.EscapedPath() != "/prefix/zones/branch%2Fteam.example" || r.URL.RawQuery != "dry_run=true" {
			t.Errorf("unexpected upstream request target: %q", r.URL.RequestURI())
		}
		if r.Header.Get("Cookie") != "" || r.Header.Get("Authorization") != "Bearer bindizr-fixture" {
			t.Error("upstream received browser credentials")
		}
		w.Header().Set("Set-Cookie", "upstream=fixture")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"code":"FORBIDDEN","error":"record update not permitted"}`))
	}))
	defer server.Close()

	connection := db.BindizrConnection{URL: server.URL + "/prefix", APIToken: "bindizr-fixture"}
	if err := db.SaveBindizrConnection(t.Context(), connection); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPut, "/api/bindizr/proxy/zones/branch%2Fteam.example?dry_run=true", nil)
	request.Header.Set("Authorization", "Bearer browser-fixture")
	request.Header.Set("Cookie", "session=browser-fixture")
	recorder := httptest.NewRecorder()
	BindizrProxyHandler(recorder, request)

	if recorder.Code != http.StatusForbidden || recorder.Header().Get("Content-Type") != "application/json" ||
		recorder.Header().Get("Set-Cookie") != "" || recorder.Body.String() != `{"code":"FORBIDDEN","error":"record update not permitted"}` {
		t.Fatalf("unexpected API response: %d %s", recorder.Code, recorder.Body.String())
	}
}

func TestBindizrProxyPreservesCompressedWriteResponse(t *testing.T) {
	useSettingsDatabase(t)
	const body = `{"applied":true,"dry_run":false,"record":{"id":27,"zone_name":"example.test","name":"www.example.test.","type":"A","value":"192.0.2.1"}}`
	var compressed bytes.Buffer
	writer := gzip.NewWriter(&compressed)
	if _, err := io.WriteString(writer, body); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/records" {
			t.Errorf("upstream request = %s %s, want POST /records", r.Method, r.URL.Path)
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

	request := httptest.NewRequest(http.MethodPost, bindizrProxyPrefix+"/records", nil)
	request.Header.Set("Accept-Encoding", "gzip, br")
	response := httptest.NewRecorder()
	BindizrProxyHandler(response, request)
	if response.Code != http.StatusCreated || response.Header().Get("Content-Encoding") != "gzip" ||
		!bytes.Equal(response.Body.Bytes(), compressed.Bytes()) {
		t.Fatalf("proxy did not preserve the encoded response: %d %+v", response.Code, response.Header())
	}
}
