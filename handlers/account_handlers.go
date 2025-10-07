package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"bindizr-ui/db"

	"golang.org/x/crypto/bcrypt"
)

type AccountPayload struct {
	IsEnabled  *bool  `json:"isEnabled"`
	Username   string `json:"username"`
	Password   string `json:"password"`
	NewUsername string `json:"newUsername"`
	NewPassword string `json:"newPassword"`
}

func AccountHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "POST":
		handlePostAccount(w, r)
	case "PATCH":
		handlePatchAccount(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handlePostAccount(w http.ResponseWriter, r *http.Request) {
	var payload AccountPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.IsEnabled == nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if *payload.IsEnabled {
		if payload.Username == "" || payload.Password == "" {
			http.Error(w, "Username and password are required to enable an account.", http.StatusBadRequest)
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), 10)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}
		db.SetSetting("username", payload.Username)
		db.SetSetting("password", string(hashedPassword))
	} else {
		db.DeleteSetting("username")
		db.DeleteSetting("password")
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"message": "Account %s successfully"}`, map[bool]string{true: "enabled", false: "disabled"}[*payload.IsEnabled])
}

func handlePatchAccount(w http.ResponseWriter, r *http.Request) {
	var payload AccountPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	if payload.NewUsername == "" {
		http.Error(w, "Username is required.", http.StatusBadRequest)
		return
	}

	db.SetSetting("username", payload.NewUsername)

	if payload.NewPassword != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), 10)
		if err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			return
		}
		db.SetSetting("password", string(hashedPassword))
	}

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"message": "Account updated successfully"}`)
}
