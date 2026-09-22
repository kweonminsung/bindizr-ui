package middleware

import (
	"log"
	"net/http"
	"strings"
	"time"
)

// LoggingMiddleware logs all HTTP requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		// Strip line breaks so a crafted path cannot forge log lines
		path := strings.ReplaceAll(r.URL.Path, "\n", "")
		path = strings.ReplaceAll(path, "\r", "")

		authState := "none"
		if r.Header.Get("Authorization") != "" {
			authState = "present"
		}

		log.Printf("[%s] %s %s - %d (%v) [Auth: %s]",
			r.Method,
			path,
			r.RemoteAddr,
			wrapped.statusCode,
			duration,
			authState,
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
