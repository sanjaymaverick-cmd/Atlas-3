import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/commercial")({ component: Commercial });

function Commercial() {
  const { vendors, pos, contracts, documents, projects, entityId, projectId, advanceVendor, createPO, executeContract, inviteVendor, setVendorGstin } = useAtlas();
  const projectIds = useMemo(
    () => projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id),
    [projects, entityId, projectId],
  );
  const scopedPos = pos.filter((p) => projectIds.includes(p.projectId));
  const scopedContracts = contracts.filter((c) => projectIds.includes(c.projectId));
  const defaultProject = projectIds[0] ?? "";
  const [vendorId, setVendorId] = useState("v1");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("2500000");
  const [pid, setPid] = useState(defaultProject);
  const [vname, setVname] = useState("");
  const [vtrade, setVtrade] = useState("Civil");
  const [vcity, setVcity] = useState("Jaipur");
  const [vgstin, setVgstin] = useState("");

  return (
    <div>
      <PageHeader
        kicker="Phase 4"
        title="Commercial"
        description="Vendor must be Active before a PO. Prefer Quotations → select → Create PO so Approvals shows the quote trail."
      />
      <p className="mb-6">
        <Button asChild>
          <Link to="/app/quotations">Open Quotations — RFQ, compare, select, then PO</Link>
        </Button>
      </p>

      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Vendor name"><Input value={vname} onChange={(e) => setVname(e.target.value)} /></Field>
        <Field label="Trade"><Input value={vtrade} onChange={(e) => setVtrade(e.target.value)} /></Field>
        <Field label="City"><Input value={vcity} onChange={(e) => setVcity(e.target.value)} /></Field>
        <Field label="GSTIN"><Input value={vgstin} onChange={(e) => setVgstin(e.target.value)} placeholder="Required before verification" /></Field>
        <div className="sm:col-span-2">
          <Button onClick={() => {
            if (!vname) return toast("Name required.");
            inviteVendor({ name: vname, trade: vtrade, city: vcity, gstin: vgstin });
            toast("Vendor invited.");
            setVname("");
          }}>Invite vendor</Button>
        </div>
      </Card>
      <h2 className="mb-3 font-display text-2xl">Vendors</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {vendors.map((v) => (
          <Card key={v.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{v.name}</p>
              <p className="text-xs text-muted">
                {v.trade} · {v.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={v.stage} />
              {(!v.gstin || v.gstin === "—") ? (
                <Button size="sm" variant="outline" onClick={() => {
                  const gst = window.prompt("GSTIN");
                  if (!gst) return;
                  const err = setVendorGstin(v.id, gst);
                  toast(err ?? "GSTIN saved.");
                }}>GSTIN</Button>
              ) : null}
              {v.stage !== "active" && v.stage !== "suspended" ? (
                <Button size="sm" variant="outline" onClick={() => {
                  const err = advanceVendor(v.id);
                  toast(err ?? `Moved ${v.name}.`);
                }}>
                  Advance
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Issue purchase order</h2>
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
          >
            {projects
              .filter((p) => p.entityId === entityId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Vendor">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.stage})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Amount (INR)">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button
            onClick={() => {
              const err = createPO({
                projectId: pid,
                vendorId,
                title: title || "Untitled package",
                amount: Number(amount) || 0,
              });
              if (err) toast(err);
              else toast("PO submitted — waiting in Approvals.");
            }}
          >
            Submit PO
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 font-display text-2xl">Orders & contracts</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Record</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {scopedPos.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="px-4 py-3">{p.title}</td>
                <td className="px-4 py-3">{vendors.find((v) => v.id === p.vendorId)?.name}</td>
                <td className="px-4 py-3 tabular-nums">{inr(p.amount, true)}</td>
                <td className="px-4 py-3">
                  <Status value={p.status} />
                </td>
              </tr>
            ))}
            {scopedContracts.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{c.title}</td>
                <td className="px-4 py-3">{vendors.find((v) => v.id === c.vendorId)?.name}</td>
                <td className="px-4 py-3 tabular-nums">{inr(c.value, true)}</td>
                <td className="px-4 py-3">
                  <Status value={c.status} />
                  {c.status === "approved" || c.status === "execution" ? (
                    <Button
                      size="sm"
                      className="ml-2"
                      variant="outline"
                      onClick={() => {
                        const evidence = documents.find((d) => d.projectId === c.projectId && d.status === "issued")?.id;
                        const err = executeContract(c.id, evidence ?? "");
                        toast(err ?? "Executed with document evidence.");
                      }}
                    >
                      Execute
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
