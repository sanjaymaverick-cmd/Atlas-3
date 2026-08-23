# Atlas 3 — local only

Private real estate ERP. **Not live.** Run on this machine until UAT is signed.

Unpack into:

`D:\work Dir\Atlas 3`

## Run

```bat
cd "D:\work Dir\Atlas 3"
npm install
npm run dev
```

Open the URL the terminal prints (usually port 8080).

## Test accounts (local)

| Seat | Email | Password |
|------|--------|----------|
| Managing Director | md@atlas.local | AtlasLocal-MD |
| Project Director | pd@atlas.local | AtlasLocal-PD |
| Site Engineer | se@atlas.local | AtlasLocal-SE |
| Finance Lead | fl@atlas.local | AtlasLocal-FL |
| UAT tester | test@atlas.local | AtlasLocal-UAT |

Do not use these on a public host.

## After UAT

Go-live (passkeys, Vault/HSM, Aerovista/Acropolis restore drill, Tally live sync) is a separate decision. This copy is the local console only.
