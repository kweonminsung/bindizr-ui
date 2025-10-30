package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"bindizr-ui/db"
	"bindizr-ui/handlers"
	"bindizr-ui/middleware"
)

//go:embed ui/dist
var distFS embed.FS

const (
	DEFAULT_PORT    = "9000"
	DEFAULT_UI_PORT = "8000"
)

// getPort returns the port from environment variable or default
func getPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = DEFAULT_PORT
	}
	return port
}

// getUiPort returns the ui port from environment variable or default
func getUiPort() string {
	port := os.Getenv("UI_PORT")
	if port == "" {
		port = DEFAULT_UI_PORT
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
		uiPort := getUiPort()
		fmt.Printf("Development mode: Proxying to localhost:%s\n", uiPort)
		devServerURL, err := url.Parse("http://localhost:" + uiPort)
		if err != nil {
			log.Fatal("Failed to parse dev server URL: ", err)
		}
		proxy := httputil.NewSingleHostReverseProxy(devServerURL)

		// Proxy all non-API routes to the dev server
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				// This should not happen if API routes are registered first, but as a safeguard
				http.NotFound(w, r)
				return
			}
			proxy.ServeHTTP(w, r)
		})
	} else {
		fmt.Println("Production mode: Using embedded ui/dist files")
		// Production: serve embedded files
		distSubFS, err := fs.Sub(distFS, "ui/dist")
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