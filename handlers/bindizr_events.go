package handlers

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"bindizr-ui/webhooks"
)

const maxWebhookResponseBytes = 16 << 20

type webhookResultKind uint8

const (
	appliedZone webhookResultKind = iota
	appliedZoneImport
	appliedZoneImports
	appliedRollback
	appliedRecord
	appliedRecordBulk
	appliedRecordDelete
	roleResult
	roleGrantResult
	tokenResult
	tsigKeyResult
	policyResult
	secondaryResult
	secondaryCheckResult
	dnssecResult
	dnssecCheckResult
	messageResult
)

type webhookRule struct {
	method     string
	path       string
	operation  string
	status     int
	resultKind webhookResultKind
	result     string
}

var bindizrWebhookRules = []webhookRule{
	{http.MethodPost, "/zones", "zone.create", http.StatusCreated, appliedZone, "changed"},
	{http.MethodPut, "/zones/{zone}", "zone.update", http.StatusOK, appliedZone, "changed"},
	{http.MethodDelete, "/zones/{zone}", "zone.delete", http.StatusOK, appliedZone, "changed"},
	{http.MethodPost, "/zones/{zone}/import", "zone.import", http.StatusOK, appliedZoneImport, "changed"},
	{http.MethodPost, "/import", "zone.import", http.StatusOK, appliedZoneImports, "changed"},
	{http.MethodPost, "/zones/{zone}/versions/{serial}/rollback", "zone.rollback", http.StatusOK, appliedRollback, "changed"},
	{http.MethodPost, "/zones/{zone}/notify", "zone.notify", http.StatusOK, messageResult, "succeeded"},
	{http.MethodPost, "/notify", "zone.notify", http.StatusOK, messageResult, "succeeded"},
	{http.MethodPost, "/records", "record.create", http.StatusCreated, appliedRecord, "changed"},
	{http.MethodPost, "/records/bulk", "record.bulk_create", http.StatusCreated, appliedRecordBulk, "changed"},
	{http.MethodPut, "/records/{record}", "record.update", http.StatusOK, appliedRecord, "changed"},
	{http.MethodDelete, "/records/{record}", "record.delete", http.StatusOK, appliedRecordDelete, "changed"},
	{http.MethodDelete, "/records", "record.delete", http.StatusOK, appliedRecordDelete, "changed"},
	{http.MethodPost, "/roles", "role.create", http.StatusCreated, roleResult, "changed"},
	{http.MethodDelete, "/roles/{name}", "role.delete", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/roles/{name}/grants", "role_grant.create", http.StatusCreated, roleGrantResult, "changed"},
	{http.MethodDelete, "/roles/{name}/grants/{id}", "role_grant.delete", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/tokens", "token.create", http.StatusCreated, tokenResult, "changed"},
	{http.MethodDelete, "/tokens/{name}", "token.delete", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/tsig-keys", "tsig_key.create", http.StatusCreated, tsigKeyResult, "changed"},
	{http.MethodDelete, "/tsig-keys/{name}", "tsig_key.delete", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/secondaries", "secondary.create", http.StatusCreated, secondaryResult, "changed"},
	{http.MethodPut, "/secondaries/{name}", "secondary.update", http.StatusOK, secondaryResult, "succeeded"},
	{http.MethodDelete, "/secondaries/{name}", "secondary.delete", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/secondaries/{name}/check", "secondary.check", http.StatusOK, secondaryCheckResult, "succeeded"},
	{http.MethodPost, "/dnssec-policies", "dnssec_policy.create", http.StatusCreated, policyResult, "changed"},
	{http.MethodPut, "/dnssec-policies/{name}", "dnssec_policy.update", http.StatusOK, policyResult, "succeeded"},
	{http.MethodDelete, "/dnssec-policies/{name}", "dnssec_policy.delete", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/zones/{zone}/dnssec", "dnssec.enable", http.StatusCreated, dnssecResult, "changed"},
	{http.MethodPut, "/zones/{zone}/dnssec", "dnssec.update", http.StatusOK, dnssecResult, "succeeded"},
	{http.MethodDelete, "/zones/{zone}/dnssec", "dnssec.disable", http.StatusOK, messageResult, "changed"},
	{http.MethodPost, "/zones/{zone}/dnssec/sign", "dnssec.sign", http.StatusOK, messageResult, "succeeded"},
	{http.MethodPost, "/zones/{zone}/dnssec/rollover", "dnssec.start_rollover", http.StatusOK, dnssecResult, "changed"},
	{http.MethodPost, "/zones/{zone}/dnssec/rollover/advance", "dnssec.advance_rollover", http.StatusOK, dnssecResult, "changed"},
	{http.MethodPost, "/zones/{zone}/dnssec/withdraw", "dnssec.withdraw", http.StatusOK, dnssecResult, "changed"},
	{http.MethodDelete, "/zones/{zone}/dnssec/withdraw", "dnssec.cancel_withdrawal", http.StatusOK, dnssecResult, "changed"},
	{http.MethodPost, "/zones/{zone}/dnssec/check-ds", "dnssec.check_ds", http.StatusOK, dnssecCheckResult, "succeeded"},
}

// BindizrWebhookOperations lists the operations the UI proxy can observe.
func BindizrWebhookOperations() []string {
	operations := make([]string, 0, len(bindizrWebhookRules))
	for _, rule := range bindizrWebhookRules {
		operations = append(operations, rule.operation)
	}
	slices.Sort(operations)
	return slices.Compact(operations)
}

type bindizrMutation struct {
	rule   webhookRule
	target webhooks.EventTarget
}

func webhookMutation(method, suffix string) (bindizrMutation, bool) {
	if method != http.MethodPost && method != http.MethodPut && method != http.MethodDelete {
		return bindizrMutation{}, false
	}
	parts := strings.Split(strings.TrimPrefix(suffix, "/"), "/")
	for i, part := range parts {
		value, err := url.PathUnescape(part)
		if err != nil || value == "" {
			return bindizrMutation{}, false
		}
		parts[i] = value
	}
	for _, rule := range bindizrWebhookRules {
		if rule.method == method {
			if target, matched := webhookTarget(rule.path, parts); matched {
				if rule.operation == "tsig_key.delete" {
					target.Name = webhookZoneName(target.Name)
				}
				return bindizrMutation{rule: rule, target: target}, true
			}
		}
	}
	return bindizrMutation{}, false
}

func webhookTarget(path string, parts []string) (webhooks.EventTarget, bool) {
	pattern := strings.Split(strings.TrimPrefix(path, "/"), "/")
	if len(pattern) != len(parts) {
		return webhooks.EventTarget{}, false
	}

	var target webhooks.EventTarget
	for i, segment := range pattern {
		value := parts[i]
		switch segment {
		case "{name}":
			target.Name = strings.ToLower(strings.TrimSpace(value))
		case "{zone}":
			target.ZoneName = webhookZoneName(value)
		case "{record}":
			id, err := strconv.ParseInt(value, 10, 32)
			if err != nil || id <= 0 {
				return webhooks.EventTarget{}, false
			}
			target.RecordID = id
		case "{id}", "{serial}":
			if _, err := strconv.ParseUint(value, 10, 32); err != nil {
				return webhooks.EventTarget{}, false
			}
		default:
			if segment != value {
				return webhooks.EventTarget{}, false
			}
		}
	}
	return target, true
}

func webhookZoneName(value string) string {
	return strings.ToLower(strings.TrimSuffix(strings.TrimSpace(value), "."))
}

func recordDeleteTarget(query url.Values) webhooks.EventTarget {
	zoneName := webhookZoneName(query.Get("zone_name"))
	target := webhooks.EventTarget{
		ZoneName: zoneName, RecordType: strings.ToUpper(strings.TrimSpace(query.Get("type"))),
	}
	if name := strings.ToLower(strings.TrimSpace(query.Get("name"))); strings.HasSuffix(name, ".") {
		target.RecordName = relativeRecordName(name, zoneName)
	} else {
		target.RecordName = name
	}
	return target
}

type namedWebhookResource struct {
	Name string `json:"name"`
}

type recordWebhookResource struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	ZoneName string `json:"zone_name"`
	Type     string `json:"type"`
}

func (record recordWebhookResource) target() webhooks.EventTarget {
	return webhooks.EventTarget{
		ZoneName: record.ZoneName, RecordID: record.ID,
		RecordName: relativeRecordName(record.Name, record.ZoneName), RecordType: record.Type,
	}
}

func relativeRecordName(name, zoneName string) string {
	name = strings.TrimSuffix(name, ".")
	if name == zoneName {
		return "@"
	}
	return strings.TrimSuffix(name, "."+zoneName)
}

type webhookImportResult struct {
	Applied bool  `json:"applied"`
	DryRun  bool  `json:"dry_run"`
	Changed *bool `json:"changed"`
	Summary struct {
		Added   uint64 `json:"added"`
		Deleted uint64 `json:"deleted"`
		Updated uint64 `json:"updated"`
	} `json:"summary"`
}

func (imported webhookImportResult) activityResult() string {
	if !imported.Applied || imported.DryRun {
		return ""
	}
	if imported.Changed != nil {
		if *imported.Changed {
			return "changed"
		}
		return ""
	}
	// Older Bindizr responses only report record counts.
	if imported.Summary.Added > 0 || imported.Summary.Deleted > 0 || imported.Summary.Updated > 0 {
		return "changed"
	}
	return "succeeded"
}

// Only operation confirmations and target identities are decoded from the response.
type webhookMutationResult struct {
	webhookImportResult
	Zone         namedWebhookResource    `json:"zone"`
	Record       recordWebhookResource   `json:"record"`
	Records      []recordWebhookResource `json:"records"`
	Deleted      uint64                  `json:"deleted"`
	ZoneName     string                  `json:"zone_name"`
	Message      string                  `json:"message"`
	Role         namedWebhookResource    `json:"role"`
	Token        namedWebhookResource    `json:"token"`
	TsigKey      namedWebhookResource    `json:"tsig_key"`
	Secondary    namedWebhookResource    `json:"secondary"`
	DnssecPolicy namedWebhookResource    `json:"dnssec_policy"`
	RoleGrant    struct {
		RoleName string `json:"role_name"`
		ZoneName string `json:"zone_name"`
	} `json:"role_grant"`
	Zones []struct {
		ZoneName string              `json:"zone_name"`
		Result   string              `json:"result"`
		Import   webhookImportResult `json:"import"`
	} `json:"zones"`
	ResolveError *string `json:"resolve_error"`
	Catalog      struct {
		Status string `json:"status"`
	} `json:"catalog"`
	Notifies   []notifyWebhookResult `json:"notifies"`
	Delegation *struct{}             `json:"delegation"`
}

type notifyWebhookResult struct {
	Error *string `json:"error"`
}

func (mutation bindizrMutation) events(body []byte, createdAt time.Time) ([]webhooks.Event, error) {
	var response webhookMutationResult
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}
	if response.DryRun {
		return nil, nil
	}

	var events []webhooks.Event
	target := mutation.target
	result := mutation.rule.result
	add := func(target webhooks.EventTarget, operationResult string) {
		events = append(events, webhooks.Event{
			Operation: mutation.rule.operation, Target: target, Result: operationResult, CreatedAt: createdAt,
		})
	}

	switch mutation.rule.resultKind {
	case appliedZone:
		if response.Applied && response.Zone.Name != "" {
			add(webhooks.EventTarget{ZoneName: response.Zone.Name}, result)
		}
	case appliedZoneImport:
		if result := response.webhookImportResult.activityResult(); result != "" {
			add(target, result)
		}
	case appliedZoneImports:
		for _, zone := range response.Zones {
			if result := zone.Import.activityResult(); zone.ZoneName != "" && zone.Result == "ok" && result != "" {
				add(webhooks.EventTarget{ZoneName: zone.ZoneName}, result)
			}
		}
	case appliedRollback:
		if response.Applied {
			add(target, result)
		}
	case appliedRecord:
		if response.Applied && response.Record.ID > 0 {
			add(response.Record.target(), result)
		}
	case appliedRecordBulk, appliedRecordDelete:
		if response.Applied {
			for _, record := range response.Records {
				if record.ID > 0 {
					add(record.target(), result)
				}
			}
			// Delete counts include records hidden by the caller's read permissions.
			if mutation.rule.resultKind == appliedRecordDelete && response.Deleted > uint64(len(events)) {
				add(target, result)
			}
		}
	case roleResult, tokenResult, tsigKeyResult, policyResult, secondaryResult:
		resource := response.namedResource(mutation.rule.resultKind)
		if resource.Name != "" {
			add(webhooks.EventTarget{Name: resource.Name}, result)
		}
	case roleGrantResult:
		if response.RoleGrant.RoleName != "" {
			add(webhooks.EventTarget{Name: response.RoleGrant.RoleName, ZoneName: response.RoleGrant.ZoneName}, result)
		}
	case secondaryCheckResult:
		if response.Secondary.Name != "" && response.Catalog.Status != "" {
			if response.ResolveError != nil || response.Catalog.Status != "in_sync" ||
				slices.ContainsFunc(response.Notifies, func(notify notifyWebhookResult) bool { return notify.Error != nil }) {
				result = "failed"
			}
			add(webhooks.EventTarget{Name: response.Secondary.Name}, result)
		}
	case dnssecResult, dnssecCheckResult:
		if response.ZoneName != "" && (mutation.rule.resultKind != dnssecCheckResult || response.Delegation != nil) {
			add(webhooks.EventTarget{ZoneName: response.ZoneName}, result)
		}
	case messageResult:
		if response.Message != "" {
			add(target, result)
		}
	}
	return events, nil
}

func (result webhookMutationResult) namedResource(kind webhookResultKind) namedWebhookResource {
	switch kind {
	case roleResult:
		return result.Role
	case tokenResult:
		return result.Token
	case tsigKeyResult:
		return result.TsigKey
	case policyResult:
		return result.DnssecPolicy
	default:
		return result.Secondary
	}
}

// webhookResponse retains a bounded copy of the response while the proxy streams it.
type webhookResponse struct {
	body     bytes.Buffer
	tooLarge bool
}

func (response *webhookResponse) Write(p []byte) (int, error) {
	if response.tooLarge || len(p) > maxWebhookResponseBytes-response.body.Len() {
		response.body = bytes.Buffer{}
		response.tooLarge = true
		return len(p), nil
	}
	return response.body.Write(p)
}

func (response *webhookResponse) jsonBody(encoding string) ([]byte, error) {
	if response.tooLarge {
		return nil, errors.New("Bindizr response exceeds the webhook observation limit")
	}
	switch strings.ToLower(strings.TrimSpace(encoding)) {
	case "", "identity":
		return response.body.Bytes(), nil
	case "gzip":
		reader, err := gzip.NewReader(&response.body)
		if err != nil {
			return nil, err
		}
		defer reader.Close()
		body, err := io.ReadAll(io.LimitReader(reader, maxWebhookResponseBytes+1))
		if len(body) > maxWebhookResponseBytes {
			return nil, errors.New("Bindizr response exceeds the webhook observation limit")
		}
		return body, err
	default:
		return nil, errors.New("Bindizr response uses an unsupported webhook observation encoding")
	}
}

func forwardBindizrMutation(
	w http.ResponseWriter,
	resp *http.Response,
	ctx context.Context,
	mutation bindizrMutation,
	enqueue func(context.Context, ...webhooks.Event) error,
) {
	var observed webhookResponse
	if _, err := io.Copy(w, io.TeeReader(resp.Body, &observed)); err != nil {
		log.Print("Could not observe the complete Bindizr mutation response for webhooks")
		return
	}
	body, err := observed.jsonBody(resp.Header.Get("Content-Encoding"))
	if err != nil {
		log.Print("Could not observe the encoding or size of the Bindizr mutation response for webhooks")
		return
	}
	events, err := mutation.events(body, time.Now().UTC())
	if err != nil {
		log.Print("Could not decode Bindizr mutation response for webhooks")
		return
	}
	if len(events) == 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := enqueue(ctx, events...); err != nil {
		log.Print("Could not queue Bindizr webhook events")
	}
}
