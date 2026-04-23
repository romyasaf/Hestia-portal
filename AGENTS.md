# AGENTS.md

## Project identity
This project is Hestia Portal, a custom-coded replacement for an existing Softr-based property management and tenant portal system.

## What the app must do
The application combines:
- public website
- tenant portal
- staff portal
- admin portal
- owner portal
- leasing workflows
- maintenance workflows
- check-in / checkout workflows
- accounting and receipt workflows

## Business logic priorities
1. Active lease is the main operational relationship.
2. Tenant data access must be restricted to their own active lease.
3. Dashboards should show action-required records.
4. All workflows must be status-driven.
5. The system must support future automation with email, calendar, PDF generation, and payments.

## Recommended implementation order
1. Project scaffold
2. Authentication and RBAC
3. Database schema
4. Seed data
5. Admin core module
6. Tenant dashboard and lease module
7. Maintenance module
8. Tenant requests module
9. Check-in / checkout module
10. Accounting module
11. Owner portal
12. Public site polish

## Documentation protocol
Before changing schema or workflows:
- update docs/data-model.md
- update docs/workflows.md
- update docs/roles-permissions.md if access rules change

## Important
Prefer reliable, boring, maintainable architecture over clever shortcuts.
