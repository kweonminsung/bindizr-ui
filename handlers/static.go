package handlers

import (
	"io/fs"
	"net/http"
)

// SPAHandler serves the Vite build: hashed assets are cached forever, every other path gets index.html.
func SPAHandler(dist fs.FS) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/assets/{file}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFileFS(w, r, dist, "assets/"+r.PathValue("file"))
	})
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFileFS(w, r, dist, "favicon.ico")
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFileFS(w, r, dist, "index.html")
	})

	return mux
}
