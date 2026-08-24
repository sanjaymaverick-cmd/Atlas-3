# Trial — ERPNext books

Install: `D:\ERPNext` from https://github.com/frappe/erpnext  
Company: **MOCK ATLAS3 LLP**  
Operator guide: `docs/finance/ERPNEXT.md`

```bat
node scripts\erpnext\smoke.mjs
node scripts\trial\probes\erpnext-baseline.mjs
```

Attestation: journal rows tagged `ATLAS-OPS` must stay 0 while posting is off.
