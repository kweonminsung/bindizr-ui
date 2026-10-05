# Bindizr UI

<p>
    <a href="https://github.com/kweonminsung/bindizr-ui/actions/workflows/ci.yml">
        <img src="https://github.com/kweonminsung/bindizr-ui/actions/workflows/ci.yml/badge.svg" />
    </a>
    <a href="https://github.com/netbirdio/netbird/blob/main/LICENSE">
        <img src="https://img.shields.io/badge/license-Apache 2.0-blue" />
    </a>
    <a href="https://github.com/kweonminsung/bindizr/releases/tag/v0.1.0-rc.2">
        <img src="https://img.shields.io/badge/Compatible-0.1.0--rc.2-success" />
    </a>
</p>

A web interface for managing DNS zones, records, DNSSEC, and access permissions with [Bindizr](https://github.com/kweonminsung/bindizr).

[Features](#features) · [Run with Docker](#run-with-docker) · [Getting Started](#getting-started)

<img src="public/screenshots/zones.png" alt="Zone list with DNSSEC and disabled badges, search, filters, and record, import, and export actions" width="1000" />

## Features

Screenshots show a running instance with example data.

### Zone and record management

Create and edit zones and records, configure SOA settings and TTLs, and inspect generated DNSSEC records. Search, filter, and sort listings by zone, record type, and other fields.

<img src="public/screenshots/records.png" alt="Records for example.com, including IPv4, IPv6, mail, TXT, and alias records, with zone and type filters" width="1000" />

### Zone import and export

Import BIND zone files or transfer records over AXFR using **append**, **upsert**, or **replace**, with dry-run validation. Copy or download exports, optionally including DNSSEC records.

<img src="public/screenshots/import-preview.png" alt="A dry-run zone import validating three new records without applying changes" width="512" />

### Version history and rollback

Review changes by SOA serial and author, compare record differences, and preview rollbacks. Restoring a version advances the serial for secondary synchronization.

<img src="public/screenshots/version-diff.png" alt="Version comparison showing an updated API address, an added docs alias, and a removed legacy record" width="768" />

### DNSSEC signing and policies

Apply reusable signing policies, monitor signatures, and manage key rollovers. Copy DS records for the parent zone, check their publication, or trigger re-signing.

<img src="public/screenshots/dnssec.png" alt="DNSSEC status for example.com with signature counts, expiry, next re-signing time, and a DS record to copy" width="768" />

### Roles, API tokens and zone permissions

Group permissions into roles: grant actions such as `record:create` or `zone:transfer` in one zone or all zones, narrowing record actions by record-name pattern and record type. API tokens, with optional expiry, act under the role they are created in.

<img src="public/screenshots/role-grants.png" alt="A deployment role with record permissions scoped to example.com and dev.example.com, held by one API token" width="768" />

### TSIG keys for updates and transfers

Generate or import TSIG keys for dynamic updates or zone transfers, each acting under a role, and reveal or copy existing secrets when needed.

<img src="public/screenshots/tsig-key-role.png" alt="A TSIG key with its secret masked and permissions inherited from the zone-transfers role" width="768" />

### Secondaries

Register the servers Bindizr feeds by name and address. Pause one without forgetting it, and pick a TSIG key to sign the NOTIFY it receives.

<img src="public/screenshots/secondaries.png" alt="Secondary list: one server signing NOTIFY under a TSIG key, one registered by hostname, and a disabled standby" width="1000" />

### Secondary synchronization

Check secondary serials and reachability. Send DNS NOTIFY for one or all zones, optionally bumping the serial to trigger a transfer.

## Run with Docker

```bash
$ docker run -d --name bindizr-ui -p 9000:9000 kweonminsung/bindizr-ui:0.1.0-rc.2
```

Or with Docker Compose:

```bash
$ docker compose up -d
```

Then open <http://localhost:9000>.

Run Bindizr separately. Enter its URL as reachable from the UI server, provide an API token if required, and test the connection. Optionally create a UI admin account.

A `v*` tag, or the Manual Release workflow, builds and pushes the amd64 and
arm64 image; the Publish Image workflow pushes it under a tag you enter. To
push it from your own machine instead (the tag defaults to the version in
`ui/package.json`; `IMAGE` overrides the repository):

```bash
$ ./scripts/build_image.sh
```

## Getting Started

1. **Build and install dependencies:**

   ```bash
   # Install Go dependencies
   $ go mod download

   # Install Node.js dependencies
   $ cd ui
   $ npm install
   ```

2. **Start development server:**

   ```bash
   # Start dev server(default port: 9000)
   $ GO_ENV=development go run main.go
   ```

## Dependencies

- [Go](https://golang.org/) v1.26 or higher
- [Sqlite3](https://sqlite.org/)
- [Node.js](https://nodejs.org) v20 or higher
- [React](https://reactjs.org/) v19
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Bindizr](https://github.com/kweonminsung/bindizr)
