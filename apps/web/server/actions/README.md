# `server/actions`

Domain **commands** and mutations: each file starts with `"use server"`.

Import `requireSession` / `requireRoles` from `@/server/auth/session`, then run Prisma inside `try/catch` and return discriminated unions for UI toasts.

Next files to add: `leases.ts`, `maintenance.ts`, `tenant-requests.ts`, …
