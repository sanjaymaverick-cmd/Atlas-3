-- Atlas Sales — leads, scoring, WhatsApp templates.
-- NOT applied on this local host.

create table if not exists sales_leads (
  id            text primary key,
  project_id    text not null,
  name          text not null,
  phone         text not null,
  source        text not null,
  partner_id    text,
  agent_id      text,
  stage         text not null,
  unit_code     text,
  note          text,
  budget        numeric,
  kind          text,
  wa_consent    boolean not null default false,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create unique index if not exists sales_leads_phone_project
  on sales_leads (project_id, phone) where deleted_at is null and stage not in ('lost');

create table if not exists sales_lead_activities (
  id            text primary key,
  lead_id       text not null references sales_leads (id),
  at            timestamptz not null default now(),
  kind          text not null,
  note          text not null
);

create table if not exists sales_lead_features (
  id            text primary key,
  lead_id       text not null references sales_leads (id),
  at            timestamptz not null default now(),
  features      jsonb not null
);

create table if not exists sales_scoring_models (
  id            text primary key,
  name          text not null,
  kind          text not null check (kind in ('hybrid', 'xgboost', 'lightgbm', 'catboost')),
  active        boolean not null default false,
  note          text
);

create table if not exists sales_lead_scores_history (
  id            text primary key,
  lead_id       text not null references sales_leads (id),
  at            timestamptz not null default now(),
  score         integer not null,
  band          text not null,
  model         text not null,
  reasons       jsonb not null
);

create table if not exists sales_wa_templates (
  id            text primary key,
  name          text not null unique,
  category      text not null check (category in ('utility', 'marketing')),
  language      text not null,
  status        text not null,
  body          text not null,
  variables     jsonb not null,
  samples       jsonb not null,
  trigger       text not null,
  quality       text not null default 'high',
  created_at    timestamptz not null default now()
);
