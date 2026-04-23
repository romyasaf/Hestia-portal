# Hestia Portal – Product Requirements Document

## Product overview
Build a full-stack web platform for Hestia Real Estate Development, replacing a Softr-based portal with a coded product fully owned by the business.

The platform must support:
1. Public company website
2. Tenant portal
3. Staff portal
4. Admin portal
5. Owner portal
6. Maintenance ticketing and scheduling
7. Leasing and tenant request workflows
8. Check-in and check-out workflows
9. Accounting, receipts, expenses, and dashboards
10. Role-based access and secure record visibility

The system must be designed so that the business owns the codebase, data structure, and deployment, without dependency on Softr.

## Business context
The company manages residential buildings and apartments in Qatar.
Core operations include:
- Annual leasing
- Maintenance requests
- Tenant communication
- Check-in/check-out inspections
- Receipt generation
- Expense tracking
- Owner visibility
- Staff task handling
- Rental and management inquiries

## Core user roles
1. Super Admin
2. Admin / Management
3. Staff / Maintenance team
4. Tenants
5. Owners
6. Public visitors / leads

## Main goals
- Replace Softr with a custom-coded platform
- Reduce recurring software dependency
- Create a scalable internal operating system
- Have proper workflows, permissions, dashboards, and automations
- Allow future expansion into accounting, CRM, contracting, and service operations

## Required modules

### A. Public website
- Home page
- About page
- Services page
- Buildings / properties page
- Contact page
- Inquiry forms
- SEO-friendly architecture
- Mobile responsive design

### B. Authentication and user accounts
- Email/password login
- Role-based access
- Profile management
- Password reset
- Secure session handling

### C. Tenant portal
- Dashboard
- My lease
- My unit
- My requests
- Maintenance requests
- Check-in status
- Check-out / handover requests
- Renewal / transfer / handover requests
- Receipts / payment records
- Announcements
- Appointment scheduling pages

### D. Staff portal
- Staff dashboard
- Assigned maintenance tickets
- Building-based task list
- Submit quote
- Update ticket status
- Upload photos
- Add internal cost notes
- Daily task visibility

### E. Admin portal
- Dashboard with KPIs
- Tenant management
- Lease management
- Unit management
- Building management
- Maintenance review
- Tenant requests review
- Check-in and check-out review
- Scheduling and status management
- Accounting review
- Announcements management

### F. Owner portal
- Building/unit overview
- Occupancy visibility
- Basic maintenance visibility
- Lease summary visibility
- Financial summary visibility depending on permission scope

### G. Leasing workflows
- Lead intake
- Rental inquiries
- Lease creation
- Active lease management
- Renewal window logic
- Expiry tracking
- Lease status management

### H. Maintenance workflows
- Ticket creation
- Admin review
- Assignment to staff
- Quote submission
- Tenant approval when needed
- Scheduling
- In progress / completed statuses
- Attachments and evidence
- Internal cost tracking
- Optional invoice/receipt generation

### I. Check-in / checkout workflows
- Check-in form
- Inventory tracking
- Condition issue logging
- Checkout request
- Inspection scheduling
- Damages / deductions workflow if needed

### J. Accounting and finance
- Receipt records
- Expense records
- Income/expense summary
- Payment status tracking
- PDF receipt generation
- Dashboard KPIs
- Category and subcategory reporting

## Non-negotiable business rules
- The "active lease" is the core relationship pivot for tenant-facing and unit-facing operational records.
- A tenant should see only records related to their current active lease unless explicitly allowed otherwise.
- Units should not permanently depend on a static tenant link when lease-based logic is more accurate.
- Maintenance, tenant requests, check-in, and checkout records should connect to the active lease when applicable.
- Dashboards should highlight action-required items based on status.
- Visibility must be role-based and strict.

## Desired statuses

### Maintenance statuses
- Pending Review
- Assigned to Staff
- Awaiting Admin Review
- Awaiting Tenant Approval
- Approved
- Awaiting Scheduling
- Scheduled
- In Progress
- Completed
- Cancelled
- Rejected

### Tenant request statuses
- Pending Review
- In Process
- Approved – Awaiting Appointment
- Appointment Scheduled
- Processing
- Completed
- Declined

### Lease statuses
- Draft
- Active
- Expired
- Terminated
- Renewal Pending

## Action-required logic
The system must calculate who currently needs to act on a record:
- Pending Review → Admin
- Assigned to Staff → Staff
- Awaiting Admin Review → Admin
- Awaiting Tenant Approval → Tenant
- Approved / Awaiting Scheduling → Tenant or Admin depending on workflow
- Scheduled → Staff on appointment day
- In Progress → Staff
- Completed / Cancelled / Rejected → No action required

## Technical expectations
- Build as a modern web application with clean architecture
- Strong role-based access control
- Audit-friendly data model
- Modular codebase
- API-first backend
- Production-ready deployment
- Ability to integrate later with calendar, email, payments, and document generation

## UX expectations
- Clean admin interface
- Mobile responsive tenant portal
- Dashboard-first experience
- Fast forms and easy status tracking
- Conditional visibility based on user role and record state

## Deliverables
Cursor should build this product in phases:
1. Architecture and scaffold
2. Auth and roles
3. Database schema
4. Admin core CRUD
5. Tenant portal
6. Staff portal
7. Owner portal
8. Maintenance workflows
9. Leasing workflows
10. Accounting workflows
11. Public website
12. Automations and polish
