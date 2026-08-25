# Go-live leftovers — not this host

Atlas ops and ERPNext **entity books** do not need these to run locally.

| Item                       | On this host                                 | Honest next                                             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| WhatsApp Business          | Templates + local thread                     | Meta Cloud API + WABA — owner                           |
| Meta / Google Lead Ads     | Designed-only on Incoming leads              | External AM activation                                  |
| Payments (Razorpay etc.)   | Collections are ops amounts                  | Gateway + ERPNext receipt when posting on               |
| E-sign                     | Allotment / AFS checkboxes                   | Provider (Digio / Leegality / etc.)                     |
| Auto IC elimination        | Worksheet on Finance — **does not post**     | Period-end pack in ERPNext/Excel                        |
| Stock bridge               | Materials qty + warehouse **label**          | Stock Entry / GRN in ERPNext when you want valued stock |
| Postgres + production auth | Zustand persist + local test logins          | After UAT; do not flip auth on this demo                |
| DWG / BIM                  | Register can attach a small DWG/IFC **file** | No viewer, not Aconex, not Revit                        |

Do not treat any of these as live. ERPNext posting stays **off** unless you turn it on for a named test.
