#!/usr/bin/env node
/** Prove portal webhooks: auth, adapt, idempotency, email fallback. */
const BASE = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const SECRET = process.env.ATLAS_INGEST_SECRET || "atlas-local-ingest-2026";
const errors = [];

async function call(path, { method = "POST", headers = {}, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const cfg = await call("/api/ingest/config", { method: "GET" });
  if (cfg.status !== 200 || !cfg.json.urls?.["99acres"]) errors.push("config missing urls");

  const noAuth = await call("/api/ingest/99acres", {
    body: { name: "X", mobile: "9800000000" },
  });
  if (noAuth.status !== 401) errors.push(`expected 401, got ${noAuth.status}`);

  const phone = `98xxxx${String(Date.now()).slice(-4)}`;
  const payload = {
    lead_id: `qa-${Date.now()}`,
    name: "Webhook QA",
    mobile: phone,
    project_name: "Kanakpura Residences",
    budget: 8_100_000,
    requirement: "3 BHK",
    comments: "QA webhook",
  };
  const first = await call("/api/ingest/99acres", {
    headers: { "X-Atlas-Ingest-Secret": SECRET },
    body: payload,
  });
  if (first.status !== 200 || !first.json.ok) errors.push(`99acres first ${first.status} ${JSON.stringify(first.json)}`);
  if (first.json.ingest?.source !== "99acres") errors.push("adapter source not 99acres");

  const retry = await call("/api/ingest/99acres", {
    headers: { "X-Atlas-Ingest-Secret": SECRET },
    body: payload,
  });
  if (!retry.json.duplicate) errors.push("retry was not idempotent");

  const mail = await call("/api/ingest/email", {
    headers: { "X-Atlas-Ingest-Secret": SECRET },
    body: {
      subject: "New enquiry from MagicBricks",
      from: "leads@magicbricks.com",
      body: "Name: Email QA\nPhone: 91xxxx4422\nProject: KPR-01\nBudget: 7000000\nComment: parsed",
    },
  });
  if (mail.status !== 200 || mail.json.ingest?.source !== "magicbricks") {
    errors.push(`email fallback ${mail.status} ${JSON.stringify(mail.json)}`);
  }

  const report = { ok: errors.length === 0, errors };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
