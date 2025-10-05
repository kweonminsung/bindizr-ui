package main

import (
	"fmt"
	"log"
	"net/http"

	"bindizr-ui/server/db"
	"bindizr-ui/server/handlers"
)

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
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
