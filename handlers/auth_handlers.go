package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"bindizr-ui/db"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthStatusResponse struct {
	SetupComplete  bool `json:"setupComplete"`
	AccountEnabled bool `json:"accountEnabled"`
}

type UserResponse struct {
	Username string `json:"username"`
}

// AuthStatusHandler returns the setup and account status
func AuthStatusHandler(w http.ResponseWriter, r *http.Request) {
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

	response := AuthStatusResponse{
		SetupComplete:  setupComplete,
		AccountEnabled: accountEnabled,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

type authError struct {
	status  int
	message string
}

// authenticate validates the request's Bearer token and returns its claims.
func authenticate(r *http.Request) (jwt.MapClaims, *authError) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, &authError{http.StatusUnauthorized, "Authorization header required"}
	}

	secret, err := db.GetNextAuthSecret()
	if err != nil {
		return nil, &authError{http.StatusInternalServerError, err.Error()}
	}

	token, err := jwt.Parse(authHeader[len("Bearer "):], func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, &authError{http.StatusUnauthorized, "Invalid token"}
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, &authError{http.StatusUnauthorized, "Invalid token claims"}
	}
	return claims, nil
}

// AuthMeHandler returns current user info if authenticated
func AuthMeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accountEnabled, err := db.IsAccountEnabled()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !accountEnabled {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "no_auth_required"})
		return
	}

	claims, authErr := authenticate(r)
	if authErr != nil {
		http.Error(w, authErr.message, authErr.status)
		return
	}

	username, ok := claims["name"].(string)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UserResponse{Username: username})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	username, err := db.GetSetting("username")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	passwordHash, err := db.GetSetting("password")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if creds.Username != username || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(creds.Password)) != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	secret, err := db.GetNextAuthSecret()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"name": username,
		"exp":  time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": tokenString})
}

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountEnabled, err := db.IsAccountEnabled()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if accountEnabled {
			if _, authErr := authenticate(r); authErr != nil {
				http.Error(w, authErr.message, authErr.status)
				return
			}
		}

		next.ServeHTTP(w, r)
	}
}
