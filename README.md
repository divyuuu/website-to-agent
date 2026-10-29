# Website-to-Agent MCP Bridge

Author: divyuuu

Turn an existing website into a small set of reliable, permission-aware tools that AI agents can call through the Model Context Protocol (MCP), without rebuilding the website.

## Status

Phase 0 — Foundation. See `phases/00-overview.md` for phase memory.

## Quick start

```sh
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Other commands:

```sh
pnpm test
pnpm lint
pnpm typecheck
```

## Database

SQLite file at `DATABASE_PATH` (default `./data/app.db`). Never committed. Schema lives in `packages/database/migrations/`.

## Structure

- `apps/api` — Admin REST API, health/readiness
- `packages/config` — typed env parsing
- `packages/contracts` — shared Zod schemas
- `packages/database` — SQLite migrations + tenant-scoped queries
- `phases/` — phase-wise build memory, source of truth for progress
- `infra/` — local container config

## License

MIT — (c) divyuuu. See LICENSE.
