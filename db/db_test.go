package db

import (
	"database/sql"
	"path/filepath"
	"testing"
)

func TestSettingsPreserveCredentialsWhenKeysAreRenamed(t *testing.T) {
	database, err := sql.Open("sqlite3", filepath.Join(t.TempDir(), "settings.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()

	if err := initializeSettings(database); err != nil {
		t.Fatal(err)
	}
	if _, err := database.Exec(`
		INSERT INTO settings (key, value)
		VALUES ('secret_key', 'token-fixture'), ('nextauth_secret', 'session-fixture')
	`); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := initializeSettings(database); err != nil {
			t.Fatal(err)
		}
		for key, want := range map[string]string{
			"api_token": "token-fixture", "session_signing_key": "session-fixture",
		} {
			var value string
			if err := database.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value); err != nil {
				t.Fatal(err)
			}
			if value != want {
				t.Fatalf("the %s value was not preserved", key)
			}
		}
		var legacyCount int
		if err := database.QueryRow("SELECT COUNT(*) FROM settings WHERE key IN ('secret_key', 'nextauth_secret')").Scan(&legacyCount); err != nil || legacyCount != 0 {
			t.Fatalf("obsolete setting remains: count = %d, error = %v", legacyCount, err)
		}
	}
}
