# `server/queries`

Read-only Prisma access and shaping for RSC / server actions.

Suggested files (add as you implement):

- `leases.ts` — **`getActiveLeaseForTenant`** (active + in-range); extend with admin lists as needed.
- `tenant-dashboard.ts` — **`getTenantDashboardData`**: lease-scoped tickets (opened by tenant on lease unit), tenant-raised jobs as “requests”, and **action-required** items from statuses.
- `maintenance.ts` — tickets scoped by role.
- `properties.ts` — buildings/units (rename to `buildings.ts` when schema matches PRD).

Keep exports **pure** (no `"use server"` here). Call from `server/actions/*` or directly from `app/**/page.tsx` server components.
