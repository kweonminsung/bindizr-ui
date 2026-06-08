package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"bindizr-ui/db"
)

const bindizrProxyPrefix = "/api/bindizr/proxy"

type BindizrSettings struct {
	BindizrUrl string `json:"bindizrUrl"`
	SecretKey  string `json:"secretKey"`
}

func BindizrSettingsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		bindizrUrl, err := db.GetSetting("bindizr_url")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		secretKey, err := db.GetSetting("secret_key")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		settings := BindizrSettings{
			BindizrUrl: bindizrUrl,
			SecretKey:  secretKey,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(settings)
	case "POST":
		var settings BindizrSettings
		if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if settings.BindizrUrl == "" {
			http.Error(w, "Bindizr URL is a required field", http.StatusBadRequest)
			return
		}
		if err := db.SetSetting("bindizr_url", settings.BindizrUrl); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if err := db.SetSetting("secret_key", settings.SecretKey); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
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
	bindizrUrl, err := db.GetSetting("bindizr_url")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if bindizrUrl == "" {
		http.Error(w, "Bindizr URL is not configured", http.StatusBadRequest)
		return
	}

	targetUrl, err := buildBindizrProxyURL(bindizrUrl, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), r.Method, targetUrl, r.Body)
	if err != nil {
		http.Error(w, "Failed to create proxy request", http.StatusInternalServerError)
		return
	}
	copyProxyHeaders(req.Header, r.Header)

	secretKey, err := db.GetSetting("secret_key")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if secretKey != "" {
		req.Header.Set("Authorization", "Bearer "+secretKey)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, "Failed to connect to Bindizr server", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	copyProxyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func buildBindizrProxyURL(bindizrUrl string, r *http.Request) (string, error) {
	baseUrl, err := url.Parse(strings.TrimRight(bindizrUrl, "/"))
	if err != nil || baseUrl.Host == "" {
		return "", fmt.Errorf("invalid Bindizr URL")
	}

	proxyPath := strings.TrimPrefix(r.URL.Path, bindizrProxyPrefix)
	if proxyPath == "" {
		proxyPath = "/"
	}
	if !strings.HasPrefix(proxyPath, "/") {
		proxyPath = "/" + proxyPath
	}

	baseUrl.Path = strings.TrimRight(baseUrl.Path, "/") + proxyPath
	baseUrl.RawQuery = r.URL.RawQuery
	return baseUrl.String(), nil
}

func copyProxyHeaders(dst, src http.Header) {
	for key, values := range src {
		if isHopByHopHeader(key) || strings.EqualFold(key, "Authorization") {
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
