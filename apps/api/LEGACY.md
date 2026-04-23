# Standalone Express API (optional / legacy)

The **primary application surface** is now **`apps/web`**: Next.js route handlers, server actions, **Prisma**, and **Auth.js** (see `docs/ARCHITECTURE.md`).

This `apps/api` service remains useful for:

- Quick smoke tests against raw SQL + JWT (e.g. `/dev` playground calling `http://localhost:4000`).
- Temporary parity while mobile or external clients catch up on the same routes as the Next app.

Long term, business logic should live in **shared modules** consumed from `apps/web` only, and this service can be retired once all clients use the Next deployment.
