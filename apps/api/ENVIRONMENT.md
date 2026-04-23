# API environment variables

The Express API (`apps/api`) **exits on startup** if any required variable is missing or empty. There are **no default secrets** or default database URLs.

## Required

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string (same database as `apps/web` / `db/schema.sql`). |
| `JWT_ACCESS_SECRET` | Secret for signing short-lived access tokens (use a long random string; `openssl rand -base64 48`). |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (must differ from access secret). |

## Optional

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PORT` | `4000` | HTTP listen port. |

## Local development

1. Copy `infra/env/.env.example` or create `apps/api/.env` with the three required variables set.
2. Run `pnpm --filter @hestia/api dev` (uses `tsx` and loads env from your shell or `.env` if you use a loader).

Production deployments must inject the required variables via the platform secret manager—never commit real secrets.
