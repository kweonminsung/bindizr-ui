package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	deliveryTimeout      = 8 * time.Second
	deliveryPollInterval = time.Second
	initialRetryDelay    = 5 * time.Second
)

var errInvalidDestination = errors.New("Enter a valid HTTP or HTTPS URL without credentials or a fragment")

func parseDestination(rawURL string) (*url.URL, error) {
	rawURL = strings.TrimSpace(rawURL)
	destination, err := url.Parse(rawURL)
	if err != nil || destination.Hostname() == "" ||
		(destination.Scheme != "http" && destination.Scheme != "https") ||
		destination.User != nil || strings.Contains(rawURL, "#") {
		return nil, errInvalidDestination
	}
	if port := destination.Port(); port != "" {
		number, err := strconv.ParseUint(port, 10, 16)
		if err != nil || number == 0 {
			return nil, errInvalidDestination
		}
	}
	return destination, nil
}

// Run sends queued deliveries until the context is canceled.
func (s *Service) Run(ctx context.Context) {
	ticker := time.NewTicker(deliveryPollInterval)
	defer ticker.Stop()

	for ctx.Err() == nil {
		job, err := s.claim(ctx, time.Now())
		switch {
		case err != nil:
			if ctx.Err() == nil {
				log.Print("Failed to claim a webhook delivery")
			}
		case job != nil:
			statusCode, failure := sendDelivery(ctx, job, time.Now())
			if ctx.Err() != nil {
				return
			}
			var nextAttempt time.Time
			if failure != "" && job.Attempts < maxDeliveryAttempts {
				delay := initialRetryDelay << (job.Attempts - 1)
				nextAttempt = time.Now().Add(delay)
			}
			if s.finish(ctx, job, statusCode, failure, nextAttempt) == nil {
				continue
			}
			if ctx.Err() == nil {
				log.Print("Failed to record a webhook delivery result")
			}
		}

		select {
		case <-ctx.Done():
			return
		case <-s.wake:
		case <-ticker.C:
		}
	}
}

func sendDelivery(ctx context.Context, job *deliveryJob, now time.Time) (statusCode int, failure string) {
	destination, err := parseDestination(job.URL)
	if err != nil {
		return 0, err.Error()
	}
	ctx, cancel := context.WithTimeout(ctx, deliveryTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, destination.String(), bytes.NewReader(job.Payload))
	if err != nil {
		return 0, errInvalidDestination.Error()
	}
	timestamp := strconv.FormatInt(now.Unix(), 10)
	mac := hmac.New(sha256.New, []byte(job.Secret))
	mac.Write([]byte(timestamp + "."))
	mac.Write(job.Payload)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Bindizr-Webhook-Id", job.EventID)
	request.Header.Set("X-Bindizr-Webhook-Event", job.EventType)
	request.Header.Set("X-Bindizr-Webhook-Timestamp", timestamp)
	request.Header.Set("X-Bindizr-Webhook-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	request.Close = true

	// RoundTrip preserves redirect responses as delivery failures.
	response, err := http.DefaultTransport.RoundTrip(request)
	if err != nil {
		var networkError net.Error
		if errors.As(err, &networkError) && networkError.Timeout() {
			return 0, "Webhook request timed out"
		}
		return 0, "Could not reach the webhook endpoint"
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return response.StatusCode, "Webhook endpoint returned an unsuccessful HTTP status"
	}
	return response.StatusCode, ""
}
