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

	createTables := `
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT
	);
	`
	_, err = DB.Exec(createTables)
	if err != nil {
		log.Fatal(err)
	}
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

func GetNextAuthSecret() (string, error) {
	secret, err := GetSetting("nextauth_secret")
	if err != nil {
		return "", err
	}
	if secret != "" {
		return secret, nil
	}

	key := make([]byte, 32)
	_, err = rand.Read(key)
	if err != nil {
		return "", err
	}
	newSecret := hex.EncodeToString(key)
	err = SetSetting("nextauth_secret", newSecret)
	if err != nil {
		return "", err
	}
	return newSecret, nil
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
