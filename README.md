# Aegis GRC Guard

Governance, Risk & Compliance web app built with React/Vite + Tailwind, backed by Supabase (Postgres + Auth + Storage). Multi-tenant by `org_id` with role-based access (`admin`, `manager`, `viewer`).

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn
- Supabase (Auth, Postgres, Storage)

## Setup
Prerequisites:
- Node.js 18+
- A Supabase project

Environment variables (`.env`):

```
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-key>"
```

Install and run:

```sh
npm install
npm run dev
# visit http://localhost:8080
```

## Database
Apply schema in Supabase SQL editor using `supabase/schema.sql`.
Ensure Allowed Redirect URLs include `http://localhost:8080`.

## Roles
- admin: full control + user/org management
- manager: GRC operations (create/update)
- viewer: read-only

## Deploy (Vercel)
- Link the GitHub repo in Vercel
- Branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## CI
GitHub Actions workflow builds on push/PR to `main` and uses repository secrets for env variables.

## Notes
- File uploads rely on Supabase Storage; see `supabase/functions/*` for API endpoints.

### Prerequisites
- Node.js 18+
- A Supabase project (Auth + Postgres enabled)

### Environment Configuration
Create or update `.env` with:

```
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-key>"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
```

The app also includes fallback values so it can run immediately, but using env vars is recommended.

### Supabase Database
1. Open Supabase Dashboard → SQL and apply the migration file:
   - `supabase/migrations/20251109042537_*.sql`
   - This creates tables (`profiles`, `risks`, `frameworks`, `controls`, `policies`, `tasks`, `treatment_plans`), RLS policies, and a trigger to auto-create `profiles` on user signup.
2. In Auth → URL Configuration, add `http://localhost:8080` to Allowed Redirect URLs.

### Run Locally
```sh
npm install
npm run dev
# visit http://localhost:8080
```

### First Login & Roles
- Sign up via the `/auth` page.
- New users default to `viewer`. To test editing, update your role in `public.profiles` to `manager` or `admin`.
- The header shows your current role.

### Seeding Demo Data
- Admins will see a “Seed Demo Data” button on the Dashboard.
- Clicking it inserts sample frameworks, controls, and risks if none exist.

### Notes
- Evidence and policy uploads currently accept URLs (`evidence_url`, `file_url`). To use file uploads, configure Supabase Storage and add upload components.
- Optional: run `npm audit fix` to address reported vulnerabilities.
