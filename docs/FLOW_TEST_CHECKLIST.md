# End-to-end flow test checklist

Apply database migrations **018** and **019** (and prior chain) before testing. From repo root with `DATABASE_URL` set:

1. Run `db/migrations/*.sql` in order through `019_unit_inventory_items.sql`.
2. From `apps/web`: `pnpm exec prisma generate`.

Then verify manually in the admin UI (logged in as admin):

## Phase 1 — Structure & forms

1. **Building** — Create and edit a building: structured address (city, zone, street, building number, optional area/notes), optional Google Maps URL, optional owner + contract type; single save on edit.
2. **Owner** — Open owner profile: account block + identity/documents + default contract type; upload QID or CR file; save profile.
3. **Unit** — Units list shows **cards** with image/labels; open a unit: Overview / Listing / Inventory / Visibility sections; listing uploads still work on listing tab.
4. **Tenant** — Edit tenant: account + profile (WhatsApp, QID, emergency contact); upload QID/passport file.
5. **Lease** — Create lease (unit + tenant required); edit lease: payment frequency, digital signature status, contract URLs + upload, cheque state/appointment/notes, onboarding checkboxes; cheque receipt panel still confirms tenant “marked delivered”.

## Phase 2 — Relationships

6. Create **two** `active` leases on the same unit with overlapping dates → expect **rejection** with overlap message.
7. Save a valid active lease → unit **status** becomes `occupied` (sync); end or deactivate coverage so unit becomes `available` where applicable.
8. **Public listings** — With no calendar-active lease and complete listing (title, description, price, cover), unit appears on `/listings`; with active lease, hidden.

## Phase 3 — Inventory

9. On unit **Inventory** section: **Copy from master** (requires master rows); add/delete structured inventory lines; confirm `/listings` and marketing paths do **not** expose these rows.

## Phase 4 — Owner contracts & finance

10. Create owner contract with schedule → generated **expenses** link contract + building/unit.
11. Manual expense entry may include **owner contract** link; `missing_financial_link` should not fire when only contract is set (with validation passing).

## Phase 5 — Regression

12. Tenant onboarding: sign contract → book/mark cheques → admin confirm receipt → check-in complete; lease booleans and tenant portal still behave.
13. Accounting: create receipt (linked) and expense (linked) as before.

Record pass/fail and any console/server errors for each step.
