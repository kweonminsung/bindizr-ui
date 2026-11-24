package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

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

	baseURL, err := parseBindizrURL(payload.BindizrUrl)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Open for the setup wizard; afterwards the usual account gate applies
	setupComplete, err := db.IsSetupComplete()
	if err != nil {
		writeJSONError(w, "Failed to check setup status", http.StatusInternalServerError)
		return
	}
	if setupComplete && !requireAuth(w, r) {
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, baseURL.String()+"/zones", nil)
	if err != nil {
		writeJSONError(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	if payload.SecretKey != "" {
		req.Header.Set("Authorization", "Bearer "+payload.SecretKey)
	}

	client := &http.Client{
		Timeout:       10 * time.Second,
		CheckRedirect: stopBindizrRedirect,
	}
	resp, err := client.Do(req)
	if err != nil {
		writeJSONError(w, "Failed to connect to the server.", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		writeJSONError(w, bindizrRedirectMessage, http.StatusBadGateway)
		return
	}
	if resp.StatusCode == http.StatusOK {
		json.NewEncoder(w).Encode(map[string]string{"message": "Connection successful."})
	} else {
		status := fmt.Sprintf("%d %s", resp.StatusCode, http.StatusText(resp.StatusCode))
		writeJSONError(w, "Connection failed: "+strings.TrimSpace(status), resp.StatusCode)
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

	baseURL, err := parseBindizrURL(payload.BindizrUrl)
	if err != nil {
		writeJSONError(w, err.Error(), http.StatusBadRequest)
		return
	}

	var username, passwordHash string
	if payload.Username != "" && payload.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), 10)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}
		username, passwordHash = payload.Username, string(hashedPassword)
	}

	connection := db.BindizrConnection{URL: baseURL.String(), Token: payload.SecretKey}
	completed, err := db.CompleteSetup(r.Context(), connection, username, passwordHash)
	if err != nil {
		http.Error(w, "Failed to save initial settings", http.StatusInternalServerError)
		return
	}
	if !completed {
		http.Error(w, "Setup has already been completed.", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Setup successful."})
}
