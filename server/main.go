package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"bindizr-ui/server/db"
	"bindizr-ui/server/handlers"
	"bindizr-ui/server/middleware"
)

//go:embed dist
var distFS embed.FS

const (
	DEFAULT_PORT = "8080"
)

// getPort returns the port from environment variable or default
func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = DEFAULT_PORT
	}
	return port
}

// isDevelopment checks if we're in development mode
func isDevelopment() bool {
	env := os.Getenv("GO_ENV")
	return env == "development" || env == "dev"
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

	// Configure static file serving based on environment
	if isDevelopment() {
		fmt.Println("Development mode: Using local dist files")
		// Development: serve files from local ../dist directory
		mux.Handle("/assets/", http.FileServer(http.Dir("../dist")))
		
		// Static file serving - serve local index.html for all non-API routes
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, "../dist/index.html")
		})
	} else {
		fmt.Println("Production mode: Using embedded dist files")
		// Production: serve embedded files
		distSubFS, err := fs.Sub(distFS, "dist")
		if err != nil {
			log.Fatal("Failed to create sub filesystem:", err)
		}
		
		mux.Handle("/assets/", http.FileServer(http.FS(distSubFS)))

		// Static file serving - serve embedded index.html for all non-API routes
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			indexFile, err := distSubFS.Open("index.html")
			if err != nil {
				http.Error(w, "Index file not found", http.StatusNotFound)
				return
			}
			defer indexFile.Close()
			
			w.Header().Set("Content-Type", "text/html")
			http.ServeContent(w, r, "index.html", time.Time{}, indexFile.(io.ReadSeeker))
		})
	}

	port := getPort()
	fmt.Printf("Starting server on port %s...\n", port)
	
	// Apply logging middleware to all requests
	loggedMux := middleware.LoggingMiddleware(mux)
	
	if err := http.ListenAndServe(":"+port, loggedMux); err != nil {
		log.Fatal(err)
	}
}