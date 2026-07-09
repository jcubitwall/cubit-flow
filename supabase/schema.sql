-- ============================================================
-- Cubit Flow — database schema (Supabase / Postgres)
-- Run this in Supabase SQL Editor once, top to bottom.
-- ============================================================

-- ---------- 1. ROLES & PROFILES ----------
-- Every login belongs to exactly one department role.
-- Row Level Security below uses this to decide what each person can see/edit.

create type department as enum (
  'design',       -- customer greeter / design / sales
  'production',   -- builders / shop floor
  'delivery',     -- delivery + setup crew
  'admin'         -- Johnny / office — sees everything, manages inventory & users
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  department department not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 2. PIPELINE STAGES ----------
-- The single source of truth for "where is this home right now".
-- Order matters — the app enforces forward-only movement except where noted.

create type project_stage as enum (
  'new_lead',            -- first contact captured
  'design',              -- in discussion, spec sheet being filled
  'deposit_pending',     -- spec agreed, waiting on 25% deposit + signature
  'production_pending',  -- deposit paid & signed — queued for the shop, still editable via signed change order
  'in_production',       -- shop is building it — design/customer can no longer edit
  'production_complete',  -- build finished, notes/photos locked, waiting on 75% payment
  'delivery_pending',    -- 75% paid — delivery date being scheduled
  'delivery_scheduled',  -- date picked, assigned to a delivery crew
  'delivered_installed'  -- customer signed off, home is complete
);

-- ---------- 3. CUSTOMERS & PROJECTS ----------

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  address text,
  email text,
  phone text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  serial_number text unique,             -- e.g. C017, assigned when deposit is paid
  customer_id uuid not null references customers(id) on delete cascade,
  stage project_stage not null default 'new_lead',
  model text,                            -- LifePod / Nest / Panorama / Cove / Haven / Expanse / Kargo Pod
  spec jsonb not null default '{}',      -- siding colour, countertop, wall panels, floor, ceiling design, etc (flexible, see lib/pipeline.js)
  quoted_price numeric(12,2),
  deposit_amount numeric(12,2),
  deposit_paid_at timestamptz,
  balance_75_paid_at timestamptz,
  final_payment_paid_at timestamptz,
  delivery_address text,
  delivery_date date,
  assigned_designer uuid references profiles(id),
  assigned_delivery_crew uuid references profiles(id),
  locked boolean not null default false, -- true once in_production: design fields become read-only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every stage transition is logged — this is your audit trail.
create table stage_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_stage project_stage,
  to_stage project_stage not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- 4. SIGNATURES ----------
-- Deposit agreement, change orders, delivery sign-off — all captured the same way.

create type signature_kind as enum ('deposit_agreement', 'change_order', 'delivery_signoff');

create table signatures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind signature_kind not null,
  signed_by_name text not null,          -- typed name of signer (customer or staff)
  signed_by_profile uuid references profiles(id), -- staff counter-signer, if applicable
  image_path text not null,              -- path in 'signatures' storage bucket
  spec_snapshot jsonb,                   -- copy of project.spec at moment of signing (for change orders, proves what changed)
  created_at timestamptz not null default now()
);

-- ---------- 5. NOTES & PHOTOS ----------
-- Free-text notes and photo uploads, tagged by department and project stage
-- so each department only sees what's relevant to them by default.

create table project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author uuid references profiles(id),
  department department not null,
  stage_at_time project_stage not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  department department not null,
  stage_at_time project_stage not null,
  storage_path text not null,            -- path in 'project-photos' storage bucket
  caption text,
  created_at timestamptz not null default now()
);

-- ---------- 6. CALENDAR / APPOINTMENTS ----------

create table appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  kind text not null,                    -- 'design_meeting' | 'delivery' | 'follow_up'
  scheduled_for timestamptz not null,
  assigned_to uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- 7. INVENTORY ----------

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text,                         -- e.g. 'siding', 'countertop', 'wall panel', 'fasteners'
  unit text default 'ea',
  quantity_on_hand numeric(12,2) not null default 0,
  reorder_threshold numeric(12,2) default 0,
  cost_per_unit numeric(12,2),
  updated_at timestamptz not null default now()
);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  project_id uuid references projects(id),  -- null if not tied to a specific home
  change_qty numeric(12,2) not null,        -- negative = used, positive = received
  reason text,                              -- 'invoice_receipt' | 'used_in_production' | 'adjustment'
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- 8. INVOICES (photo-scanned) ----------

create table invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),  -- which home this cost gets assigned to, if any
  vendor text,
  invoice_date date,
  total_amount numeric(12,2),
  storage_path text not null,               -- photo of the physical invoice
  raw_extraction jsonb,                     -- full structured output from Claude vision extraction
  status text not null default 'needs_review', -- 'needs_review' | 'confirmed'
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text,
  quantity numeric(12,2),
  unit_cost numeric(12,2),
  matched_inventory_item uuid references inventory_items(id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table customers enable row level security;
alter table projects enable row level security;
alter table stage_history enable row level security;
alter table signatures enable row level security;
alter table project_notes enable row level security;
alter table project_photos enable row level security;
alter table appointments enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

-- helper: get current user's department
create or replace function my_department() returns department as $$
  select department from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Everyone signed in can read their own profile + see other active staff (for assignment dropdowns)
create policy "read profiles" on profiles for select using (true);

-- admin can do everything everywhere — simplest approach, one policy per table
create policy "admin all customers" on customers for all using (my_department() = 'admin');
create policy "admin all projects" on projects for all using (my_department() = 'admin');
create policy "admin all history" on stage_history for all using (my_department() = 'admin');
create policy "admin all signatures" on signatures for all using (my_department() = 'admin');
create policy "admin all notes" on project_notes for all using (my_department() = 'admin');
create policy "admin all photos" on project_photos for all using (my_department() = 'admin');
create policy "admin all appts" on appointments for all using (my_department() = 'admin');
create policy "admin all inventory" on inventory_items for all using (my_department() = 'admin');
create policy "admin all movements" on inventory_movements for all using (my_department() = 'admin');
create policy "admin all invoices" on invoices for all using (my_department() = 'admin');
create policy "admin all line items" on invoice_line_items for all using (my_department() = 'admin');

-- design: full access to customers, and to projects while stage is new_lead..production_pending
create policy "design read customers" on customers for select using (my_department() = 'design');
create policy "design write customers" on customers for insert with check (my_department() = 'design');
create policy "design update customers" on customers for update using (my_department() = 'design');

create policy "design read projects" on projects for select using (
  my_department() = 'design'
);
create policy "design write projects" on projects for update using (
  my_department() = 'design' and stage in ('new_lead','design','deposit_pending','production_pending') and not locked
);
create policy "design insert projects" on projects for insert with check (my_department() = 'design');

-- production: read all project core info, but only once past production_pending; can add notes/photos while in_production
create policy "production read projects" on projects for select using (
  my_department() in ('production','delivery')
);
create policy "production notes" on project_notes for all using (
  my_department() = 'production' and stage_at_time in ('in_production','production_complete')
);
create policy "production photos" on project_photos for all using (
  my_department() = 'production' and stage_at_time in ('in_production','production_complete')
);

-- delivery: read projects at delivery stages, add notes/photos, capture sign-off
create policy "delivery notes" on project_notes for all using (
  my_department() = 'delivery' and stage_at_time in ('delivery_pending','delivery_scheduled','delivered_installed')
);
create policy "delivery photos" on project_photos for all using (
  my_department() = 'delivery' and stage_at_time in ('delivery_pending','delivery_scheduled','delivered_installed')
);
create policy "delivery signatures" on signatures for insert with check (
  my_department() = 'delivery' and kind = 'delivery_signoff'
);
create policy "design signatures" on signatures for insert with check (
  my_department() = 'design' and kind in ('deposit_agreement','change_order')
);
create policy "read own dept signatures" on signatures for select using (
  my_department() in ('design','delivery','admin')
);

-- stage_history: anyone can insert (it's the audit trail), everyone can read
create policy "insert history" on stage_history for insert with check (auth.uid() is not null);
create policy "read history" on stage_history for select using (auth.uid() is not null);

-- appointments: design manages, everyone can read their own assigned ones
create policy "design manage appts" on appointments for all using (my_department() = 'design');
create policy "read own appts" on appointments for select using (assigned_to = auth.uid());

-- inventory: production & admin can read; movements can be written by production/admin
create policy "read inventory" on inventory_items for select using (my_department() in ('production','admin'));
create policy "read movements" on inventory_movements for select using (my_department() in ('production','admin'));
create policy "write movements" on inventory_movements for insert with check (my_department() in ('production','admin'));

-- invoices: admin manages; anyone can upload (photo scan) for review
create policy "insert invoices" on invoices for insert with check (auth.uid() is not null);
create policy "read invoices" on invoices for select using (my_department() = 'admin');
