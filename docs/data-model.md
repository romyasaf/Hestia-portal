# Data Model

## Core entities

### Users
Fields:
- id
- full_name
- email
- phone
- password_hash
- role (super_admin, admin, staff, tenant, owner)
- is_active
- created_at
- updated_at

### Buildings
Fields:
- id
- name
- code
- address
- location_notes
- description
- is_active
- created_at
- updated_at

### Units
Fields:
- id
- building_id
- unit_number
- floor
- type
- bedrooms
- bathrooms
- area_sqm
- furnishing_status
- status (available, occupied, reserved, maintenance, inactive)
- created_at
- updated_at

### Owners
Fields:
- id
- user_id or contact structure
- company_name if applicable
- notes

### OwnerUnits / OwnerBuildings
Fields:
- id
- owner_id
- building_id and/or unit_id
- access_scope

### Tenants
Fields:
- id
- user_id
- qid_or_id_number
- nationality
- emergency_contact
- notes

### Leases
Fields:
- id
- building_id
- unit_id
- tenant_id
- start_date
- end_date
- rent_amount
- deposit_amount
- payment_frequency
- status — **canonical lowercase only:** `draft`, `active`, `expired`, `terminated`, `renewal_pending` (DB CHECK + app normalization)
- signed_date
- renewal_window_start
- renewal_deadline
- terms_accepted
- checkin_completed
- created_at
- updated_at

### MaintenanceTickets
Fields:
- id
- ticket_number
- building_id
- unit_id
- lease_id nullable
- tenant_id nullable
- created_by_user_id
- assigned_staff_id nullable
- category
- priority
- description
- permission_to_enter_if_tenant_not_home
- quoted_amount nullable
- quote_description nullable
- internal_cost nullable
- approval_needed boolean
- status
- appointment_at nullable
- completed_at nullable
- created_at
- updated_at

### MaintenanceAttachments
Fields:
- id
- maintenance_ticket_id
- file_url
- file_type
- uploaded_by_user_id
- created_at

### Tenant requests (implemented as Jobs)

There is **no** separate `tenant_requests` table in the shipped schema. Renewal / transfer / handover flows use **`jobs`** with:

- `source_type` = `tenant_request` (see `lib/tenant-requests/constants.ts`)
- `request_kind` = `renewal` | `transfer` | `handover`
- `requester_user_id` → tenant user
- `property_id` / `unit_id` optional context
- `status` = `submitted` | `under_review` | `approved` | `rejected` | `completed` | `cancelled` (lowercase; see `lib/tenant-requests/statuses.ts`)

See `docs/workflows.md` for the PRD-to-status mapping.

### CheckIns
Fields:
- id
- lease_id
- tenant_id
- submitted_at
- status
- notes

### CheckInIssues
Fields:
- id
- checkin_id
- category
- description
- photo_url
- severity
- resolved_status

### UnitInventory
Fields:
- id
- unit_id
- item_name
- category
- quantity
- condition_status
- notes

### CheckoutRequests
Fields:
- id
- lease_id
- tenant_id
- preferred_date
- appointment_at nullable
- status
- notes

### Announcements
Fields:
- id
- title
- body
- audience_type (all, tenants, staff, owners, building_specific)
- building_id nullable
- is_published
- published_at

### Expenses
Fields:
- id
- expense_number
- date
- amount
- category
- subcategory
- supplier_name
- description
- payment_method
- paid_by
- building_id nullable
- unit_id nullable
- maintenance_ticket_id nullable
- checkout_request_id nullable
- created_at
- updated_at

### Receipts
Fields:
- id
- receipt_number
- date
- amount
- payment_method
- payment_status
- source_type
- related_record_id
- lease_id nullable
- tenant_id nullable
- description
- pdf_url nullable
- created_at
- updated_at

## Key relationship rules
- Active lease is central.
- Tenant dashboard should pull current operational data mainly through the active lease.
- A maintenance ticket may exist with or without a lease, but lease linkage should be used when relevant.
- Unit inventory belongs to the unit, not directly to tenant.
- Owner visibility should be scoped by owner-building or owner-unit relationships.

## Derived logic needed
- active lease lookup by tenant
- renewal window status
- action required by
- occupancy summary
- outstanding task counts
- income and expense KPIs
