# Hestia Portal — technical architecture

Living document for stack, boundaries, and RBAC. Update when technology or deployment assumptions change.

## 1. Preferred stack (locked in for `apps/web`)

| Layer | Choice | Why |
| --- | --- | --- |
| **Framework** | **Next.js** (App Router) + **TypeScript** | One deployable for marketing + tenant/staff/admin/owner portals, SEO, server components, and **route handlers / server actions** as the primary API. |
| **UI** | **Tailwind CSS** + **shadcn/ui** (Radix + CVA) | Fast iteration, accessible primitives, consistent design system; components live in-repo (no vendor UI lock-in). |
| **Data** | **PostgreSQL** + **Prisma** | Typed queries; canonical DDL in `db/schema.sql` with incremental SQL under `db/migrations/` (see [`db/MIGRATIONS.md`](../db/MIGRATIONS.md)). `apps/web/prisma/schema.prisma` mirrors the applied database. Validate required `public` tables in CI with `pnpm --filter @hestia/web db:validate` (not on Next boot — avoids Prisma/instrumentation bundling issues). |
| **Auth** | **Auth.js** (NextAuth v5) with **JWT sessions** + **Credentials** | **Self-hosted**: you own users, roles, and session rules in your DB—best fit for **strict RBAC** and lease-scoped visibility. **Clerk** is intentionally not default: hosted identity is harder to replicate on-prem and couples RBAC to a third party. |
| **Uploads** | **S3-compatible** storage behind a small `lib/storage` interface | Swap vendor (AWS / Cloudflare R2 / MinIO) without touching domain code. |
| **PDFs** | **Server-side** generation (e.g. `@react-pdf/renderer` or `pdf-lib`) | Receipts and statements without a headless browser on serverless unless you choose a worker. |
| **Deploy** | **Vercel** (or any Node host) for `apps/web` + **managed Postgres** + **external object storage** | Vercel is practical for Next; **database and files stay portable**—moving off Vercel is a config + build target change, not a rewrite. |
| **Mobile** | **Expo** (`apps/mobile`) | Same API contracts; can adopt Auth.js session cookie patterns or token bridge later. |

### Optional / legacy

- **`apps/api` (Express)** — kept for the `/dev` playground and gradual migration; **not** the primary architecture (see `apps/api/LEGACY.md`). **Requires** `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` at process start (`apps/api/ENVIRONMENT.md`).

---

## 2. Monorepo layout

```text
apps/web/                 # Primary product: Next + Prisma + Auth.js
  app/                    # Routes: (site), (auth), tenant/, staff/, admin/, owner/
  prisma/schema.prisma    # ORM schema (mirrors db/schema.sql)
  auth.ts                 # Auth.js config (Edge-safe: Prisma only inside authorize)
  lib/prisma.ts           # Prisma singleton
  lib/rbac.ts             # Coarse portal access helpers
  lib/storage/            # S3-compatible abstraction
  lib/pdf/                # Receipt / document PDF helpers

apps/api/                 # Optional Express API (legacy / dev)

packages/types/           # Shared TS types for mobile / scripts
packages/config/          # Shared public config

db/                       # SQL bootstrap + seeds (until Prisma migrations replace)
docs/                     # PRD, workflows, data model, this file
infra/                    # Docker, env templates
```

---

## 3. Database and auth

- **PostgreSQL** is the system of record; **active lease** is the pivot for tenant-scoped rows (see `docs/data-model.md`).
- **Prisma** is the default access path from `apps/web` (server actions + route handlers).
- **Passwords** today use **`pgcrypto` `crypt()`** in SQL; the Auth.js `authorize` callback uses `$queryRaw` so existing seed users keep working. You may later standardize on **bcrypt/argon2** in application code and migrate hashes once.
- **Sessions:** JWT strategy keeps **middleware Edge-compatible** (no Prisma in middleware bundle). **Row-level authorization** still happens in server code with Prisma + explicit lease/staff/owner filters—never trust JWT roles alone for data access.

### Environment (web)

See `apps/web/.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_API_URL`.

---

## 4. Role-based access control (RBAC)

### Data model

- **`users`**, **`roles`**, **`user_roles`** — users may have multiple roles.

### Layers

1. **Middleware** (`apps/web/middleware.ts`) — **coarse**: `getToken` from `next-auth/jwt` (Edge-safe, no Prisma) checks session + portal role via `lib/rbac.ts`. Redirects to `/login` when missing or insufficient. Requires **`AUTH_SECRET`** at build/runtime for JWT verification.
2. **Server actions / route handlers** — **fine**: enforce **active lease**, ticket assignment, owner building links, etc., on every mutation and sensitive read.
3. **UI** — hide nav items for UX only; **never** the sole enforcement.

### Portal mapping (coarse)

| Prefix | Allowed roles (includes admin-like for operations preview) |
| --- | --- |
| `/tenant/*` | `tenant`, `admin`, `super_admin` |
| `/staff/*` | `staff`, `admin`, `super_admin` |
| `/admin/*` | `admin`, `super_admin` |
| `/owner/*` | `owner`, `admin`, `super_admin` |

Tighten admin-like access on tenant routes if you want strict separation (e.g. impersonation flag only).

---

## 5. Vendor portability checklist

| Concern | Mitigation |
| --- | --- |
| **Host** | Next app is standard Node output; Dockerfile or `next build` + `next start` works outside Vercel. |
| **Auth** | Auth.js + your Postgres = no Clerk dependency; optional OAuth providers are swappable plugins. |
| **Files** | `lib/storage/object-storage.ts` interface; implement with AWS SDK, MinIO, etc. |
| **PDF** | Library choice isolated under `lib/pdf/`. |

---

## 6. Implementation status

- [x] Tailwind + shadcn-style `Button` + `components.json`
- [x] Prisma schema mirroring `db/schema.sql`
- [x] Auth.js credentials + JWT + role claims in session
- [x] RBAC-aware `middleware.ts` (JWT via `getToken`)
- [x] S3 + PDF stubs with clear extension points
- [x] **`server/` scaffold** — `server/auth/session.ts`, `server/actions/example.ts`, `server/queries/`, `components/portal/PortalShell.tsx`, `GET /api/health` ([scaffolding.md](scaffolding.md))
- [ ] Prisma migrations as source of truth (replace raw `db/` apply flow)
- [ ] Server actions for domain modules + retire Express where redundant
- [ ] `super_admin` seed + stricter tenant-only middleware if required

## Related

- [scaffolding.md](scaffolding.md) — `apps/web` folder map and conventions  
- [PRD.md](../PRD.md) · [AGENTS.md](../AGENTS.md) · [data-model.md](data-model.md) · [roles-permissions.md](roles-permissions.md)
