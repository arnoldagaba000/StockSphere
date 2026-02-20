# Stock Sphere IMS

Stock Sphere is a full-stack Inventory Management System (IMS) for running day-to-day warehouse and order operations: product master data, stock control, procurement, sales fulfillment, approvals, reporting, mobile warehouse flows, and system administration.

## Purpose

This application is designed to help teams:
- Maintain accurate stock visibility across warehouses and locations.
- Track inventory with batch, serial, and expiry support.
- Run purchase and sales order workflows with approvals.
- Assemble/disassemble kits (BOM-based inventory handling).
- Monitor operations via dashboard metrics and reports.
- Enforce role-based access control (RBAC) and auditability.

## Implemented Functionality

### 1. Authentication and Access Control
- Email/password login and Google OAuth via Better Auth.
- Session handling and protected dashboard routes.
- Role-based permission checks across server functions.
- User profile and security settings.
- Admin user-management support (role-governed).

### 2. Master Data Management
- Products: create/update/delete, pricing, tracking flags, media, variants, supplier links.
- Categories: hierarchical category management.
- Warehouses and locations: create/update/deactivate with operational use in stock flows.
- Suppliers and customers: create/update/list with status handling.

### 3. Inventory Operations
- Stock overview and movement visibility.
- Stock adjustment workflows (including approval/rejection paths).
- Stock transfers between warehouse/location buckets.
- Quarantine and expiry-oriented inventory flows.
- Cycle counting and initial stock entry support.
- Batch traceability and serial history retrieval.

### 4. Procurement and Receiving
- Purchase orders: draft, submit, approve/reject, mark ordered, cancel.
- Goods receipts: receive and post inventory updates.
- Supplier-linked procurement support.

### 5. Sales and Fulfillment
- Sales order lifecycle: create draft, confirm, ship, deliver, cancel.
- Draft update/delete support.
- Customer-linked sales workflow with shipment progression.

### 6. Kits and Assembly
- Kit BOM management.
- Kit assembly/disassembly operations.
- Kit genealogy / component relationships.

### 7. Approvals and Audit
- Approval inbox for pending operational decisions.
- Activity log and audit-related route support.

### 8. Reporting and Analytics
- Dashboard KPIs with 5-minute cache strategy.
- Stock valuation report generation.
- Stock movement report (JSON/CSV).
- Aging/dead-stock analytics.
- Stock snapshot generation for trend reporting.

### 9. Dashboard UX and Search
- Redesigned dashboard with KPI cards, trend visuals, distribution chart, queue health, and quick actions.
- Recharts-based visualizations on the dashboard.
- Color-coded positive/negative trend values with directional icons.
- Global command-style navbar search (`Ctrl/Cmd + K`):
  - Fast route navigation.
  - Entity search across products, categories, customers, suppliers, purchase orders, and sales orders (permission-aware).

### 10. Mobile Operations
- Dedicated mobile routes for receive, pick, and transfer workflows.
- Sidebar/mobile navigation behavior improvements for operation continuity.

## Tech Stack

- Runtime/Tooling: Bun, Vite, TypeScript
- Frontend: React 19, TanStack Router, TanStack Start
- Data/State: TanStack Query, TanStack Form, TanStack Table
- Auth: Better Auth
- Database: PostgreSQL + Prisma ORM
- UI: Tailwind CSS v4, shadcn/ui primitives, Lucide icons
- Charts: Recharts
- Quality: Ultracite (Biome-powered linting/formatting)

## Architecture Notes

- File-based routing under `src/routes`.
- Server operations implemented as TanStack Start server functions under `src/features/**`.
- RBAC checks performed server-side using permission constants and authorization helpers.
- Query caching is used for dashboard and list workloads where eventual consistency is acceptable.

## Getting Started

### Prerequisites
- Bun installed
- PostgreSQL running and reachable

### 1) Install dependencies

```bash
bun install
```

### 2) Configure environment

Copy `.env.example` to `.env.local` and fill values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
SUPER_ADMIN_EMAIL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_SECURE=false
```

Important:
- `BETTER_AUTH_URL` must match the URL you use to access the app (e.g., `http://localhost:3000` or your LAN host URL), otherwise auth callback validation can fail.

### 3) Prepare database

```bash
bun run db:generate
bun run db:migrate
```

### 4) Run development server

```bash
bun run dev
```

App default: `http://localhost:3000`

## Scripts

- `bun run dev` - Start dev server
- `bun run build` - Build production assets
- `bun run preview` - Preview production build
- `bun run test` - Run tests
- `bun run db:generate` - Generate Prisma client
- `bun run db:migrate` - Run Prisma migrations
- `bun run db:push` - Push schema to DB
- `bun run db:studio` - Open Prisma Studio
- `bun run db:seed` - Seed DB (if seed pipeline is configured)
- `bun run db:reset` - Reset database/migrations
- `bun run check` - Lint/format checks
- `bun run fix` - Auto-fix lint/format issues

## Project Structure

- `src/routes` - Route-level pages/layouts (`/_auth`, `/_dashboard`, etc.)
- `src/features` - Domain server functions and business logic
- `src/components` - Shared UI and layout components
- `src/lib/auth` - Auth client/server setup and authorization helpers
- `prisma/schema.prisma` - Data model and relations
- `StockSphere_Sprint_Guide.pdf` - Sprint and feature reference

## Current Status

- Core IMS functionality across operations, approvals, reporting, and admin settings is implemented.
- PWA hardening/installability was intentionally deferred to a later phase.
- Full end-to-end and broader QA sweep is planned as a dedicated testing phase.
