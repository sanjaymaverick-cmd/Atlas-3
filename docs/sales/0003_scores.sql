-- Atlas Sales — scoring_models + lead_scores (must-have).
-- NOT applied on this local host. Zustand mirrors these columns.

create table if not exists scoring_models (
  id            text primary key,
  name          text not null,
  algorithm     text not null check (algorithm in ('hybrid', 'xgboost', 'lightgbm', 'catboost')),
  version       text not null,
  trained_at    timestamptz,
  metrics       jsonb not null default '{}',
  feature_list  jsonb not null default '[]',
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  notes         text
);

create unique index if not exists scoring_models_one_active
  on scoring_models (is_active) where is_active;

create table if not exists lead_scores (
  id              text primary key,
  lead_id         text not null,
  model_id        text not null references scoring_models (id),
  score           integer not null,
  band            text not null check (band in ('hot', 'warm', 'cold')),
  probability     numeric not null,
  top_reasons     jsonb not null,
  shap_values     jsonb not null,
  scored_at       timestamptz not null default now(),
  trigger_type    text not null,
  trigger_detail  text,
  created_at      timestamptz not null default now()
);
create index if not exists lead_scores_lead_idx on lead_scores (lead_id, scored_at desc);

alter table sales_leads add column if not exists current_score integer;
alter table sales_leads add column if not exists current_band text;
alter table sales_leads add column if not exists current_probability numeric;
alter table sales_leads add column if not exists current_score_reasons jsonb;
alter table sales_leads add column if not exists current_model_id text;
alter table sales_leads add column if not exists last_scored_at timestamptz;
