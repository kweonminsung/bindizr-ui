package db

import "context"

type BindizrConnection struct {
	URL      string
	APIToken string
}

// LoadBindizrConnection reads the upstream URL and token in one snapshot.
func LoadBindizrConnection(ctx context.Context) (BindizrConnection, error) {
	var connection BindizrConnection
	err := DB.QueryRowContext(ctx, `
		SELECT
			COALESCE((SELECT value FROM settings WHERE key = 'bindizr_url'), ''),
			COALESCE((SELECT value FROM settings WHERE key = 'api_token'), '')
	`).Scan(&connection.URL, &connection.APIToken)
	return connection, err
}

// SaveBindizrConnection changes the upstream URL and token together.
func SaveBindizrConnection(ctx context.Context, connection BindizrConnection) error {
	_, err := DB.ExecContext(ctx, `
		INSERT OR REPLACE INTO settings (key, value)
		VALUES ('bindizr_url', ?), ('api_token', ?)
	`, connection.URL, connection.APIToken)
	return err
}

// CompleteSetup stores the Bindizr connection and optional account in one
// statement. A concurrent setup that has already finished takes precedence.
func CompleteSetup(ctx context.Context, connection BindizrConnection, username, passwordHash string) (bool, error) {
	result, err := DB.ExecContext(ctx, `
		WITH new_settings(key, value) AS (
			VALUES
				('bindizr_url', ?),
				('api_token', NULLIF(?, '')),
				('username', NULLIF(?, '')),
				('password', NULLIF(?, '')),
				('setup_complete', 'true')
		)
		INSERT OR REPLACE INTO settings (key, value)
		SELECT key, value FROM new_settings
		WHERE value IS NOT NULL AND NOT EXISTS (
			SELECT 1 FROM settings WHERE key = 'setup_complete' AND value = 'true'
		)
	`, connection.URL, connection.APIToken, username, passwordHash)
	if err != nil {
		return false, err
	}
	rows, err := result.RowsAffected()
	return rows > 0, err
}
