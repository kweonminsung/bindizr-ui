# Bindizr UI

<p>
    <a href="https://github.com/kweonminsung/bindizr-ui/actions/workflows/ci.yml">
        <img src="https://github.com/kweonminsung/bindizr-ui/actions/workflows/ci.yml/badge.svg" />
    </a>
    <a href="https://github.com/netbirdio/netbird/blob/main/LICENSE">
        <img src="https://img.shields.io/badge/license-Apache 2.0-blue" />
    </a>
    <a href="https://github.com/kweonminsung/bindizr/releases/tag/v0.2.0">
        <img src="https://img.shields.io/badge/Compatible-0.2.0-success" />
    </a>
</p>

A web interface for [Bindizr](https://github.com/kweonminsung/bindizr): manage DNS zones and records, sign and synchronize zones, and delegate access through roles.

[Features](#features) · [Roles and credentials](#roles-and-credentials) · [Activity log](#logs) · [Run with Docker](#run-with-docker) · [Getting Started](#getting-started)

<img src="public/screenshots/zones.png" alt="Zone list with DNSSEC and disabled badges, search, filters, and record, import, and export actions" width="1000" />

## Features

Work with DNS data in **Zones** and **Records**, then manage signing in **DNSSEC** and propagation in **Secondaries**. Use [roles](#roles-and-credentials) to delegate these operations and the [activity log](#logs) to review administrative changes. Screenshots show a running instance with example data.

### Zone and record management

Create zones, configure their SOA settings, and manage records and TTLs. Search, filter, and sort the listings, or include generated DNSSEC records when inspecting a signed zone.

<img src="public/screenshots/records.png" alt="Records for example.com, including IPv4, IPv6, mail, TXT, and alias records, with zone and type filters" width="1000" />

### Zone import and export

Bring in a BIND zone file, a zone over AXFR, or multiple zones from a server or catalog. Validate **append**, **upsert**, or **replace** imports before applying them, and copy or download exports with or without DNSSEC records.

<img src="public/screenshots/import-preview.png" alt="A dry-run zone import validating three new records without applying changes" width="384" />

### Version history and rollback

Review changes by SOA serial and author, compare record differences, and preview rollbacks. Restoring a version advances the serial for secondary synchronization.

<img src="public/screenshots/version-diff.png" alt="Version comparison showing an updated API address, an added docs alias, and a removed legacy record" width="560" />

### DNSSEC signing and policies

Use the DNSSEC overview to check signed zones, then open a zone to inspect its signatures and keys. Apply reusable signing policies, manage rollovers, and copy or check the DS records published by the parent zone.

<img src="public/screenshots/dnssec.png" alt="DNSSEC status for example.com with signature counts, expiry, next re-signing time, and a DS record to copy" width="560" />

### Secondary synchronization

Register secondary servers, select a TSIG key for signed NOTIFY, and pause a server without removing it. Check serials and reachability, inspect AXFR/IXFR transfer history, or send NOTIFY for one zone or all enabled zones, optionally advancing the serial.

<img src="public/screenshots/secondaries.png" alt="Secondary list: one server signing NOTIFY under a TSIG key, one registered by hostname, and a disabled standby" width="1000" />

### Webhooks

Open **Settings → Webhooks**, enter an HTTP(S) endpoint, and select operations from the UI's catalog. Set a signing secret if the receiver verifies signatures. To disable signing for an existing webhook, select **Remove signing secret** when editing it. Use **Send test** to check the receiver. **Delivery history** shows the latest 50 deliveries with the queue time, event, target, delivery status, HTTP status, and attempt count.

The UI server queues events after it observes successful Bindizr responses through its proxy. A subscription uses the configured Bindizr connection and the usual permissions for each operation. The proxy observes JSON or gzip responses up to 16 MiB. A change still needs an observable response before the UI can queue its event. Keep the local SQLite database on a persistent volume to retain queued deliveries through restarts. Keep the UI behind its admin account or an authenticated proxy on shared deployments.

Each delivery includes the event ID and type in `X-Bindizr-Webhook-Id` and `X-Bindizr-Webhook-Event`. Server events use the canonical operation name as their type, such as `record.create`, and tests use `webhook.test`.

General receivers get a JSON POST with `id`, `type`, and `created_at`, the time Bindizr UI created the event, plus its observed `result` and target when available. A successful response can confirm an operation without reporting whether it changed stored data. Slack Incoming Webhook URLs (`https://hooks.slack.com/services/…`) receive a Slack message with the event details.

Signed deliveries also include `X-Bindizr-Webhook-Signature` and the Unix timestamp in seconds in `X-Bindizr-Webhook-Timestamp`. To verify the signature, compute HMAC-SHA256 over `<timestamp>.<raw request body>` with the shared secret and compare the lowercase hex digest to the value after `sha256=` in the signature header.

A 2xx response completes delivery. The server retries other statuses and network errors up to two more times, after five and ten seconds. The event ID stays the same, so the receiver can deduplicate retries. Use the final destination URL because the sender stops at a redirect response.

## Roles and credentials

Roles hold permissions; API tokens and TSIG keys act under a role. Start in **Access Control → Roles**, define what a role may do, then issue the credentials that will use those permissions.

### 1. Create a role for each purpose

Separate application deployments from secondary transfers with roles such as `deployment` and `zone-transfers`. The list shows each role's grant, token and key counts; a new role permits nothing until grants are added.

<img src="public/screenshots/roles.png" alt="Roles list separating the built-in admin role, application deployment permissions, and secondary zone transfers, with grant and credential counts" width="1000" />

### 2. Grant only the required actions

Open the role's **Add Grant** tab and choose actions for one zone or all zones. Record grants can also restrict names and types: this example allows `A` and `AAAA` records under `*.apps` in `example.com`.

<img src="public/screenshots/role-grants.png" alt="Adding a deployment grant for example.com, with record read, create, update and delete actions restricted to the *.apps name pattern and A or AAAA records" width="560" />

### 3. Issue tokens and keys in that role

Use the role's **API Tokens** and **TSIG Keys** tabs to create and review its credentials. Changing the role's grants changes what those credentials may do.

<img src="public/screenshots/role-tokens.png" alt="The deployment role's API Tokens tab showing its ci-deploy token alongside the Grants, TSIG Keys and Add Grant tabs" width="560" />

<details>
<summary>API token creation and TSIG key details</summary>

API tokens can expire; their secret is shown only when created. Creating one from a role fixes the role selection for you.

<img src="public/screenshots/api-token-role.png" alt="Creating ci-deploy with a 90-day expiry and the deployment role already selected" width="384" />

Generate or import TSIG keys for dynamic updates and zone transfers. Existing key secrets can be revealed or copied, and the key's details link back to role management.

<img src="public/screenshots/tsig-key-role.png" alt="A TSIG key with its secret masked and permissions inherited from the zone-transfers role" width="560" />

</details>

## Logs

Three logs, each under Logs in the sidebar. The activity log covers management operations and committed DNS changes. Filter it by operation, result, target, or date. DNS data edits also appear in the zone's version history. The access log shows management requests and nsupdates by actor, client IP, and result. The transfer log shows zone transfer attempts by secondary, client IP, zone, and result. Reading these logs requires `log:read`.

## Run with Docker

```bash
docker run -d --name bindizr-ui -p 9000:9000 kweonminsung/bindizr-ui:0.2.0
```

Or with Docker Compose:

```bash
docker compose up -d
```

Then open <http://localhost:9000>.

Run Bindizr 0.2.0 separately. In the setup screen, enter its URL as reachable from the UI server, provide an API token if required, and test the connection. The token's role determines the available pages and actions; an optional UI admin account protects access to this UI instance.

A `v*` tag, or the Manual Release workflow, builds and pushes the amd64 and
arm64 image; the Publish Image workflow pushes it under a tag you enter. To
push it from your own machine instead (the tag defaults to the version in
`ui/package.json`; `IMAGE` overrides the repository):

```bash
./scripts/build_image.sh
```

These builds pass the selected image tag as `APP_VERSION` for the UI footer.
Local frontend builds use `ui/package.json` unless `APP_VERSION` is set.

### Updating Bindizr UI

Pair Bindizr UI 0.2.0 with Bindizr 0.2.0. Its log pages and filters use the 0.2.0 API. See the [Bindizr release notes](https://kweonminsung.github.io/bindizr/changelog/0.2.0/) for the Bindizr clean-install steps.

Keep the UI's `/app/database.db` when replacing its container to retain settings, credentials, and webhook data. Reuse the existing persistent mount or stop the old container and copy the database out before removing it. Update the UI's configured API token after creating credentials in the new Bindizr instance.

## Getting Started

Run these commands from the repository root.

1. **Install dependencies and create the initial frontend build:**

   ```bash
   go mod download
   npm --prefix ui ci
   npm --prefix ui run build
   ```

2. **Start Vite in one terminal:**

   ```bash
   npm --prefix ui run dev
   ```

3. **Start the Go server in another terminal:**

   ```bash
   GO_ENV=development go run .
   ```

Open <http://localhost:9000>. The Go server forwards frontend requests to Vite on port 9001 and handles the local API and Bindizr proxy.

## Dependencies

- [Go](https://golang.org/) v1.27.4 or higher
- [Sqlite3](https://sqlite.org/)
- [Node.js](https://nodejs.org) v24 or higher
- [React](https://reactjs.org/) v19
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Bindizr](https://github.com/kweonminsung/bindizr)
