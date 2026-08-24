# Four-eyes vs Managing Director bypass

**Status:** recorded, not changed  
**Code:** `src/lib/roles.ts` → `canActOnApproval`, `MD_BYPASS_FOUR_EYES`  
**Date:** 24 Aug 2026

## What the app does today

`canActOnApproval` lets the Managing Director (`owner`) act on **any** pending approval, including items waiting on another seat (Project Director, Four-eyes approver, Finance Lead, Sales Manager).

This is deliberate in the source comment (“MD can always act”). It is also a four-eyes hole: the MD can originate a change and then approve it.

The 24 Aug company trial observed this live (MD approved a Change waiting on the Project Director).

## What this cutover does **not** do

It does **not** silently turn the bypass off. Product has not decided.

## Flag

| Env | Default | Effect |
|-----|---------|--------|
| `VITE_MD_BYPASS_FOUR_EYES` unset / `true` | **current behaviour** | MD can act on any approval |
| `VITE_MD_BYPASS_FOUR_EYES=false` | opt-in | MD is scoped like every other named waiter |

Routing of `waitingOn` is a typed union (`src/lib/waiting-on.ts`). Unmapped values are a compile error. `"Four-eyes approver"` maps to owner + project director; with the bypass off, an MD who is not in that map still cannot act unless they are a mapped waiter.

## Decision (2026-08-25)

**Keep the bypass for this local trial.** Owner ticked it in `owner-calls.md`.

Flip `VITE_MD_BYPASS_FOUR_EYES=false` **before any live / broker-facing deploy**, and update this file the same day. Do not flip the default silently.
