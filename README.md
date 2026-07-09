# Cubit Flow

A department-gated pipeline tracker for Cubit Home: first contact → design & spec →
deposit → production → delivery → install, with photos, e-signatures, notes,
inventory, and photo-scanned invoice tracking at every stage.

**Stack:** React (Vite) frontend hosted free on GitHub Pages, Supabase for the
database, auth, file storage, and (for invoice scanning) a small server-side
function that calls Claude's vision API.

Why this split: GitHub can host the app's code and static files for free, but
it can't run a database or store photos — that's what Supabase is for. You
don't need to know how either works internally to set this up; just follow
the steps below in order.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project (free tier is enough to start).
2. Once it's created, go to **SQL Editor** → paste the entire contents of
   `supabase/schema.sql` from this repo → Run. This creates every table,
   the pipeline stages, and the department permission rules.
3. Go to **Storage** and create three buckets, all **private** (not public):
   - `project-photos`
   - `signatures`
   - `invoices`
4. Go to **Project Settings → API**. Copy the **Project URL** and the
   **anon public** key — you'll need these in step 3.

## 2. Create staff logins

1. In Supabase, go to **Authentication → Users → Add user**, and create one
   login per staff member (email + password — they can change it later).
2. For each user, go to **SQL Editor** and run, filling in their real name
   and department (`design`, `production`, `delivery`, or `admin`):
   ```sql
   insert into profiles (id, full_name, department)
   values ('paste-the-user-id-from-auth-users-table', 'Jane Doe', 'design');
   ```
   The user's ID is visible in the Authentication → Users list once created.
3. Make at least one person `admin` — that role can see and do everything,
   including inventory and invoices.

## 3. Run it locally first (recommended before deploying)

You'll need [Node.js](https://nodejs.org) installed (v20+).

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste in your Supabase Project URL and anon key
npm run dev
```

Open the local address it prints, sign in with a login you created in step 2,
and click through a lead end-to-end.

## 4. Put it on GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/cubit-flow.git
git push -u origin main
```

## 5. Deploy to GitHub Pages (free hosting)

1. In your repo on GitHub: **Settings → Pages → Source → GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret** —
   add two secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same
   values as your `.env.local`).
3. If your repo name isn't `cubit-flow`, edit the `base` value in
   `vite.config.js` to match it exactly.
4. Push to `main` (or re-run the workflow from the **Actions** tab). The
   included workflow (`.github/workflows/deploy.yml`) builds and publishes
   automatically. Your app will be live at
   `https://YOUR-USERNAME.github.io/cubit-flow/`.

## 6. Turn on invoice scanning (optional, needs the Supabase CLI)

Invoice photos are read by Claude, which requires a server-side call so your
Anthropic API key is never exposed in the browser. This uses a Supabase Edge
Function, already written in `supabase/functions/extract-invoice`.

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref   # found in Project Settings > General
supabase functions deploy extract-invoice
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get an API key at [console.anthropic.com](https://console.anthropic.com). Until
this step is done, everything else in the app works — only the "Scan invoice"
button needs it.

---

## How the pipeline works

Stages are enforced in one place: `src/lib/pipeline.js`. This is the file to
edit if you ever want to add a stage, rename one, or change who can move a
project between stages — the whole app reads from it rather than having stage
logic scattered around.

| Stage | Who acts | What happens |
|---|---|---|
| New Lead | Design | Name, address, contact info, notes captured |
| Design & Spec | Design | Siding, countertop, panels, floor, ceiling, package — full spec sheet |
| Deposit Pending | Design | 25% deposit recorded, customer signs on the iPad |
| Production Pending | Design | Queued for the shop; change orders still allowed (re-signed) |
| In Production | Production | **Spec locks.** Builders add notes/photos only |
| Production Complete | Production | Build finished, notes/photos locked |
| Delivery Pending | Admin/Delivery | Opens once 75% is paid; date gets scheduled |
| Delivery Scheduled | Delivery | Crew assigned, final payment collected before delivery |
| Delivered & Installed | Delivery | Customer signs off, install photos uploaded |

Every stage change, signature, and payment is logged to `stage_history` /
`signatures` with who did it and when — that's your audit trail if a dispute
ever comes up about what was agreed to and when.

## Security note

Department access isn't just hidden in the UI — it's enforced at the
database level by Row Level Security policies in `schema.sql`. Even if
someone inspected the app's network traffic, a design-department login
cannot pull production-only records; Postgres itself blocks it. Read
`schema.sql`'s RLS section if you want to see or adjust exactly who can do
what.

## What's a starting point vs. production-ready

This gets you a fully working app end to end. A few things worth doing before
it's your permanent system of record:
- Test the full flow with a real (or dummy) lead all the way to delivered
- Add a few more staff and confirm each department only sees what it should
- Consider Supabase's paid tier once you're past its free-tier storage/row
  limits (you'll get a warning in the Supabase dashboard well before that)
- The inventory-to-invoice matching is manual right now (you assign a scanned
  invoice to a project by hand) — auto-matching against SKUs is a natural
  next phase once you see real invoice formats coming through
