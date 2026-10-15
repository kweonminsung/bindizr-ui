# CLAUDE.md

Web UI for [Bindizr](https://github.com/kweonminsung/bindizr) (DNS zone/record management). Go backend (`main.go`, `handlers/`, `db/`) serves the API and proxies Bindizr via `/api/bindizr/proxy/*`; React + Vite + Tailwind frontend lives in `ui/`.

## Commands

```bash
GO_ENV=development go run main.go   # dev server (port 9000)
cd ui && npm run build              # build frontend
cd ui && npm run typecheck          # typecheck
cd ui && npm test                   # frontend tests
go test ./...                      # Go tests
cd ui && npm run format             # prettier
gofmt -w .                          # format Go
```

## Conventions

- Do NOT add `Co-Authored-By: Claude ...` (or any AI co-author) to commit messages.
- Commit messages follow conventional commits (`feat:`, `fix:`, `chore:`, ...).
- Keep code comments concise; only comment what the code cannot express.
- A listing draws only the rows of the request on screen: it keeps the request (filter, page, sort) beside its rows and shows Loading, never the previous request's rows, while another is in flight, so no action lands on a row the screen no longer describes. A filtered listing keeps its filters on screen through an error, so a rejected one stays correctable.
- The release workflows (`release.yml`, `manual-release.yml`, `publish-image.yml`) publish exactly what the pushed tag, `ui/package.json`, or the typed-in tag says, after a SemVer/Docker-tag validation and nothing else. Guards against a release overwriting an earlier one (tag-to-commit checks, "latest only for the newest", `concurrency`, tag reservation, push retries) are declined when reviews suggest them: Docker tags are mutable, and the process is one tag, one release.
- `openapi.yaml` (gitignored) is the Bindizr backend API spec reference — the UI client code in `ui/src/lib/api.ts` and `ui/src/lib/types.ts` should match it.

## Tests

- Name cases `<subject> <expected behavior> [when <condition>]`: identify the operation and its observable result with `accepts`, `rejects`, `preserves`, `returns`, or another precise verb. JavaScript uses natural-language titles; Go uses the required `Test` prefix with the same structure in PascalCase.
- Avoid filler `test`/`verify`, leading articles, and vague results such as `works`, `success`, or `lifecycle` alone. Keep actual operation names intact. Helpers are named for their responsibility, not as test cases.
- Use Node's built-in test runner for pure frontend logic. Test behavior and meaningful boundaries; merge only cases with equivalent setup, action, and assertions. Keep unit and integration tests that exercise different boundaries.
