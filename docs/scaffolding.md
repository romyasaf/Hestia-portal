# Scaffolding map (Hestia Portal)

Where new code should live in **`apps/web`**. Keep business rules server-side; UI stays thin.

## Routes (App Router)

| Area | Path prefix | `app/` location |
|------|----------------|-----------------|
| Marketing | `/`, `/about`, … | `app/(site)/` |
| Auth | `/login`, … | `app/(auth)/` |
| Tenant | `/tenant/*` | `app/tenant/` |
| Staff | `/staff/*` | `app/staff/` |
| Admin | `/admin/*` | `app/admin/` |
| Owner | `/owner/*` | `app/owner/` |
| Auth.js | `/api/auth/*` | `app/api/auth/[...nextauth]/` |
| Health | `/api/health` | `app/api/health/` |

## Server-only code (`server/`)

| Folder | Purpose |
|--------|---------|
| `server/auth/` | Session helpers (`requireSession`, role guards) wrapping `auth()`. |
| `server/actions/` | **`"use server"`** mutations and commands (one file per domain when they grow). |
| `server/queries/` | Read models / Prisma reads (no `"use server"` unless re-exported as actions). |

Add domain subfolders as features land, for example `server/queries/leases.ts`, `server/actions/maintenance.ts`.

## Shared UI

| Folder | Purpose |
|--------|---------|
| `components/ui/` | shadcn-style primitives (`button`, …). |
| `components/portal/` | Shared chrome for logged-in portals (headers, nav shells). |
| `components/scaffold/` | Placeholder pages until real screens ship. |

## Infra / data

| Path | Purpose |
|------|---------|
| `apps/web/prisma/` | Schema + migrations (eventually owns DB evolution). |
| `db/` (repo root) | Bootstrap SQL + seeds until Prisma migrations replace the flow. |

## Middleware vs server actions

- **`middleware.ts`** — coarse auth + portal role (JWT only; no Prisma).
- **Server actions / route handlers** — Prisma + **lease / assignment** checks on every sensitive read/write.

## Related

- [ARCHITECTURE.md](ARCHITECTURE.md) · [ui-pages.md](ui-pages.md) · [AGENTS.md](../AGENTS.md)
