import { eligibilityLabel } from "@/lib/format";
import type { ComplianceStatus } from "@/lib/types";

export function EligibilityBadge({ status }: { status?: ComplianceStatus | null }) {
  if (!status) {
    return <p className="muted">Connect a wallet to check eligibility.</p>;
  }
  const label = eligibilityLabel(status);
  return (
    <div className={label.tone === "ok" ? "banner-ok" : "banner-bad"} role="status">
      {label.text}
    </div>
  );
}
