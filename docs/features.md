# Features (MVP roadmap)

This document lists product capabilities. Implementation order in code may differ; see PRD and API contract.

## Foundation

- Authentication (login, refresh, session/me).
- User management; multiple roles per user; role scoping as defined in [roles-permissions.md](roles-permissions.md).

## Property operations

- Properties and units: CRUD, basic attributes, ownership/assignment for reporting scope.
- Leases: create and link to units; key dates and parties.

## Work management

- **Tickets** — maintenance/service requests: create, status, assign (tenant/staff flows).
- **Jobs** — contracting work: create, estimate, approval, status through completion; link to clients and properties as applicable.

## Financial

- Invoices, payments, expenses; P&L-oriented reporting (see [data-model.md](data-model.md) for entity relationships).
- Map operational events to accounting entries where the product model supports it (see [workflows.md](workflows.md)).

## Supply & assets

- Inventory: transactions; tie to jobs/tickets or expenses as designed.

## Cross-cutting

- Notifications (email/push) — phased by release.
- Audit log for sensitive actions — incremental.

## Related

- [PRD.md](../PRD.md)  
- [API_CONTRACT.md](API_CONTRACT.md)  
- [ui-pages.md](ui-pages.md)
