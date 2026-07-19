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

	if isDevelopment() {
		uiPort := envOr("UI_PORT", DEFAULT_UI_PORT)
		fmt.Printf("Development mode: Proxying to localhost:%s\n", uiPort)
		devServerURL, err := url.Parse("http://localhost:" + uiPort)
		if err != nil {
			log.Fatal("Failed to parse dev server URL: ", err)
		}
		proxy := httputil.NewSingleHostReverseProxy(devServerURL)

		// Proxy all non-API routes to the Vite dev server
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}
			proxy.ServeHTTP(w, r)
		})
	} else {
		fmt.Println("Production mode: Using embedded ui/dist files")
		distSubFS, err := fs.Sub(distFS, "ui/dist")
		if err != nil {
			log.Fatal("Failed to create sub filesystem:", err)
		}

		mux.Handle("/assets/", http.FileServer(http.FS(distSubFS)))

		// Serve embedded index.html for all non-asset routes (SPA fallback)
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

	port := envOr("PORT", DEFAULT_PORT)
	fmt.Printf("Starting server on port %s...\n", port)

	loggedMux := middleware.LoggingMiddleware(mux)
	if err := http.ListenAndServe(":"+port, loggedMux); err != nil {
		log.Fatal(err)
	}
}
