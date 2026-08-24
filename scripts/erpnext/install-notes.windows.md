# Windows notes — ERPNext at D:\ERPNext

Atlas-3 does **not** install ERPNext. You do, into `D:\ERPNext`, from
https://github.com/frappe/erpnext. Then Atlas reads it over REST.

## Ports

| Service | Port |
|---------|------|
| Atlas   | 8080 |
| CatBoost scoring | 8091 |
| ERPNext web | **8000** (or set `ERPNEXT_URL`) |

## Path A — Docker (recommended on Windows)

Needs Docker Desktop with WSL2.

```bat
mkdir D:\ERPNext
cd D:\ERPNext
git clone https://github.com/frappe/frappe_docker
cd frappe_docker
copy example.env .env
```

Edit `.env`:

- `ERPNEXT_VERSION` to a published tag (v15 is fine)
- HTTP port **8000** (not 8080)

Follow frappe_docker `pwd.yml` (easy local):

```bat
cd D:\ERPNext\frappe_docker
docker compose -f pwd.yml up -d
```

Site creation is in the frappe_docker docs (`bench new-site`, install erpnext).
Create company **MOCK ATLAS3 LLP** in the ERPNext desk (Accounting → Company).

## Path B — Bench (when you already have a Linux/WSL bench)

```bat
wsl
mkdir -p /mnt/d/ERPNext
cd /mnt/d/ERPNext
bench init frappe-bench --frappe-branch version-15
cd frappe-bench
bench get-app erpnext https://github.com/frappe/erpnext --branch version-15
bench new-site atlas.local
bench --site atlas.local install-app erpnext
bench --site atlas.local serve --port 8000
```

Same company: **MOCK ATLAS3 LLP**.

## API key

In ERPNext (as Administrator):

1. User list → the integration user (or Administrator for local only)
2. API Access → Generate Keys
3. Copy API Key and API Secret into Atlas env (`scripts/erpnext/.env.example`)

```bat
set ERPNEXT_URL=http://127.0.0.1:8000
set ERPNEXT_API_KEY=...
set ERPNEXT_API_SECRET=...
set ERPNEXT_COMPANY=MOCK ATLAS3 LLP
set ERPNEXT_POSTING_ENABLED=false
```

Then from Atlas:

```bat
cd "D:\work Dir\Atlas 3"
npm run dev
node scripts\erpnext\smoke.mjs
```

Health from Atlas: Finance desk “Company accounts (ERPNext)” or POST `/api/books` `{ "action": "health" }`.

## Start / stop

- Docker: `docker compose -f pwd.yml up -d` / `down` inside `D:\ERPNext\frappe_docker`
- Bench: `bench start` / Ctrl+C
- Atlas: `npm run dev` in `D:\work Dir\Atlas 3`

## What not to do

- Do not clone ERPNext under `D:\work Dir\Atlas 3`
- Do not turn `ERPNEXT_POSTING_ENABLED` on for the company trial
- Do not bind ERPNext to 8080 or 8091
