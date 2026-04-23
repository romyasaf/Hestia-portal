# API Contract (MVP v1)

## Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /me`

## Users and Roles

- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `POST /users/:id/roles`

## Properties and Units

- `GET /properties`
- `POST /properties`
- `GET /units`
- `POST /units`

## Leases

- `GET /leases`
- `POST /leases`

## Tickets

- `GET /tickets`
- `POST /tickets`
- `PATCH /tickets/:id/status`
- `PATCH /tickets/:id/assign`

## Jobs

- `GET /jobs`
- `POST /jobs`
- `POST /jobs/:id/estimate`
- `POST /jobs/:id/approve`

## Accounting

- `POST /invoices`
- `POST /payments`
- `POST /expenses`
- `GET /reports/pnl`

## Inventory

- `GET /inventory/items`
- `POST /inventory/items`
- `POST /inventory/transactions`

## Notifications

- `POST /notifications/whatsapp`
