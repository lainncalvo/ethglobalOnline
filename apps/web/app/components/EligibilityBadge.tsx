import { eligibilityLabel } from "@/lib/format";
import type { ComplianceStatus } from "@/lib/types";

export function EligibilityBadge({ status }: { status?: ComplianceStatus | null }) {
  if (!status) {
    return (
      <div className="eligibility-status" data-eligibility="unknown" role="status">
        <span className="eligibility-status__dot" aria-hidden="true" />
        <div>
          <p className="market-phase">Eligibility</p>
          <p>Connect a wallet to check eligibility.</p>
        </div>
      </div>
    );
  }
  const label = eligibilityLabel(status);
  return (
    <div
      className={`eligibility-status ${label.tone === "ok" ? "eligibility-status--ok" : "eligibility-status--bad"}`}
      data-eligibility={label.tone === "ok" ? "eligible" : "ineligible"}
      role="status"
    >
      <span className="eligibility-status__dot" aria-hidden="true" />
      <div>
        <p className="market-phase">Eligibility</p>
        <p>{label.text}</p>
      </div>
    </div>
  );
}
