package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"bindizr-ui/db"
	"bindizr-ui/handlers"
	"bindizr-ui/middleware"
)

//go:embed ui/dist
var distFS embed.FS

const (
	DEFAULT_PORT    = "9000"
	DEFAULT_UI_PORT = "9001"
)

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func isDevelopment() bool {
	env := os.Getenv("GO_ENV")
	return env == "development" || env == "dev"
}

func main() {
	db.InitDB()

	mux := http.NewServeMux()

	mux.HandleFunc("/api/public/bindizr/test", handlers.PublicBindizrTestHandler)
	mux.HandleFunc("/api/public/settings", handlers.PublicSettingsHandler)
	mux.HandleFunc("/api/account", handlers.AuthMiddleware(handlers.AccountHandler))
	mux.HandleFunc("/api/bindizr/settings", handlers.AuthMiddleware(handlers.BindizrSettingsHandler))
	mux.HandleFunc("/api/bindizr/proxy/", handlers.AuthMiddleware(handlers.BindizrProxyHandler))
	mux.HandleFunc("/api/auth/login", handlers.LoginHandler)
	mux.HandleFunc("/api/auth/status", handlers.AuthStatusHandler)
	mux.HandleFunc("/api/auth/me", handlers.AuthMeHandler)
	// Unmatched API routes must not fall through to the UI
	mux.Handle("/api/", http.NotFoundHandler())

	if isDevelopment() {
		uiPort := envOr("UI_PORT", DEFAULT_UI_PORT)
		fmt.Printf("Development mode: Proxying to localhost:%s\n", uiPort)
		devServerURL, err := url.Parse("http://localhost:" + uiPort)
		if err != nil {
			log.Fatal("Failed to parse dev server URL: ", err)
		}
		mux.Handle("/", httputil.NewSingleHostReverseProxy(devServerURL))
	} else {
		fmt.Println("Production mode: Using embedded ui/dist files")
		distSubFS, err := fs.Sub(distFS, "ui/dist")
		if err != nil {
			log.Fatal("Failed to create sub filesystem:", err)
		}
		mux.Handle("/", handlers.SPAHandler(distSubFS))
	}

	port := envOr("PORT", DEFAULT_PORT)
	fmt.Printf("Starting server on port %s...\n", port)

	loggedMux := middleware.LoggingMiddleware(mux)
	if err := http.ListenAndServe(":"+port, loggedMux); err != nil {
		log.Fatal(err)
	}
}
