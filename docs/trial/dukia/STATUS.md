# DUKIA GROUP — run status

**Clock:** 2028-12-31  
**Workdays simulated:** 1396 (Sundays + listed festivals skipped)  
**Jobs applied:** 640 (three project agents + group, date-ordered)

Operating group: DUKIA GROUP · Sisters: MGB PRIME ESTATES LLP · SATYAM BUILDCOM · SATYAM CONSTRUCTION

## Project agents (parallel modules, single company file)

| Agent | Company | Project | Land | Bookings (from run) |
|-------|---------|---------|------|---------------------|
| Aerovista | SATYAM BUILDCOM | AV-01 | `lp_av` acquired | 26 possessed + extra 3BHK in close |
| Sunflower | SATYAM CONSTRUCTION | SF-01 | `lp_sf` acquired | 22 possessed + extra |
| Acropolis | MGB PRIME ESTATES LLP | AC-01 | `lp_ac` acquired | 52 possessed + extra |

Close snapshot (`close-2028.json`): **160 bookings** · **100 possessed** · **60 booked** · **196 still available** of 356.

## Artefacts (real IDs in `artefacts.json`)

- **RFQs (3, still open):** Aerovista / Sunflower / Acropolis structure-civil
- **Quotes (3, submitted, not selected):** `q_0ipiqe9t` `q_jy7mjffa` `q_hpbniuqf` from Shakti Earthworks
- **POs:** none — **correct gate**: vendor still `approval`, not Active. MD “activate vendor” job saw no pending card (`none pending`). Quote select refused: *Cannot select a quote from a vendor that is not Active.*
- **RERA obligations:** 49 filed with challan refs through QPR 2028-09 for RAJ/P/2024/2144, RAJ/P/2025/0088, RAJ/P/2025/0312
- **Diaries:** 292 (Mondays in each construction window)
- **ERPNext:** posting off; Atlas posted **0** vouchers. Sister companies in the desk still operator-side if Docker is down.

## Agent logs

Per-seat files under `docs/trial/dukia/agents/` including parallel project files:

- `project-aerovista.md`
- `project-sunflower.md`
- `project-acropolis.md`
- `legal-m-iyer.md` `md-r-dukia.md` `finance-p-jain.md`

## Not a clean PO pack

Do not claim POs or vendor Active. That is the run finding, not a skip.

## How to re-run

```bat
node scripts/trial/dukia/opening-2024-06.mjs --reset
node scripts/trial/dukia/day-2024-06-17.mjs
node scripts/trial/dukia/run-to-2028.mjs
node scripts/trial/dukia/close-2028.mjs
```
