package handlers

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

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
		writeJSONError(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.BindizrUrl == "" {
		writeJSONError(w, "Bindizr Server URL is required.", http.StatusBadRequest)
		return
	}

	bindizrURL, ok := normalizeBindizrURL(payload.BindizrUrl)
	if !ok {
		writeJSONError(w, "Invalid Bindizr URL. Only http:// and https:// URLs are supported.", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequest("GET", bindizrURL+"/zones", nil)
	if err != nil {
		writeJSONError(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	if payload.SecretKey != "" {
		req.Header.Set("Authorization", "Bearer "+payload.SecretKey)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		writeJSONError(w, "Failed to connect to the server.", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	if resp.StatusCode == http.StatusOK {
		json.NewEncoder(w).Encode(map[string]string{"message": "Connection successful."})
	} else {
		writeJSONError(w, "Connection failed: "+resp.Status, resp.StatusCode)
	}
}

func writeJSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"message": message})
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

	bindizrURL, ok := normalizeBindizrURL(payload.BindizrUrl)
	if !ok {
		http.Error(w, "Invalid Bindizr URL. Only http:// and https:// URLs are supported.", http.StatusBadRequest)
		return
	}

	db.SetSetting("bindizr_url", bindizrURL)
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

func normalizeBindizrURL(rawURL string) (string, bool) {
	parsedURL, err := url.Parse(strings.TrimRight(rawURL, "/"))
	if err != nil || parsedURL.Host == "" {
		return "", false
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return "", false
	}

	return parsedURL.String(), true
}
