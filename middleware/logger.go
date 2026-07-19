package middleware

import (
	"log"
	"net/http"
	"time"
)

// LoggingMiddleware logs all HTTP requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		// Truncate the auth header so tokens are not logged in full
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			authHeader = "none"
		} else if len(authHeader) > 20 {
			authHeader = authHeader[:20] + "..."
		}

		log.Printf("[%s] %s %s - %d (%v) [Auth: %s]",
			r.Method,
			r.URL.Path,
			r.RemoteAddr,
			wrapped.statusCode,
			duration,
			authHeader,
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
