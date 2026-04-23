# API modules (target structure)

Add one folder per domain as routes grow, for example:

- `buildings/`, `units/`, `leases/`, `tenants/`, `owners/`
- `maintenance/`, `tenantRequests/`, `checkin/`, `checkout/`
- `accounting/`, `announcements/`, `public/`

`main.ts` should only compose the Express app and register routers. Keep shared DB pool and auth helpers in `../lib/`.
