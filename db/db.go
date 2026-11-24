package db

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "./database.db")
	if err != nil {
		log.Fatal(err)
	}

	if err := initializeSettings(DB); err != nil {
		log.Fatal(err)
	}
}

// initializeSettings preserves configured credentials across key renames.
func initializeSettings(database *sql.DB) error {
	tx, err := database.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.Exec(`
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);

	INSERT OR IGNORE INTO settings (key, value)
	SELECT 'api_token', value FROM settings WHERE key = 'secret_key'
	UNION ALL
	SELECT 'session_signing_key', value FROM settings WHERE key = 'nextauth_secret';
	DELETE FROM settings WHERE key IN ('secret_key', 'nextauth_secret');
	`)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func GetSetting(key string) (string, error) {
	var value string
	err := DB.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return value, nil
}

func SetSetting(key, value string) error {
	_, err := DB.Exec("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", key, value)
	return err
}

func DeleteSetting(key string) error {
	_, err := DB.Exec("DELETE FROM settings WHERE key = ?", key)
	return err
}

// GetSessionSigningKey returns the key used to sign and verify UI sessions.
func GetSessionSigningKey() (string, error) {
	signingKey, err := GetSetting("session_signing_key")
	if err != nil || signingKey != "" {
		return signingKey, err
	}

	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return "", err
	}
	// Concurrent first-use requests must all sign with the stored key.
	err = DB.QueryRow(`
		INSERT INTO settings (key, value) VALUES ('session_signing_key', ?)
		ON CONFLICT (key) DO UPDATE SET value = COALESCE(NULLIF(settings.value, ''), excluded.value)
		RETURNING value
	`, hex.EncodeToString(keyBytes)).Scan(&signingKey)
	return signingKey, err
}

func IsSetupComplete() (bool, error) {
	val, err := GetSetting("setup_complete")
	if err != nil {
		return false, err
	}
	return val == "true", nil
}

func IsAccountEnabled() (bool, error) {
	username, err := GetSetting("username")
	if err != nil {
		return false, err
	}
	password, err := GetSetting("password")
	if err != nil {
		return false, err
	}
	return username != "" && password != "", nil
}
