package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"bindizr-ui/server/db"
)

type BindizrSettings struct {
	BindizrUrl string `json:"bindizrUrl"`
	SecretKey  string `json:"secretKey"`
}

func BindizrHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		bindizrUrl, err := db.GetSetting("bindizr_url")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		secretKey, err := db.GetSetting("secret_key")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		settings := BindizrSettings{
			BindizrUrl: bindizrUrl,
			SecretKey:  secretKey,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(settings)
	case "POST":
		var settings BindizrSettings
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if settings.BindizrUrl == "" {
			http.Error(w, "Bindizr URL is a required field", http.StatusBadRequest)
			return
		}
		if err := db.SetSetting("bindizr_url", settings.BindizrUrl); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if err := db.SetSetting("secret_key", settings.SecretKey); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"message": "Bindizr settings updated successfully"}`)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
