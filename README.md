![Aegis GRC Guard](public/aegis-logo.png)

# Aegis GRC Guard — Governance, Risk & Compliance SaaS

A modern, multi-tenant Governance, Risk & Compliance platform. Centralize risks, controls, policies, evidence, tasks, and reports with strict organization isolation, audit-ready workflows, and role-based access.

For access or a product demo, open an issue in this repository and we’ll reach out.

## Features
- Risk Management
  - Inherent vs residual risk, taxonomy (category, department), next review
  - Acceptance workflow with segregation of duties (request → approve/reject → expiry)
  - Delegate owners and full audit trail
- Compliance & Controls
  - Owner, frequency, type, nature, objective, last tested, effectiveness
  - Evidence library: upload/replace, reviewer flow (approve/reject), expiry badges
  - Testing panel: test period, sample size, exceptions, conclusion
  - Exceptions: N/A/Exception with approver, rationale, expiry, compensating controls
  - Crosswalks via framework mappings
- Policies
  - Versions, approvals, exceptions, multi-file documents
  - Attestation campaigns with roster tracking per user
- Tasks
  - Assignments, due dates, status; “My Tasks” filter; link to risk/control/policy
- Reports
  - Read-only dashboards; CSV/PDF exports: Risk distribution, Compliance %, Evidence health, Exceptions expiring, Attestation progress
- Users & Org Settings
  - Invite and manage users and roles; tenant branding; plan-ready structure

## Smart Capabilities
- Role-based UI enforcement (Admin, Manager, Viewer; Owner flag)
- Org-scoped queries and inserts with hard RLS boundaries
- End-to-end audit trail across key actions (risk acceptance, policy approvals, evidence review)
- Attestation campaigns and exceptions lifecycle management
- Dashboard KPIs for risk and compliance posture

## Tech Stack
- Frontend: React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn UI (Radix)
- Data & Auth: Supabase (Postgres, Auth, Storage, Edge Functions)
- Data fetching: TanStack React Query
- Tooling: ESLint, TypeScript, PostCSS, Tailwind

## Security & Isolation
- Row-Level Security (RLS) across all org-scoped tables
- Every insert sets `org_id`; every query filters by `org_id`
- Segregation of Duties: requester cannot approve their own risk acceptance
- UI constraints: forbidden actions hidden for Viewer; evidence downloads gated

## Roles & Permissions
- Owner: first user; manage billing and ownership
- Admin: full tenant administration and GRC control
- Manager: daily operations (create, edit, update); no role or tenant settings changes
- Viewer: read-only; export-only; upload/edit/delete hidden

## Project Structure

```
grc/
├── public/                 # Static assets (logo, favicon, robots)
├── src/
│   ├── components/         # UI, dialogs, layout, widgets
│   ├── context/            # Current org provider
│   ├── hooks/              # Role, usage, plan
│   ├── integrations/
│   │   └── supabase/       # client, org, audit, storage, types
│   ├── pages/              # Dashboard, Risks, Compliance, Policies, Tasks, Reports, Users, Settings, Billing
│   └── lib/                # Utilities
├── supabase/
│   ├── functions/          # Edge functions (invite, files, billing, etc.)
│   ├── migrations/         # SQL migrations and indexes
│   └── schema.sql          # Database schema snapshot
└── package.json            # Scripts and dependencies
```

## Data Model Overview
- Organizations & Profiles: `organizations`, `profiles`
- Frameworks & Controls: `frameworks`, `controls`, `framework_mappings`
- Evidence / Exceptions / Testing: `control_evidences`, `control_exceptions`, `control_tests`
- Risks & Treatment Plans: `risks`, `treatment_plans`, link via `risk_controls`, `risk_policies`
- Findings & Tasks: `findings`, `tasks`
- Policies & Documents: `policies`, `policy_files`, `policy_versions`, `policy_approvals`, `policy_exceptions`
- Attestations: `attestation_campaigns`, `attestations`
- Audit Logs: `audit_logs`

## Performance & Scalability
- Indexed queries for core flows (risk listing and KPIs)
- Efficient org filters and pagination
- Storage-backed documents for policies and evidence

## Roadmap
- [x] Environment configuration and org bootstrap
- [x] Evidence reviewer flow and exceptions lifecycle
- [ ] Billing and plans (Stripe)
- [ ] SSO enhancements (Google, Azure)
- [ ] Advanced analytics and benchmarking
- [ ] API access and webhooks
- [ ] Multi-language support

## Screenshots
- Dashboard, Risks, Compliance, Policies, Tasks, Reports, Users, Settings, Billing, Audit
- Public screenshots will be added in future updates

## Support
- For product access, demos, or questions, open an issue in this repository
- Business inquiries: contact us via the issue tracker

## Acknowledgments
- Built with React, Tailwind CSS, shadcn UI, and Supabase
- Icons by Lucide React
