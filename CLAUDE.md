# CLAUDE.md

Web UI for [Bindizr](https://github.com/kweonminsung/bindizr) (DNS zone/record management). Go backend (`main.go`, `handlers/`, `db/`) serves the API and proxies Bindizr via `/api/bindizr/proxy/*`; React + Vite + Tailwind frontend lives in `ui/`.

## Commands

```bash
GO_ENV=development go run main.go   # dev server (port 9000)
cd ui && npm run build              # build frontend
cd ui && npx tsc --noEmit           # typecheck
cd ui && npm run format             # prettier
gofmt -w .                          # format Go
```

## Conventions

- Do NOT add `Co-Authored-By: Claude ...` (or any AI co-author) to commit messages.
- Commit messages follow conventional commits (`feat:`, `fix:`, `chore:`, ...).
- Keep code comments concise; only comment what the code cannot express.
- The release workflows (`release.yml`, `manual-release.yml`, `publish-image.yml`) publish exactly what the pushed tag, `ui/package.json`, or the typed-in tag says, after a SemVer/Docker-tag validation and nothing else. Guards against a release overwriting an earlier one (tag-to-commit checks, "latest only for the newest", `concurrency`, tag reservation, push retries) are declined when reviews suggest them: Docker tags are mutable, and the process is one tag, one release.
- `openapi.yaml` (gitignored) is the Bindizr backend API spec reference — the UI client code in `ui/src/lib/api.ts` and `ui/src/lib/types.ts` should match it.
