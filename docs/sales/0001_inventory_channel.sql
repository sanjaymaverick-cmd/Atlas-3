-- Atlas Sales — Phase 1+2 core (inventory + third-party reporting).
-- NOT applied on this local host. Zustand is the runtime until go-live.
-- Soft deletes via deleted_at. JSONB for flexible checklists / reasons.

create table if not exists sales_towers (
  id            text primary key,
  project_id    text not null,
  name          text not null,
  kind          text not null check (kind in ('tower', 'phase', 'pocket')),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists sales_towers_project_idx on sales_towers (project_id) where deleted_at is null;

create table if not exists sales_units (
  id            text primary key,
  project_id    text not null,
  tower_id      text not null references sales_towers (id),
  code          text not null,
  kind          text not null check (kind in ('flat', 'shop', 'plot')),
  floor         text not null,
  area          text not null,
  price         numeric not null,
  status        text not null check (status in ('available', 'held', 'booked', 'sold', 'cancelled', 'dispute')),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (project_id, code)
);
create index if not exists sales_units_status_idx on sales_units (project_id, status) where deleted_at is null;

create table if not exists sales_unit_status_history (
  id            text primary key,
  unit_id       text not null references sales_units (id),
  at            timestamptz not null default now(),
  from_status   text not null,
  to_status     text not null,
  note          text not null,
  actor         text not null
);
create index if not exists sales_unit_history_unit_idx on sales_unit_status_history (unit_id, at desc);

create table if not exists sales_companies (
  id            text primary key,
  name          text not null,
  city          text not null,
  gstin         text not null,
  status        text not null check (status in ('invited', 'active', 'suspended')),
  rate          numeric not null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table if not exists sales_agents (
  id            text primary key,
  company_id    text references sales_companies (id),
  user_id       text,
  name          text not null,
  phone         text not null,
  in_house      boolean not null default false,
  status        text not null check (status in ('active', 'invited', 'suspended')),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists sales_agents_company_idx on sales_agents (company_id) where deleted_at is null;

create table if not exists sales_customers (
  id            text primary key,
  name          text not null,
  phone         text not null,
  pan           text,
  source        text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index if not exists sales_customers_phone on sales_customers (phone) where deleted_at is null;

create table if not exists sales_daily_reports (
  id            text primary key,
  agent_id      text not null references sales_agents (id),
  report_date   date not null,
  calls         integer not null default 0,
  visits        integer not null default 0,
  leads         integer not null default 0,
  holds         integer not null default 0,
  bookings      integer not null default 0,
  cancellations integer not null default 0,
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  unique (agent_id, report_date)
);

create table if not exists sales_bookings (
  id            text primary key,
  project_id    text not null,
  unit_code     text not null,
  customer_id   text references sales_customers (id),
  customer_name text not null,
  partner_id    text,
  value         numeric not null,
  collected     numeric not null default 0,
  status        text not null check (status in ('active', 'cancelled', 'possession')),
  created_at    timestamptz not null default now()
);

create table if not exists sales_commissions (
  id            text primary key,
  partner_id    text not null,
  booking_id    text not null,
  project_id    text not null,
  amount        numeric not null,
  status        text not null check (status in ('accrued', 'approved', 'paid', 'rejected')),
  created_at    timestamptz not null default now()
);

create table if not exists sales_holds (
  id            text primary key,
  unit_id       text not null references sales_units (id),
  project_id    text not null,
  agent_id      text not null references sales_agents (id),
  customer      text not null,
  until_date    date not null,
  status        text not null check (status in ('held', 'booked', 'expired', 'released')),
  created_at    timestamptz not null default now()
);
create unique index if not exists sales_holds_one_live
  on sales_holds (unit_id) where status = 'held';

-- Transactional lock: UPDATE sales_units SET status = 'held'
-- WHERE id = $1 AND status = 'available' RETURNING id;
-- Zero rows → refuse. Same pattern for held → booked.
