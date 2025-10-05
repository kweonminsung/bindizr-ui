package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"bindizr-ui/server/db"
	"bindizr-ui/server/handlers"
)

// LoggingMiddleware logs all HTTP requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Create a custom ResponseWriter to capture status code
		wrapped := &responseWriter{
			ResponseWriter: w,
			statusCode:     200,
		}
		
		// Process the request
		next.ServeHTTP(wrapped, r)
		
		// Log the request
		duration := time.Since(start)
		log.Printf("[%s] %s %s - %d (%v)", 
			r.Method, 
			r.URL.Path, 
			r.RemoteAddr, 
			wrapped.statusCode, 
			duration,
		)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func main() {
	db.InitDB()
	handlers.InitCron()

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/public/bindizr/test", handlers.PublicBindizrTestHandler)
	mux.HandleFunc("/api/public/settings", handlers.PublicSettingsHandler)
	mux.HandleFunc("/api/settings", handlers.SettingsHandler)
	mux.HandleFunc("/api/account", handlers.AuthMiddleware(handlers.AccountHandler))
	mux.HandleFunc("/api/bindizr", handlers.AuthMiddleware(handlers.BindizrHandler))
	mux.HandleFunc("/api/cron", handlers.AuthMiddleware(handlers.CronHandler))
	mux.HandleFunc("/api/auth/login", handlers.LoginHandler)
	mux.HandleFunc("/api/auth/status", handlers.AuthStatusHandler)
	mux.HandleFunc("/api/auth/me", handlers.AuthMeHandler)
	mux.HandleFunc("/api/auth/logout", handlers.AuthLogoutHandler)


	mux.Handle("/assets/", http.FileServer(http.Dir("../dist")))

	// Static file serving - serve index.html for all non-API routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../dist/index.html")
	})

	fmt.Println("Starting server on port 8080...")
	
	// Apply logging middleware to all requests
	loggedMux := LoggingMiddleware(mux)
	
	if err := http.ListenAndServe(":8080", loggedMux); err != nil {
		log.Fatal(err)
	}
}
