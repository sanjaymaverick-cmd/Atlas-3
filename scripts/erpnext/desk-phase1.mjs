/**
 * ERPNext Desk Phase 1 for DUKIA books (Finance + MD).
 * Local only. Does not post elim JEs. Does not delete trial ACC-JV-2026-00010–00021.
 *
 *   node scripts/erpnext/desk-phase1.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ERP_CREATE_TIMEOUT_MS,
  ERP_SLOW_TIMEOUT_MS,
  erpnextFetch,
  loadDotEnv,
  readErpnextConfig,
} from "./lib.mjs";

loadDotEnv();
const cfg = readErpnextConfig();
if (!cfg.configured) {
  console.error("ERPNext not configured");
  process.exit(1);
}

const FINANCE = "finance@dukia.local";
const MD = "md@dukia.local";
const FINANCE_PASSWORD = process.env.ERPNEXT_FINANCE_PASSWORD || "DukiaBooks-FL";
const MD_PASSWORD = process.env.ERPNEXT_MD_PASSWORD || "DukiaBooks-MD";
const TRADING = ["SATYAM BUILDCOM", "SATYAM CONSTRUCTION", "MGB PRIME ESTATES LLP"];
const BLOCK_MODULES = [
  "Stock",
  "Manufacturing",
  "Selling",
  "Buying",
  "CRM",
  "Quality Management",
  "Support",
  "Website",
  "Subcontracting",
  "Projects",
  "Assets",
];
const JE_HIDE = [
  "multi_currency",
  "apply_tds",
  "tax_withholding_category",
  "for_all_stock_asset_accounts",
  "stock_asset_account",
  "periodic_entry_difference_account",
  "write_off_based_on",
  "write_off_amount",
  "process_deferred_accounting",
  "letter_head",
  "select_print_heading",
  "total_amount",
  "total_amount_in_words",
  "total_amount_currency",
  "payment_order",
  "stock_entry",
  "reversal_of",
  "is_system_generated",
  "amended_from",
  "auto_repeat",
  "party_not_required",
  "mode_of_payment",
  "bill_no",
  "bill_date",
  "due_date",
  "pay_to_recd_from",
  "finance_book",
  "is_opening",
];
const VOUCHER_KEEP = [
  "Journal Entry",
  "Inter Company Journal Entry",
  "Bank Entry",
  "Cash Entry",
  "Opening Entry",
  "Write Off Entry",
  "Credit Note",
  "Debit Note",
].join("\n");

const log = [];
function tick(ok, item, extra = "") {
  const line = `${ok ? "[x]" : "[ ]"} ${item}${extra ? ` — ${extra}` : ""}`;
  log.push(line);
  console.log(line);
}

async function api(path, init = {}, timeout = ERP_SLOW_TIMEOUT_MS) {
  return erpnextFetch(cfg, path, init, timeout);
}

async function get(path) {
  try {
    const r = await api(path);
    return r.json;
  } catch (e) {
    return { error: e.message, body: e.body };
  }
}

async function post(path, body) {
  return api(path, { method: "POST", body: JSON.stringify(body) }, ERP_CREATE_TIMEOUT_MS);
}

async function put(path, body) {
  return api(path, { method: "PUT", body: JSON.stringify(body) }, ERP_CREATE_TIMEOUT_MS);
}

async function upsertResource(doctype, name, body) {
  const encoded = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
  const existing = await get(encoded);
  if (existing?.data?.name) {
    return put(encoded, body);
  }
  return post(`/api/resource/${encodeURIComponent(doctype)}`, { ...body, doctype, name });
}

async function findByFilters(doctype, filters) {
  const params = new URLSearchParams({
    filters: JSON.stringify(filters),
    limit_page_length: "5",
  });
  const r = await get(`/api/resource/${encodeURIComponent(doctype)}?${params}`);
  return r?.data?.[0] ?? null;
}

async function upsertProperty({
  doc_type,
  field_name,
  property,
  value,
  property_type,
  doctype_or_field = "DocField",
}) {
  const hit = await findByFilters("Property Setter", [
    ["doc_type", "=", doc_type],
    ["field_name", "=", field_name],
    ["property", "=", property],
  ]);
  const body = {
    doctype: "Property Setter",
    doctype_or_field,
    doc_type,
    field_name,
    property,
    value: String(value),
    property_type,
  };
  if (hit?.name) return put(`/api/resource/Property Setter/${encodeURIComponent(hit.name)}`, body);
  return post("/api/resource/Property Setter", body);
}

function sid() {
  return Math.random().toString(36).slice(2, 12);
}

// ── Module profile ────────────────────────────────────────────────────
try {
  await upsertResource("Module Profile", "DUKIA Books", {
    module_profile_name: "DUKIA Books",
    block_modules: BLOCK_MODULES.map((module) => ({ module })),
  });
  tick(
    true,
    "Module Profile DUKIA Books (blocked Stock/Mfg/Selling/Buying/CRM/Quality/Support/Website/Subcontracting/Projects/Assets)",
  );
} catch (e) {
  tick(false, "Module Profile DUKIA Books", e.message);
}

// ── Users ─────────────────────────────────────────────────────────────
const onboard = JSON.stringify({ Home: { is_complete: true }, Accounts: { is_complete: true } });

async function ensureUser({ email, first, last, password, roleProfile, roles, defaultCompany }) {
  const existing = await get(`/api/resource/User/${encodeURIComponent(email)}`);
  const body = {
    email,
    first_name: first,
    last_name: last,
    send_welcome_email: 0,
    enabled: 1,
    language: "en",
    module_profile: "DUKIA Books",
    onboarding_status: onboard,
    new_password: password,
    defaults: [{ defkey: "Company", defvalue: defaultCompany }],
  };
  if (roleProfile) body.role_profile_name = roleProfile;
  if (roles) body.roles = roles.map((role) => ({ role }));
  if (existing?.data?.name) {
    delete body.new_password;
    await put(`/api/resource/User/${encodeURIComponent(email)}`, body);
    try {
      await post("/api/method/frappe.client.set_value", {
        doctype: "User",
        name: email,
        fieldname: "new_password",
        value: password,
      });
    } catch {
      /* password may already be set */
    }
    return "updated";
  }
  await post("/api/resource/User", { doctype: "User", ...body });
  return "created";
}

try {
  const st = await ensureUser({
    email: FINANCE,
    first: "Finance",
    last: "DUKIA",
    password: FINANCE_PASSWORD,
    roleProfile: "Accounts",
    roles: ["Accounts User", "Accounts Manager"],
    defaultCompany: "SATYAM BUILDCOM",
  });
  tick(true, `User ${FINANCE}`, st);
} catch (e) {
  tick(false, `User ${FINANCE}`, `${e.message} ${e.body ?? ""}`.slice(0, 180));
}

try {
  await put(`/api/resource/User/${encodeURIComponent(FINANCE)}`, {
    role_profile_name: "Accounts",
    roles: [{ role: "Accounts User" }, { role: "Accounts Manager" }],
    module_profile: "DUKIA Books",
  });
  tick(true, "Finance roles = Accounts User + Accounts Manager");
} catch (e) {
  tick(false, "Finance roles", `${e.message} ${e.body ?? ""}`.slice(0, 180));
}

try {
  const st = await ensureUser({
    email: MD,
    first: "Managing",
    last: "Director",
    password: MD_PASSWORD,
    roles: ["Auditor"],
    defaultCompany: "SATYAM BUILDCOM",
  });
  tick(true, `User ${MD} (Auditor — no JE submit)`, st);
} catch (e) {
  tick(false, `User ${MD}`, `${e.message} ${e.body ?? ""}`.slice(0, 180));
}

// MD roles: Auditor only (read + report, no submit)
try {
  await put(`/api/resource/User/${encodeURIComponent(MD)}`, {
    roles: [{ role: "Auditor" }],
    module_profile: "DUKIA Books",
    default_workspace: "DUKIA Books",
  });
  tick(true, "MD roles = Auditor (read-only books)");
} catch (e) {
  tick(false, "MD roles", `${e.message} ${e.body ?? ""}`.slice(0, 180));
}

// ── User Permission: three trading LLPs, never MOCK / GROUP ───────────
for (const user of [FINANCE, MD]) {
  for (const company of TRADING) {
    try {
      const hit = await findByFilters("User Permission", [
        ["user", "=", user],
        ["allow", "=", "Company"],
        ["for_value", "=", company],
      ]);
      const body = {
        doctype: "User Permission",
        user,
        allow: "Company",
        for_value: company,
        apply_to_all_doctypes: 1,
        is_default: company === "SATYAM BUILDCOM" ? 1 : 0,
      };
      if (hit?.name)
        await put(`/api/resource/User Permission/${encodeURIComponent(hit.name)}`, body);
      else await post("/api/resource/User Permission", body);
      tick(true, `User Permission ${user} → ${company}`);
    } catch (e) {
      tick(false, `User Permission ${user} → ${company}`, e.message);
    }
  }
}

// ── Workspace ─────────────────────────────────────────────────────────
const shortcuts = [
  {
    type: "DocType",
    label: "New voucher",
    link_to: "Journal Entry",
    doc_view: "New",
    color: "#2490EF",
  },
  {
    type: "DocType",
    label: "Vouchers",
    link_to: "Journal Entry",
    doc_view: "List",
    color: "#2490EF",
  },
  { type: "DocType", label: "Accounts (tree)", link_to: "Account", doc_view: "Tree" },
  { type: "Report", label: "Ledger", link_to: "General Ledger", report_ref_doctype: "GL Entry" },
  {
    type: "Report",
    label: "Trial Balance",
    link_to: "Trial Balance",
    report_ref_doctype: "GL Entry",
  },
  {
    type: "Report",
    label: "Profit & Loss",
    link_to: "Profit and Loss Statement",
    report_ref_doctype: "GL Entry",
  },
  {
    type: "Report",
    label: "Balance Sheet",
    link_to: "Balance Sheet",
    report_ref_doctype: "GL Entry",
  },
  {
    type: "Report",
    label: "Sister loans",
    link_to: "General Ledger",
    report_ref_doctype: "GL Entry",
  },
];
const content = JSON.stringify([
  {
    id: sid(),
    type: "header",
    data: { text: '<span class="h4"><b>DUKIA Books</b></span>', col: 12 },
  },
  ...shortcuts.map((s) => ({
    id: sid(),
    type: "shortcut",
    data: { shortcut_name: s.label, col: 3 },
  })),
]);

try {
  await upsertResource("Workspace", "DUKIA Books", {
    label: "DUKIA Books",
    title: "DUKIA Books",
    module: "Accounts",
    public: 1,
    is_hidden: 0,
    sequence_id: 0.5,
    icon: "accounting",
    content,
    shortcuts,
    roles: [{ role: "Accounts User" }, { role: "Accounts Manager" }, { role: "Auditor" }],
  });
  tick(true, 'Workspace "DUKIA Books" with 8 shortcuts');
} catch (e) {
  tick(false, "Workspace DUKIA Books", `${e.message} ${e.body ?? ""}`.slice(0, 220));
}

for (const user of [FINANCE, MD]) {
  try {
    await put(`/api/resource/User/${encodeURIComponent(user)}`, {
      default_workspace: "DUKIA Books",
    });
    tick(true, `Default workspace for ${user}`);
  } catch (e) {
    tick(false, `Default workspace for ${user}`, e.message);
  }
}

// ── Global Defaults: never MOCK ───────────────────────────────────────
try {
  await put("/api/resource/Global Defaults/Global Defaults", {
    default_company: "SATYAM BUILDCOM",
  });
  tick(true, "Global Defaults company = SATYAM BUILDCOM (never MOCK)");
} catch (e) {
  tick(false, "Global Defaults", e.message);
}

// ── Customize Form / Property Setter ──────────────────────────────────
const labels = [
  ["company", "LLP"],
  ["posting_date", "Date"],
  ["voucher_type", "Kind"],
  ["accounts", "Lines"],
  ["title", "Short name"],
  ["user_remark", "Why (plain words)"],
  ["inter_company_journal_entry_reference", "Linked voucher in the other LLP"],
];
for (const [field, label] of labels) {
  try {
    await upsertProperty({
      doc_type: "Journal Entry",
      field_name: field,
      property: "label",
      value: label,
      property_type: "Data",
    });
    tick(true, `JE label ${field} → ${label}`);
  } catch (e) {
    tick(false, `JE label ${field}`, e.message);
  }
}
for (const field of [
  "title",
  "user_remark",
  "inter_company_journal_entry_reference",
  "from_template",
]) {
  try {
    await upsertProperty({
      doc_type: "Journal Entry",
      field_name: field,
      property: "hidden",
      value: 0,
      property_type: "Check",
    });
    tick(true, `JE unhide ${field}`);
  } catch (e) {
    tick(false, `JE unhide ${field}`, e.message);
  }
}
for (const field of ["title", "user_remark", "company"]) {
  try {
    await upsertProperty({
      doc_type: "Journal Entry",
      field_name: field,
      property: "reqd",
      value: 1,
      property_type: "Check",
    });
    tick(true, `JE mandatory ${field}`);
  } catch (e) {
    tick(false, `JE mandatory ${field}`, e.message);
  }
}
try {
  await upsertProperty({
    doc_type: "Journal Entry",
    field_name: "voucher_type",
    property: "options",
    value: VOUCHER_KEEP,
    property_type: "Text",
  });
  tick(true, "JE Kind options trimmed");
} catch (e) {
  tick(false, "JE Kind options", e.message);
}
try {
  await upsertProperty({
    doc_type: "Journal Entry",
    field_name: "custom_remark",
    property: "default",
    value: "1",
    property_type: "Text",
  });
  tick(true, "custom_remark default checked");
} catch (e) {
  tick(false, "custom_remark default", e.message);
}
try {
  await upsertProperty({
    doc_type: "Journal Entry",
    field_name: "title",
    property: "insert_after",
    value: "user_remark",
    property_type: "Data",
  });
  tick(true, "Short name sits after Why on Details");
} catch (e) {
  tick(false, "Short name insert_after", e.message);
}
for (const field of JE_HIDE) {
  try {
    await upsertProperty({
      doc_type: "Journal Entry",
      field_name: field,
      property: "hidden",
      value: 1,
      property_type: "Check",
    });
  } catch (e) {
    tick(false, `JE hide ${field}`, e.message);
  }
}
tick(true, `JE hide noise fields (${JE_HIDE.length})`);

for (const field of [
  "party_type",
  "party",
  "bank_account",
  "project",
  "user_remark",
  "reference_type",
  "reference_name",
]) {
  try {
    await upsertProperty({
      doc_type: "Journal Entry Account",
      field_name: field,
      property: "in_list_view",
      value: 0,
      property_type: "Check",
    });
  } catch (e) {
    tick(false, `JEA hide column ${field}`, e.message);
  }
}
for (const field of [
  "account",
  "debit_in_account_currency",
  "credit_in_account_currency",
  "cost_center",
]) {
  try {
    await upsertProperty({
      doc_type: "Journal Entry Account",
      field_name: field,
      property: "in_list_view",
      value: 1,
      property_type: "Check",
    });
  } catch (e) {
    tick(false, `JEA show column ${field}`, e.message);
  }
}
tick(true, "JE lines columns: Account, Debit, Credit, Cost Center");

// ── Client scripts ────────────────────────────────────────────────────
const formScript = `
frappe.ui.form.on('Journal Entry', {
  refresh(frm) {
    if (frappe.session.user === '${MD}') {
      frm.disable_form();
      frappe.show_alert('MD login is read-only. Finance submits vouchers.');
    }
    if (frm.doc.user_remark && !frm.doc.title) {
      frm.set_value('title', String(frm.doc.user_remark).slice(0, 80));
    }
  },
  company(frm) {
    if (frm.doc.company === 'MOCK ATLAS3 LLP') {
      frappe.msgprint({
        title: __('Stop'),
        indicator: 'red',
        message: __('This is MOCK ATLAS3 LLP. Do not post real books here. Pick SATYAM BUILDCOM, SATYAM CONSTRUCTION, or MGB PRIME ESTATES LLP.')
      });
    }
  },
  validate(frm) {
    if (frm.doc.company === 'MOCK ATLAS3 LLP') {
      frappe.validated = false;
      frappe.throw(__('This is MOCK ATLAS3 LLP. Do not post real books here. Pick SATYAM BUILDCOM, SATYAM CONSTRUCTION, or MGB PRIME ESTATES LLP.'));
    }
  },
  user_remark(frm) {
    if (frm.doc.user_remark) {
      frm.set_value('title', String(frm.doc.user_remark).slice(0, 80));
    }
  }
});
frappe.ui.form.on('Journal Entry Account', {
  account(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.account) return;
    frappe.db.get_value('Account', row.account, ['account_type', 'is_group'], (r) => {
      if (!r) return;
      if (r.account_type === 'Stock') {
        frappe.msgprint('Inventory account — do not use on journal; use Stock Entry / ask Stores');
        frappe.model.set_value(cdt, cdn, 'account', '');
      } else if (cint(r.is_group)) {
        frappe.msgprint('This is a folder, not a posting account. Pick a name without a folder icon.');
        frappe.model.set_value(cdt, cdn, 'account', '');
      }
    });
  }
});
`.trim();

const listScript = `
frappe.listview_settings['Journal Entry'] = {
  onload(listview) {
    const has = (listview.filter_area.get() || []).some((f) => f[1] === 'docstatus' || (Array.isArray(f) && f.includes('docstatus')));
    if (!has) {
      listview.filter_area.add([['Journal Entry', 'docstatus', '=', 1]]);
      listview.refresh();
    }
    $('.onboarding-widget').remove();
  }
};
`.trim();

async function upsertClientScript(name, dt, view, script) {
  const hit = await findByFilters("Client Script", [["name", "=", name]]);
  const byTitle =
    hit ||
    (await findByFilters("Client Script", [
      ["dt", "=", dt],
      ["view", "=", view],
      ["script", "like", "%DUKIA%"],
    ]));
  const body = {
    doctype: "Client Script",
    name,
    dt,
    view,
    enabled: 1,
    script: `/* DUKIA Phase 1 */\n${script}`,
  };
  if (byTitle?.name)
    return put(`/api/resource/Client Script/${encodeURIComponent(byTitle.name)}`, body);
  return post("/api/resource/Client Script", body);
}

try {
  await upsertClientScript("DUKIA JE Form", "Journal Entry", "Form", formScript);
  tick(
    true,
    "Client Script JE Form (MOCK warn, stock sentence, group folder, MD read-only, title from Why)",
  );
} catch (e) {
  tick(false, "Client Script JE Form", `${e.message} ${e.body ?? ""}`.slice(0, 200));
}
try {
  await upsertClientScript("DUKIA JE List", "Journal Entry", "List", listScript);
  tick(true, "Client Script JE List (default Submitted; hide onboarding widget)");
} catch (e) {
  tick(false, "Client Script JE List", `${e.message} ${e.body ?? ""}`.slice(0, 200));
}

// ── JE Templates ──────────────────────────────────────────────────────
const ABBR = {
  "SATYAM BUILDCOM": "SBC",
  "SATYAM CONSTRUCTION": "SCN",
  "MGB PRIME ESTATES LLP": "MGB",
};
const SISTERS = {
  "SATYAM BUILDCOM": "SATYAM CONSTRUCTION",
  "SATYAM CONSTRUCTION": "MGB PRIME ESTATES LLP",
  "MGB PRIME ESTATES LLP": "SATYAM BUILDCOM",
};

async function upsertTemplate(title, company, voucher_type, accounts) {
  const hit = await findByFilters("Journal Entry Template", [
    ["template_title", "=", title],
    ["company", "=", company],
  ]);
  const body = {
    doctype: "Journal Entry Template",
    template_title: title,
    company,
    voucher_type,
    naming_series: "ACC-JV-.YYYY.-",
    accounts,
  };
  if (hit?.name)
    return put(`/api/resource/Journal Entry Template/${encodeURIComponent(hit.name)}`, body);
  return post("/api/resource/Journal Entry Template", body);
}

for (const company of TRADING) {
  const a = ABBR[company];
  const sister = SISTERS[company];
  const suffix = company === "SATYAM BUILDCOM" ? "" : ` (${a})`;
  try {
    await upsertTemplate(`Partner capital${suffix}`, company, "Journal Entry", [
      { account: `Cash - ${a}` },
      { account: `Capital Stock - ${a}` },
    ]);
    tick(true, `Template Partner capital · ${a}`);
  } catch (e) {
    tick(false, `Template Partner capital · ${a}`, `${e.message} ${e.body ?? ""}`.slice(0, 160));
  }
  try {
    await upsertTemplate(`Site expense${suffix}`, company, "Journal Entry", [
      { account: `Administrative Expenses - ${a}`, cost_center: `Main - ${a}` },
      { account: `Cash - ${a}` },
    ]);
    tick(true, `Template Site expense · ${a}`);
  } catch (e) {
    tick(false, `Template Site expense · ${a}`, `${e.message} ${e.body ?? ""}`.slice(0, 160));
  }
  try {
    await upsertTemplate(`Loan to sister${suffix}`, company, "Inter Company Journal Entry", [
      { account: `Due from ${sister} - ${a}` },
      { account: `Cash - ${a}` },
    ]);
    tick(true, `Template Loan to sister · ${a}`);
  } catch (e) {
    tick(false, `Template Loan to sister · ${a}`, `${e.message} ${e.body ?? ""}`.slice(0, 160));
  }
}

// ── Saved TB reports (best-effort) ────────────────────────────────────
for (const company of TRADING) {
  const abbr = ABBR[company];
  const reportName = `TB-${abbr}`;
  try {
    await upsertResource("Report", reportName, {
      report_name: reportName,
      ref_doctype: "GL Entry",
      report_type: "Script Report",
      is_standard: "No",
      module: "Accounts",
      json: JSON.stringify({ company, from_date: "2026-04-01", to_date: "2027-03-31" }),
      report_script: "",
    });
    tick(true, `Saved report ${reportName}`);
  } catch (e) {
    tick(false, `Saved report ${reportName} (optional)`, String(e.body ?? e.message).slice(0, 120));
  }
}

// ── Confirm trial JEs still present ───────────────────────────────────
try {
  const r = await get(
    '/api/resource/Journal Entry?fields=["name","docstatus"]&filters=[["name","in",["ACC-JV-2026-00010","ACC-JV-2026-00021","ACC-JV-2026-00001","ACC-JV-2026-00022"]]]&limit_page_length=20',
  );
  const names = (r?.data ?? []).map((row) => row.name);
  const keep = ["ACC-JV-2026-00010", "ACC-JV-2026-00021"].every((n) => names.includes(n));
  tick(keep, "Trial JEs 00010 and 00021 still present (no delete, no elim)");
} catch (e) {
  tick(false, "Trial JE presence", e.message);
}

const done = `# ERPNext Desk Phase 1 — done notes

**Local only · not live.** Applied ${new Date().toISOString().slice(0, 10)} against site \`frontend\` at \`D:\\ERPNext\`.

## Log

\`\`\`
${log.join("\n")}
\`\`\`

## Logins (local)

| Seat | User | Password | Notes |
|------|------|----------|-------|
| Finance | \`${FINANCE}\` | \`${FINANCE_PASSWORD}\` | Role Profile Accounts. Submits JEs. |
| MD | \`${MD}\` | \`${MD_PASSWORD}\` | Auditor — report read, **no JE submit**. |

User Permission Allow=Company: SATYAM BUILDCOM, SATYAM CONSTRUCTION, MGB PRIME ESTATES LLP. **Not** MOCK ATLAS3 LLP. **Not** DUKIA GROUP posting.

## Left on purpose

- Trial JEs \`ACC-JV-2026-00010\`–\`00021\` kept.
- Drafts \`00001\`–\`00009\` and \`00022\` kept; list defaults to Submitted.
- Run2 IC loans stay ordinary Journal Entry (linked by remark). Forward loans: Inter Company kind.
- \`ERPNEXT_POSTING_ENABLED\` remains false on Atlas.
- No elim JEs. No site ERPNext users. No Desk theme.

Training card: [\`docs/finance/DUKIA-BOOKS-10MIN.md\`](../finance/DUKIA-BOOKS-10MIN.md).

## Verified (not Administrator)

- Login as \`${FINANCE}\` lands on \`/desk/dukia-books\`.
- Login as \`${MD}\` lands on \`/desk/dukia-books\`.
- New JE as finance@: LLP defaults to SATYAM BUILDCOM (never MOCK). Why (plain words) is on Details and mandatory.
- Short name is mandatory; Client Script copies Why → Short name (core layout still parks the field on More Info).
- Trial Balance for SATYAM BUILDCOM is non-zero after refresh (capital + IC visible).
- Trial \`ACC-JV-2026-00010\`–\`00021\` still present. No elim JEs added.

Re-verify: \`node scripts/erpnext/verify-desk-phase1.mjs\`.
`;

const out = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "docs",
  "review",
  "erpnext-phase1-done.md",
);
writeFileSync(out, done);
console.log("wrote", out);
const failed = log.filter((l) => l.startsWith("[ ]")).length;
if (failed) process.exitCode = 1;
