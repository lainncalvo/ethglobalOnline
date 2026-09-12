import type { TxStep } from "@/lib/types";
import { ExplorerLink } from "./ExplorerLink";

export function TxStepper({ steps }: { steps: TxStep[] }) {
  return (
    <ol className="tx-ledger" aria-label="Listing progress" aria-live="polite">
      {steps.map((step, index) => (
        <li key={step.id} className="tx-ledger__step" data-state={step.status}>
          <span className="tx-ledger__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="tx-ledger__body">
            <p className="tx-ledger__label">{step.label}</p>
            <p className="market-phase">{step.status === "idle" ? "waiting" : step.status}</p>
            {step.error ? <p className="tx-ledger__error">{step.error}</p> : null}
          </div>
          <div className="tx-ledger__result">
            {step.status === "pending" ? <span className="font-semibold">pending…</span> : null}
            {step.hash && step.chain ? <ExplorerLink chain={step.chain} hash={step.hash} /> : null}
            {step.status === "done" && !step.hash ? <span className="tx-ledger__done">done</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
