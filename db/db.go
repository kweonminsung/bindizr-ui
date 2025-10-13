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
	CREATE TABLE IF NOT EXISTS cron_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		message TEXT NOT NULL
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

type CronLog struct {
	ID        int    `json:"id"`
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
}

func AddCronLog(message string) error {
	_, err := DB.Exec("INSERT INTO cron_logs (message) VALUES (?)", message)
	return err
}

func GetCronLogs(limit, offset int) ([]CronLog, error) {
	rows, err := DB.Query("SELECT id, timestamp, message FROM cron_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?", limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := make([]CronLog, 0)
	for rows.Next() {
		var log CronLog
		if err := rows.Scan(&log.ID, &log.Timestamp, &log.Message); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, nil
}

func GetTotalCronLogs() (int, error) {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM cron_logs").Scan(&count)
	return count, err
}
