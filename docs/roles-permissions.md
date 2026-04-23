# Roles and Permissions

## Super Admin
- Full access to all modules and settings

## Admin
- **Provisioning:** Administrators create user accounts and assign **roles / permissions** (`user_roles` in the database). End users sign in at the single **Hestia Portal** login (`/login`) and are routed to the correct portal (admin, staff, owner, tenant) from their role list. **Admin → Tenants** provisions tenant users; **Admin → Staff** creates staff users and stores **portal permissions** in `staff_permission_grants` (dashboard, maintenance tickets, announcements). Staff accounts with **no** grant rows keep **legacy full** staff portal access until an admin saves permissions for them.
- Full operational access to buildings, units, leases, tenants, tickets, requests, check-ins, checkout requests, receipts, expenses, and announcements
- Can assign staff
- Can manage statuses
- Can view dashboards and reports

## Staff
- Can view assigned maintenance tickets
- Can update allowed ticket statuses
- Can upload photos
- Can submit quote details
- Can add internal notes/costs if allowed
- Cannot access unrelated tenant financial data unless explicitly granted

## Tenant
- Can view own dashboard
- Can view only own active lease and related unit details
- Can create maintenance tickets
- Can create tenant requests
- Can view own appointments, announcements, check-in / checkout records, and own receipts

## Owner
- Can view only owned or assigned buildings/units
- Can view limited occupancy and operational information
- Can view financial summaries only if enabled

## Public user
- Can access marketing site
- Can submit inquiry forms only
