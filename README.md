# Stock Sphere IMS

Stock Sphere is a full-stack inventory and operations platform for managing products, stock, purchasing, sales fulfillment, approvals, kits, reporting, and system administration.

Built with TanStack Start + React + Bun, it is designed for multi-role warehouse and operations teams.

## Purpose

Use Stock Sphere to:
- maintain a clean product and category catalog
- manage warehouses, locations, and stock buckets
- receive goods, transfer stock, and perform controlled adjustments
- run purchase and sales order workflows
- enforce approvals and role-based controls
- trace inventory with batch/expiry/serial tracking
- monitor operations through dashboards and reports

## Core Capabilities

### Authentication and Access Control
- Email/password authentication
- OAuth support (Google)
- Role-based access control (`VIEWER`, `STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`)
- Route and action protection based on permissions

### Master Data
- Product management (pricing, tracking settings, variants, supplier links)
- Category hierarchy (parent/child categories + category analytics)
- Supplier and customer management
- Warehouse and location management

### Inventory Operations
- Initial stock creation
- Goods receipt processing
- Stock transfers between warehouses/locations
- Stock adjustments (with approval path where configured)
- Quarantine and expiry management
- Batch traceability and serial history views

### Purchasing
- Purchase order lifecycle (`DRAFT` → `SUBMITTED` → `APPROVED/REJECTED` → `ORDERED` → `RECEIVED`)
- Supplier performance and purchasing analytics
- Supplier-product cost and lead-time linking

### Sales and Fulfillment
- Sales order creation and draft editing
- Order confirmation, shipment posting, and delivery updates
- Stock bucket selection during shipment

### Approvals and Governance
- Approval workflows for controlled operations
- Activity/audit logging for sensitive changes
- Archiving and operational record controls

### Kits and Assemblies
- Bill of materials (BOM) management
- Kit assembly/disassembly
- Kit genealogy and traceability

### Reports and Dashboard
- Operational dashboard (KPIs, queue pressure, trend visuals)
- Inventory valuation and aging analysis
- Movement and stock reports
- Snapshot-driven dashboard metrics with caching

### System Configuration
- Company profile and financial defaults
- Numbering/prefix settings
- Import/export system settings

## Navigation Areas

Primary dashboard modules include:
- Dashboard
- Products
- Categories
- Warehouses
- Locations
- Stock
- Purchasing / Purchase Orders / Goods Receipts
- Sales Orders
- Approvals
- Kits
- Reports
- Settings
- Mobile Ops (as implemented for current sprint scope)

## Technology Stack

- Runtime: Bun
- Frontend: React 19 + TanStack Router/Start + Vite
- Data layer: Prisma + PostgreSQL
- Auth: Better Auth
- UI: Tailwind CSS v4 + shadcn/ui
- Validation: Zod
- Quality tooling: Ultracite (Biome-based)

## Project Structure

- `src/routes` - route modules (dashboard, operations, settings, auth)
- `src/features` - server-side business logic per domain
- `src/components` - reusable UI and feature components
- `src/lib` - cross-cutting app libraries (auth, utilities)
- `src/middleware` - request/session middleware
- `prisma/schema.prisma` - database schema
- `docs/` - operational documentation

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

Create `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ims_db?schema=public"
BETTER_AUTH_SECRET="your-32+-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Prepare database

```bash
bun run db:generate
bun run db:migrate
```

### 4. Run app

```bash
bun run dev
```

App URL: `http://localhost:3000`

## Scripts

- `bun run dev` - start development server
- `bun run build` - production build
- `bun run preview` - preview production build
- `bun run db:migrate` - apply migrations
- `bun run db:push` - sync Prisma schema
- `bun run db:studio` - open Prisma Studio
- `bun run check` - lint/format check
- `bun run fix` - auto-fix lint/format issues
- `bun x ultracite check` - full quality checks
- `bun x ultracite fix` - full auto-fixes

## Operational Notes

- Dashboard metrics are intentionally cached for stability/performance.
- Product tracking mode (batch/expiry/serial) controls required stock-entry data.
- Purchase and sales forms auto-fill defaults (prices/addresses) while allowing override.
- Archived record views are available in relevant modules.

## Documentation

- `docs/OPERATIONS_GUIDE.md` - practical module-by-module usage guide

