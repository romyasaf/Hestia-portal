# Workflows

## Maintenance workflow

Tenant “action required” on the dashboard is driven only by states where the tenant must move the ticket forward (e.g. **Awaiting Tenant Approval**, **Awaiting Scheduling**). **Approved** is treated as an ops handoff, not a mandatory tenant action for that banner.

1. Tenant or admin creates ticket
2. Status = Pending Review
3. Admin reviews and either:
   - assigns to staff
   - rejects
   - requests quote
4. Staff reviews and submits quote/details if needed
5. Status may become Awaiting Admin Review
6. If tenant approval is needed, status = Awaiting Tenant Approval
7. Once approved, status = Awaiting Scheduling
8. Appointment is scheduled
9. Status = Scheduled
10. Staff performs work
11. Status = In Progress
12. Status = Completed

## Tenant request workflow (implementation)

Tenant-facing “requests” (renewal, transfer, handover) are stored as **`jobs`** rows with `source_type = tenant_request`, not a separate `tenant_requests` table.

1. Tenant submits a request from the portal → job created with status **`submitted`** (`request_kind` identifies renewal / transfer / handover).
2. Admin reviews in **Admin → Requests** → status typically moves to **`under_review`**.
3. Admin resolves the line → **`approved`**, **`rejected`**, **`completed`**, or tenant/admin may set **`cancelled`** per allowed transitions in `lib/tenant-requests/statuses.ts`.

**PRD wording vs stored status (informal mapping):**

| PRD-style phrase | Stored `jobs.status` |
|------------------|----------------------|
| Pending review | `submitted` |
| In process / under review | `under_review` |
| Approved | `approved` |
| Declined | `rejected` |
| Done | `completed` |
| Withdrawn | `cancelled` |

## Check-in workflow
1. Lease becomes active
2. Tenant sees check-in requirement
3. Tenant submits check-in form and inventory/condition confirmations
4. Issues logged as check-in issues
5. Admin reviews issues
6. Issues may be resolved directly or converted into maintenance workflow

## Checkout workflow
1. Tenant submits checkout request
2. Admin reviews and schedules inspection
3. Staff/admin performs inspection
4. Any deductions/issues are recorded if needed
5. Checkout completed and lease can move toward expired/terminated flow

## Lease renewal workflow
1. System detects renewal window start
2. Tenant sees renewal option on dashboard
3. Tenant submits renewal request
4. Admin reviews and processes
5. Lease status updated accordingly

## Sales leads and admin provisioning (target workflow)

This section records the **intended operating model** you described and how it maps to the **current codebase** (`apps/web`). It is the single reference for “who does what” until dedicated **sales / lead conversion** UI ships.

### Leads (sales: admin or staff)

- **Inbound leads** from the public site land in **`lead_inquiries`** (Admin → **Inquiries**).
- **Sales responsibility:** **Admin** always has access; **staff** access today is general staff portal rules — if only certain staff should work leads, add an explicit **`sales`** (or similar) role / assignment model in a future iteration.
- **Convert lead → relationship:** today this is a **manual admin sequence** (no one-click wizard yet):
  1. **Client** (contracting / B2B): create or reuse a **`users`** row, attach the **`client`** role (`user_roles`), then create **`jobs`** with `source_type = client_request` (or your agreed `source_type`) and `requester_user_id` = that client user.
  2. **Tenant:** use **Admin → Tenants → New** (`createTenantUser`) so the user gets the **`tenant`** role; then create a **`leases`** row linking **`tenant_user_id`** and **`unit_id`** when the lease is ready.
  3. **Owner:** ensure the user has the **`owner`** role, then create or update **`properties`** with **`owner_user_id`** pointing at that owner.

Close or annotate the **`lead_inquiries`** row (status / notes) when conversion is done so reporting stays clean.

### Admin: buildings, units, owners, leases, tenants, work

- **Buildings** = **`properties`** (`code`, `name`, address, optional **`owner_user_id`** linking the owner user).
- **Units** = **`units`** (belong to a property; **Admin → Units → New**).
- **Leases** = **`leases`** (link **`unit_id`** + **`tenant_user_id`**, rent, dates, status; **Admin → Leases → New**).
- **Work / jobs** = **`jobs`** (e.g. contracting / client work): `requester_user_id` = client (or internal requester), optional **`property_id`** / **`unit_id`**, `source_type` / `source_id` as you standardize. **Staff assignment:** maintenance-style work still flows through **`tickets`** with **`assigned_to_user_id`**; **`jobs`** today do **not** have a dedicated “assigned staff” column — if admins must pick a staff member per job in-product, plan a small schema + UI addition (assignee UUID on `jobs` or link to a ticket).

Together, this gives **one portal** (`/login`) for everyone; **admins** (and policy-defined **staff**) carry **sales** and **provisioning**; **roles** decide which area opens after sign-in.
