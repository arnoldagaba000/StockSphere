# IMS (Stock Sphere)

Inventory management system built with TanStack Start, TanStack Router, and Bun.  
Current focus: authentication (email/password + Google OAuth) with Better Auth and Prisma/PostgreSQL.

## Tech Stack
- Bun, Vite, React 19, TanStack Start/Router
- Better Auth for authentication
- Prisma + PostgreSQL
- Tailwind CSS v4

## Current Features
- Email/password sign up and sign in
- Google OAuth sign in
- Session handling and protected routes
- Auth route guard for authenticated users

## Getting Started
1. Install dependencies
```bash
bun install
```

2. Configure environment variables
Create `.env.local` with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ims_db?schema=public"
BETTER_AUTH_SECRET="your-32+-char-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

3. Generate Prisma client and apply migrations
```bash
bun run db:generate
bun run db:migrate
```

4. Run the app
```bash
bun run dev
```

App runs on `http://localhost:3000`.

## Useful Scripts
- `bun run dev` — start development server
- `bun run build` — build for production
- `bun run preview` — preview production build
- `bun run db:migrate` — run Prisma migrations
- `bun run db:push` — push schema to database
- `bun run db:studio` — open Prisma Studio
- `bun run check` — lint and format check
- `bun run fix` — auto-fix lint and format issues

## Project Structure
- `src/routes` — file-based routes (auth in `/_auth`, API in `/api/auth`)
- `src/lib/auth.ts` — Better Auth server config
- `src/lib/auth-client.ts` — Better Auth client config
- `prisma/schema.prisma` — database schema

## Notes
- Authentication is the only fully implemented feature at the moment.
- Additional IMS features (inventory, orders, reporting) are planned.
