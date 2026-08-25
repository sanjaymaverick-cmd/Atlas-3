import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PO_VENDOR_NOT_ACTIVE } from "@/lib/gates";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/commercial")({ component: Commercial });

function Commercial() {
  const {
    vendors,
    pos,
    contracts,
    documents,
    projects,
    entityId,
    projectId,
    advanceVendor,
    executeContract,
    inviteVendor,
    setVendorGstin,
  } = useAtlas();
  const projectIds = useMemo(
    () =>
      projects
        .filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId))
        .map((p) => p.id),
    [projects, entityId, projectId],
  );
  const scopedPos = pos.filter((p) => projectIds.includes(p.projectId));
  const scopedContracts = contracts.filter((c) => projectIds.includes(c.projectId));
  const [vname, setVname] = useState("");
  const [vtrade, setVtrade] = useState("Civil");
  const [vcity, setVcity] = useState("Jaipur");
  const [vgstin, setVgstin] = useState("");
  const [vendorFilter, setVendorFilter] = useState<"all" | "pending" | "active">("all");
  const pendingActivation = vendors.filter((v) => v.stage === "approval");
  const shownVendors = vendors.filter((v) => {
    if (vendorFilter === "pending")
      return (
        v.stage === "approval" ||
        v.stage === "invited" ||
        v.stage === "kyc" ||
        v.stage === "verified" ||
        v.stage === "bank" ||
        v.stage === "compliance"
      );
    if (vendorFilter === "active") return v.stage === "active";
    return true;
  });

  return (
    <div>
      <PageHeader
        kicker="Phase 4"
        title="Vendors and orders"
        description="Invite vendors here. Raise a purchase order in four steps: ask for prices, attach the paper quote, pick an Active vendor, raise the order."
      />
      <GateBanner>
        {PO_VENDOR_NOT_ACTIVE}{" "}
        <Link to="/app/approvals" className="underline-offset-4 hover:underline">
          Open Approvals
        </Link>
      </GateBanner>
      <p className="mb-6">
        <Button asChild className="h-12">
          <Link to="/app/quotations">Raise a purchase order (4 steps)</Link>
        </Button>
      </p>

      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Vendor name">
          <Input value={vname} onChange={(e) => setVname(e.target.value)} />
        </Field>
        <Field label="Trade">
          <Input value={vtrade} onChange={(e) => setVtrade(e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={vcity} onChange={(e) => setVcity(e.target.value)} />
        </Field>
        <Field label="GST number (tax ID)">
          <Input
            value={vgstin}
            onChange={(e) => setVgstin(e.target.value)}
            placeholder="Needed before the vendor can be fully approved"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button
            onClick={() => {
              if (!vname) return toast("Name required.");
              inviteVendor({ name: vname, trade: vtrade, city: vcity, gstin: vgstin });
              toast("Vendor invited.");
              setVname("");
            }}
          >
            Invite vendor
          </Button>
        </div>
      </Card>
      {pendingActivation.length ? (
        <GateBanner>
          {pendingActivation.length} vendor{pendingActivation.length === 1 ? "" : "s"} waiting for
          Managing Director activation.{" "}
          <Link to="/app/approvals" className="underline-offset-4 hover:underline">
            Open Approvals
          </Link>
        </GateBanner>
      ) : null}

      <h2 className="mb-3 font-display text-2xl">Vendors</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["pending", "Pending activation"],
            ["active", "Active"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={vendorFilter === id ? "default" : "outline"}
            onClick={() => setVendorFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shownVendors.map((v) => (
          <Card key={v.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{v.name}</p>
              <p className="text-xs text-muted">
                {v.trade} · {v.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={v.stage} />
              {!v.gstin || v.gstin === "—" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const gst = window.prompt("GSTIN");
                    if (!gst) return;
                    const err = setVendorGstin(v.id, gst);
                    toast(err ?? "GSTIN saved.");
                  }}
                >
                  GSTIN
                </Button>
              ) : null}
              {v.stage !== "active" && v.stage !== "suspended" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const err = advanceVendor(v.id);
                    toast(
                      err ??
                        (v.stage === "compliance" || v.stage === "approval"
                          ? `Sent ${v.name} to Approvals.`
                          : `Moved ${v.name}.`),
                    );
                  }}
                >
                  {v.stage === "approval"
                    ? "Send to MD"
                    : v.stage === "compliance"
                      ? "Send for activation"
                      : "Advance"}
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Orders & contracts</h2>
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
                        const evidence = documents.find(
                          (d) => d.projectId === c.projectId && d.status === "issued",
                        )?.id;
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
