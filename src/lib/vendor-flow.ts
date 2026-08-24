import type { Approval, Project, Vendor } from "./types";

export const VENDOR_NEXT: Record<string, Vendor["stage"] | undefined> = {
  invited: "kyc",
  kyc: "verified",
  verified: "bank",
  bank: "compliance",
  compliance: "approval",
};

export function vendorApprovalCard(vendor: Vendor, projectId: string, id: string): Approval {
  return {
    id,
    kind: "Vendor",
    title: `Activate ${vendor.name}`,
    projectId,
    waitingOn: "Managing Director",
    agingDays: 0,
    status: "pending",
    refId: vendor.id,
    context: "GST / identity complete. Approve to Active so quotes can be selected and a purchase order can be raised.",
  };
}

/** Vendors already at `approval` with no pending card — the DUKIA dead end. */
export function ensureVendorActivationCards(
  vendors: Vendor[],
  approvals: Approval[],
  projects: Project[],
): Approval[] {
  const out = [...approvals];
  const fallbackProject = projects[0]?.id ?? "p_av";
  for (const v of vendors) {
    if (v.stage !== "approval") continue;
    const pending = out.some((a) => a.kind === "Vendor" && a.refId === v.id && a.status === "pending");
    if (pending) continue;
    out.unshift(vendorApprovalCard(v, fallbackProject, `a_act_${v.id}`));
  }
  return out;
}
