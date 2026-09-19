const LABELS: Record<string, string> = {
  pending: "Pending review",
  active: "Active",
  suspended: "Suspended",
  approved: "Approved",
  rejected: "Rejected",
  draft: "Draft",
};

const CLASS_BY_STATUS: Record<string, string> = {
  pending: "status-pill-pending",
  active: "status-pill-active",
  suspended: "status-pill-suspended",
  approved: "status-pill-approved",
  rejected: "status-pill-rejected",
  draft: "status-pill-draft",
};

export default function StatusPill({ status }: { status: string }) {
  const cls = CLASS_BY_STATUS[status] ?? "status-pill-draft";
  const label = LABELS[status] ?? status;
  return <span className={cls}>{label}</span>;
}
