# Hestia Portal

Custom full-stack property management platform for **Hestia Real Estate Development** (Qatar): public site, tenant / staff / admin / owner portals, maintenance, leasing, check-in/out, and accounting. Replaces a Softr-based portal; you own the code and data.

## Documentation

| Document | Purpose |
| -------- | ------- |
| [PRD.md](PRD.md) | Product requirements and scope |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | **Stack, auth, DB, RBAC, folder layout** |
| [docs/scaffolding.md](docs/scaffolding.md) | **Where to put routes, server actions, queries** |
| [docs/features.md](docs/features.md) | Feature roadmap |
| [docs/data-model.md](docs/data-model.md) | Conceptual entities |
| [docs/workflows.md](docs/workflows.md) | User and system flows |
| [docs/ui-pages.md](docs/ui-pages.md) | Web routes |
| [docs/roles-permissions.md](docs/roles-permissions.md) | Roles and access |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | HTTP API surface (evolving) |
| [AGENTS.md](AGENTS.md) | Guide for agents working in this repo |
| [.cursor/rules/project-rules.mdc](.cursor/rules/project-rules.mdc) | Cursor project rules |

## Monorepo layout

- `apps/api` — Express REST API (`@hestia/api`)
- `apps/web` — Next.js App Router: marketing + all portals (`@hestia/web`)
- `apps/mobile` — Expo client (`@hestia/mobile`)
- `packages/types` — shared TypeScript types (`@hestia/types`)
- `packages/config` — shared public config (e.g. `NEXT_PUBLIC_API_URL`) (`@hestia/config`)
- `db` — SQL schema and seeds
- `infra` — local Docker and env templates
- `docs` — product and technical documentation

## Quick start

1. Install: `pnpm install` (from repo root; requires [pnpm](https://pnpm.io)).
2. Copy `infra/env/.env.example` to `.env` in `apps/api` and `apps/web` as needed.
3. Start Postgres: `docker compose -f infra/docker-compose.yml up -d`
4. Apply schema and seeds to the `property_ops` database (includes **`super_admin`** role and admin user roles):
   - **Greenfield:** `docker exec -i property_ops_postgres psql -U app_user -d property_ops < db/schema.sql`
   - **Upgrading an older DB:** apply `db/migrations/*.sql` in order (see [`db/MIGRATIONS.md`](db/MIGRATIONS.md)).
   - `docker exec -i property_ops_postgres psql -U app_user -d property_ops < db/seeds/seed_roles.sql`
   - `docker exec -i property_ops_postgres psql -U app_user -d property_ops < db/seeds/seed_admin_user.sql`
5. Configure **`apps/web/.env.local`** from `apps/web/.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_API_URL`).
6. (Optional CI) After migrations: `pnpm --filter @hestia/web db:validate` — verifies all Prisma-mapped tables exist.
7. Run: `pnpm dev:web` (port 3000). Optional: `pnpm dev:api` (port 4000) for the Express API — requires `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL` (see `apps/api/ENVIRONMENT.md`). Or `pnpm dev` for all.

**Stack (primary):** Next.js + Tailwind + shadcn-style UI + **Prisma** + **Auth.js** — see `docs/ARCHITECTURE.md`.

**Web routes:** marketing at `/`, **Auth.js login** at `/login`, portals under `/tenant/*`, `/staff/*`, `/admin/*`, `/owner/*` (see `docs/ui-pages.md`). The **legacy API playground** is at `/dev`.

## Principles

- **Active lease** is the primary operational pivot for tenant-scoped data.
- **API-first** — web and mobile use the same backend.
- **Role-aware** data access on every protected endpoint (see `docs/ARCHITECTURE.md`).
