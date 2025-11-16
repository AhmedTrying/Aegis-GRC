# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/f0d14650-ba5a-4650-b321-24dea5afdd61

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f0d14650-ba5a-4650-b321-24dea5afdd61) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/f0d14650-ba5a-4650-b321-24dea5afdd61) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## GRC Guard Setup & Run

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
