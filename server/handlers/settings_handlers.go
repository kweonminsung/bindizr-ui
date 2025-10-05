package handlers

import (
	"encoding/json"
	"net/http"

	"bindizr-ui/server/db"
)

type AppSettings struct {
	SetupComplete  bool `json:"setupComplete"`
	AccountEnabled bool `json:"accountEnabled"`
}

func SettingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setupComplete, err := db.IsSetupComplete()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	accountEnabled, err := db.IsAccountEnabled()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	settings := AppSettings{
		SetupComplete:  setupComplete,
		AccountEnabled: accountEnabled,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}
