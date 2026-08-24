# Owner calls — books desk, four-eyes, isolation, posting

**Status:** accepted 2026-08-25 (owner ticked the recommended column).  
**Local only.** Flags not flipped.

| Decision | Locked | Flip when |
|----------|--------|-----------|
| MD on Desk | **Read-only** (`md@dukia.local` = Auditor, no JE Submit) | MD actually posts vouchers himself |
| Four-eyes | **Keep MD bypass** for this local trial | Before any live / broker-facing deploy (`VITE_MD_BYPASS_FOUR_EYES=false`, update `four-eyes.md` the same day) |
| L14 | **Selectors now;** full dataset still in the client store | First external channel company on a real host — auth-scoped APIs, not a selector tweak |
| Posting | **`ERPNEXT_POSTING_ENABLED` stays false** | Named operator session only; Finance button; ATLAS-OPS + `sourceId`; never auto from land/PO/booking/CEO. Not default-on in this repo. |

---

## 1. MD on Desk — read-only vs can Submit

**Recommend: read-only.** Already how `md@dukia.local` is built.

- Atlas CEO is the MD ops pulse (three LLP cards, funnel, velocity). ERPNext is a 10-minute look at TB / P&L / BS / sister loans.
- Submit stays with Finance (`finance@dukia.local`). That is the books analogue of four-eyes: the person who types Why is not the only person who can also post.
- If MD can Submit, he can originate and post the same voucher on a phone call with no second pair of eyes.
- Hindi/English literacy on Desk is “check LLP, two lines, Why, look at TB” — not “Submit Inter Company”.

**Pick Submit later** only if R. Dukia will post JEs himself when P. Jain is away. Then give MD Accounts User + Submit, keep MOCK blocked, keep module blocks.

## 2. Four-eyes — keep MD bypass or flip

**Recommend: keep the bypass through this local trial. Flip the flag before live.**

Today `canActOnApproval` lets the MD act on any pending card, including items waiting on Project Director / Four-eyes / Finance. Company-day saw MD approve a Change waiting on the PD. That is a real hole.

Why not flip now:

- MD desk scored teachable because one person clears the queue. Flipping without a PD-on-the-call drill will stall Approvals.
- Flag already exists: `VITE_MD_BYPASS_FOUR_EYES=false` scopes MD like every other waiter. No rewrite.

Why flip before live:

- A live channel or partner must not watch the owner originate and approve the same Change.
- Record the flip in `docs/decisions/four-eyes.md` the same day (that file forbids a silent default change).

## 3. L14 — server-side channel scope before real brokers

**Recommend: do not rewrite now. Do it before the first real broker host.**

Selectors + exclusive-channel lock are the operational filter. Isolation probes stay at 0 hits. The full dataset still sits in every browser (`sales-scope.ts`). A determined agent can read sister inventory from DevTools.

That is acceptable for a closed local trial with staff we know. It is not acceptable when Square and Yard / SBG sit on a URL they can open from home.

Work when it happens: auth-scoped APIs, no full `units` / `leads` dump to `channel` / `channel_admin`. Not a selector tweak.

## 4. Posting — when (if ever) default-on for controlled ATLAS-OPS only

**Recommend: never default-on in committed env. On only as an explicit operator flag, Finance button, ATLAS-OPS + `sourceId` only.**

Already true:

- GET draft then `frappe.client.submit` with the **full doc**.
- Finance desk can post when the flag is on; land / PO / booking / CEO never auto-post.
- `finance@` proved a live Desk JE (`ACC-JV-2026-00023`) with the flag **still false** — books do not need Atlas posting to work.

Turn the flag on only for a named session (P. Jain, local) when you want Atlas Finance to write ATLAS-OPS rows. Turn it off after. Default in `.env.example` and docs stays `false`.

Default-on “if ever”: a dedicated live env where ERPNext is the daily ledger **and** Finance still uses the explicit button. Not this trial. Not MOCK. Not from site seats.

---

## Not in this table (already locked this pass)

- Forward IC: new loans = Inter Company kind; run2 `00016`–`00021` left ordinary.
- Drafts `00001`–`00009` / `00022` stay Draft (cancel would need submit; that would double-post).
- No site / channel / vendor ERPNext logins.
- MOCK never a Finance default.
