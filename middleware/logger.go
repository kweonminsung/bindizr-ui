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
		
		// Create a custom ResponseWriter to capture status code
		wrapped := &responseWriter{
			ResponseWriter: w,
			statusCode:     200,
		}
		
		// Process the request
		next.ServeHTTP(wrapped, r)
		
		// Log the request with auth header info
		duration := time.Since(start)
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			// Only show Bearer prefix and first few characters of token for security
			if len(authHeader) > 20 {
				authHeader = authHeader[:20] + "..."
			}
		} else {
			authHeader = "none"
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