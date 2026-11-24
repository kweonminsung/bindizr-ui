package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"bindizr-ui/db"
)

const bindizrProxyPrefix = "/api/bindizr/proxy"

var (
	errBindizrURLRequired = errors.New("Bindizr URL is required")
	errBindizrURLInvalid  = errors.New("Bindizr URL must use HTTP or HTTPS and have no credentials, query, or fragment")
	errBindizrProxyPath   = errors.New("invalid Bindizr proxy path")
)

const bindizrRedirectMessage = "The server redirected the request. Enter the final URL instead."

// stopBindizrRedirect keeps the configured bearer token on the selected upstream.
func stopBindizrRedirect(*http.Request, []*http.Request) error {
	return http.ErrUseLastResponse
}

var bindizrProxyClient = &http.Client{CheckRedirect: stopBindizrRedirect}

type BindizrSettings struct {
	BindizrUrl string `json:"bindizrUrl"`
	APIToken   string `json:"apiToken"`
}

func BindizrSettingsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		connection, err := db.LoadBindizrConnection(r.Context())
		if err != nil {
			http.Error(w, "Failed to load Bindizr settings", http.StatusInternalServerError)
			return
		}
		settings := BindizrSettings{
			BindizrUrl: connection.URL,
			APIToken:   connection.APIToken,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(settings)
	case "POST":
		var settings BindizrSettings
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, "Invalid payload", http.StatusBadRequest)
			return
		}
		baseURL, err := parseBindizrURL(settings.BindizrUrl)
		if err != nil {
			writeJSONError(w, err.Error(), http.StatusBadRequest)
			return
		}
		connection := db.BindizrConnection{URL: baseURL.String(), APIToken: settings.APIToken}
		if err := db.SaveBindizrConnection(r.Context(), connection); err != nil {
			http.Error(w, "Failed to save Bindizr settings", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"message": "Bindizr settings updated successfully"}`)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func BindizrProxyHandler(w http.ResponseWriter, r *http.Request) {
	connection, err := db.LoadBindizrConnection(r.Context())
	if err != nil {
		http.Error(w, "Failed to load Bindizr settings", http.StatusInternalServerError)
		return
	}
	if connection.URL == "" {
		http.Error(w, "Bindizr URL is not configured", http.StatusBadRequest)
		return
	}

	suffix, err := bindizrProxySuffix(r.URL.EscapedPath())
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	targetURL, err := buildBindizrProxyURL(connection.URL, suffix, r.URL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}
	copyProxyHeaders(req.Header, r.Header)

	if connection.APIToken != "" {
		req.Header.Set("Authorization", "Bearer "+connection.APIToken)
	}

	resp, err := bindizrProxyClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to connect to Bindizr server", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 && resp.StatusCode < 400 && resp.StatusCode != http.StatusNotModified {
		writeJSONError(w, bindizrRedirectMessage, http.StatusBadGateway)
		return
	}

	copyProxyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

// parseBindizrURL validates the configured base and keeps its escaped path prefix.
func parseBindizrURL(rawURL string) (*url.URL, error) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, errBindizrURLRequired
	}
	baseURL, err := url.Parse(strings.TrimRight(rawURL, "/"))
	if err != nil || baseURL.Hostname() == "" ||
		(baseURL.Scheme != "http" && baseURL.Scheme != "https") ||
		baseURL.User != nil || baseURL.RawQuery != "" || baseURL.ForceQuery ||
		strings.Contains(rawURL, "#") {
		return nil, errBindizrURLInvalid
	}
	return baseURL, nil
}

func bindizrProxySuffix(suffix string) (string, error) {
	for _, segment := range strings.Split(strings.TrimPrefix(bindizrProxyPrefix, "/"), "/") {
		if !strings.HasPrefix(suffix, "/") {
			return "", errBindizrProxyPath
		}
		escapedSegment, _, _ := strings.Cut(suffix[1:], "/")
		decodedSegment, err := url.PathUnescape(escapedSegment)
		if err != nil || decodedSegment != segment {
			return "", errBindizrProxyPath
		}
		suffix = suffix[1+len(escapedSegment):]
	}
	if suffix == "" {
		suffix = "/"
	}
	return suffix, nil
}

func buildBindizrProxyURL(rawBaseURL, suffix string, requestURL *url.URL) (string, error) {
	baseURL, err := parseBindizrURL(rawBaseURL)
	if err != nil {
		return "", err
	}
	// A slash inside a DNS label stays a single path segment.
	escapedPath := baseURL.EscapedPath() + suffix
	path, err := url.PathUnescape(escapedPath)
	if err != nil {
		return "", errBindizrProxyPath
	}
	baseURL.Path = path
	baseURL.RawPath = escapedPath
	baseURL.RawQuery = requestURL.RawQuery
	baseURL.ForceQuery = requestURL.ForceQuery
	return baseURL.String(), nil
}

func copyProxyHeaders(dst, src http.Header) {
	for key, values := range src {
		if isHopByHopHeader(key) || strings.EqualFold(key, "Authorization") ||
			strings.EqualFold(key, "Cookie") || strings.EqualFold(key, "Set-Cookie") {
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}

func isHopByHopHeader(header string) bool {
	switch strings.ToLower(header) {
	case "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
		"te", "trailer", "transfer-encoding", "upgrade":
		return true
	default:
		return false
	}
}
