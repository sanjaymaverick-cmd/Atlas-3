# ERPNext sibling — operator scripts

**Install ERPNext at `D:\ERPNext` from https://github.com/frappe/erpnext.**  
Do not clone it into this Atlas repo. Atlas talks to it over REST only.

Full steps: [`docs/finance/ERPNEXT.md`](../../docs/finance/ERPNEXT.md).

```bat
cd "D:\work Dir\Atlas 3"
copy scripts\erpnext\.env.example scripts\erpnext\.env
notepad scripts\erpnext\.env
node scripts\erpnext\smoke.mjs
npm run books:companies
```

Atlas boots when `ERPNEXT_*` is unset. Posting stays off until `ERPNEXT_POSTING_ENABLED=true`.

`books:companies` creates **SATYAM BUILDCOM**, **SATYAM CONSTRUCTION**, **MGB PRIME ESTATES LLP** (and optional **DUKIA GROUP**) with the exact Atlas names. **MOCK ATLAS3 LLP** stays the smoke company.
