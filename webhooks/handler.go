package webhooks

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"slices"
	"strconv"
	"strings"
)

const route = "/api/webhooks"

func (s *Service) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.URL.Path == route {
		s.serveCollection(w, r)
		return
	}
	path, ok := strings.CutPrefix(r.URL.Path, route+"/")
	if !ok {
		writeError(w, http.StatusNotFound, "Webhook not found")
		return
	}
	rawID, action, hasAction := strings.Cut(path, "/")
	id, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusNotFound, "Webhook not found")
		return
	}
	if !hasAction {
		s.serveItem(w, r, id)
		return
	}
	switch action {
	case "test":
		if r.Method != http.MethodPost {
			methodNotAllowed(w, "POST")
			return
		}
		if err := s.enqueueTest(r.Context(), id); err != nil {
			writeStoreError(w, err, "Failed to queue test delivery")
			return
		}
		w.WriteHeader(http.StatusAccepted)
	case "deliveries":
		if r.Method != http.MethodGet {
			methodNotAllowed(w, "GET")
			return
		}
		items, err := s.listDeliveries(r.Context(), id)
		if err != nil {
			writeStoreError(w, err, "Failed to load deliveries")
			return
		}
		writeJSON(w, http.StatusOK, listResponse[delivery]{Items: items})
	default:
		writeError(w, http.StatusNotFound, "Webhook not found")
	}
}

func (s *Service) serveCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := s.listWebhooks(r.Context())
		if err != nil {
			writeStoreError(w, err, "Failed to load webhooks")
			return
		}
		writeJSON(w, http.StatusOK, webhookCollection{Items: items, Operations: s.operations})
	case http.MethodPost:
		settings, err := s.readSettings(w, r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if settings.Secret == "" {
			writeError(w, http.StatusBadRequest, "A signing secret is required")
			return
		}
		item, err := s.createWebhook(r.Context(), settings)
		if err != nil {
			writeStoreError(w, err, "Failed to create webhook")
			return
		}
		writeJSON(w, http.StatusCreated, item)
	default:
		methodNotAllowed(w, "GET, POST")
	}
}

func (s *Service) serveItem(w http.ResponseWriter, r *http.Request, id int64) {
	switch r.Method {
	case http.MethodGet:
		item, err := s.getWebhook(r.Context(), id)
		if err != nil {
			writeStoreError(w, err, "Failed to load webhook")
			return
		}
		writeJSON(w, http.StatusOK, item)
	case http.MethodPut:
		settings, err := s.readSettings(w, r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		item, err := s.updateWebhook(r.Context(), id, settings)
		if err != nil {
			writeStoreError(w, err, "Failed to update webhook")
			return
		}
		writeJSON(w, http.StatusOK, item)
	case http.MethodDelete:
		if err := s.removeWebhook(r.Context(), id); err != nil {
			writeStoreError(w, err, "Failed to delete webhook")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		methodNotAllowed(w, "GET, PUT, DELETE")
	}
}

type webhookCollection struct {
	Items      []webhook `json:"items"`
	Operations []string  `json:"operations"`
}

type listResponse[T any] struct {
	Items []T `json:"items"`
}

func (s *Service) readSettings(w http.ResponseWriter, r *http.Request) (webhookSettings, error) {
	var settings webhookSettings
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	if err := decoder.Decode(&settings); err != nil {
		return webhookSettings{}, errors.New("Invalid webhook settings")
	}
	if err := decoder.Decode(new(json.RawMessage)); err != io.EOF {
		return webhookSettings{}, errors.New("Invalid webhook settings")
	}

	settings.Name = strings.TrimSpace(settings.Name)
	if settings.Name == "" {
		return webhookSettings{}, errors.New("A webhook name is required")
	}
	destination, err := parseDestination(settings.URL)
	if err != nil {
		return webhookSettings{}, err
	}
	settings.URL = destination.String()
	if len(settings.Operations) == 0 {
		return webhookSettings{}, errors.New("Select at least one webhook event")
	}
	for _, operation := range settings.Operations {
		if operation == "" || operation == testEventType || (settings.Enabled && !s.supports(operation)) {
			return webhookSettings{}, errors.New("An unsupported webhook operation was selected")
		}
	}
	slices.Sort(settings.Operations)
	settings.Operations = slices.Compact(settings.Operations)
	if strings.TrimSpace(settings.Secret) == "" {
		settings.Secret = ""
	}
	return settings, nil
}

func methodNotAllowed(w http.ResponseWriter, allow string) {
	w.Header().Set("Allow", allow)
	writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
}

func writeStoreError(w http.ResponseWriter, err error, message string) {
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "Webhook not found")
		return
	}
	writeError(w, http.StatusInternalServerError, message)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, struct {
		Error string `json:"error"`
	}{Error: message})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
