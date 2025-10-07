package handlers

import (
	"encoding/json"
	"net/http"

	"bindizr-ui/db"

	"golang.org/x/crypto/bcrypt"
)

type SetupPayload struct {
	BindizrUrl string `json:"bindizrUrl"`
	SecretKey  string `json:"secretKey"`
	Username   string `json:"username"`
	Password   string `json:"password"`
}

type BindizrTestPayload struct {
	BindizrUrl string `json:"bindizrUrl"`
	SecretKey  string `json:"secretKey"`
}

func PublicBindizrTestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload BindizrTestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.BindizrUrl == "" {
		http.Error(w, "Bindizr Server URL is required.", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequest("GET", payload.BindizrUrl+"/zones", nil)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	if payload.SecretKey != "" {
		req.Header.Set("Authorization", "Bearer "+payload.SecretKey)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to connect to the server.", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		json.NewEncoder(w).Encode(map[string]string{"message": "Connection successful."})
	} else {
		http.Error(w, "Connection failed: "+resp.Status, resp.StatusCode)
	}
}

func PublicSettingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setupComplete, err := db.IsSetupComplete()
	if err != nil {
		http.Error(w, "Failed to check setup status", http.StatusInternalServerError)
		return
	}
	if setupComplete {
		http.Error(w, "Setup has already been completed.", http.StatusBadRequest)
		return
	}

	var payload SetupPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.BindizrUrl == "" {
		http.Error(w, "Bindizr Server URL is required.", http.StatusBadRequest)
		return
	}

	db.SetSetting("bindizr_url", payload.BindizrUrl)
	if payload.SecretKey != "" {
		db.SetSetting("secret_key", payload.SecretKey)
	}

	if payload.Username != "" && payload.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), 10)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}
		db.SetSetting("username", payload.Username)
		db.SetSetting("password", string(hashedPassword))
	}

	db.SetSetting("setup_complete", "true")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Setup successful."})
}
