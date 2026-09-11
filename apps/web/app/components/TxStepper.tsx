import type { TxStep } from "@/lib/types";
import { ExplorerLink } from "./ExplorerLink";

export function TxStepper({ steps }: { steps: TxStep[] }) {
  return (
    <ol className="grid gap-2">
      {steps.map((step, index) => (
        <li key={step.id} className="card flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">
              {index + 1}. {step.label}
            </p>
            <p className="muted text-sm capitalize">{step.status === "idle" ? "waiting" : step.status}</p>
            {step.error ? <p className="text-[var(--bad)]">{step.error}</p> : null}
          </div>
          <div className="text-right">
            {step.status === "pending" ? <span className="font-semibold">pending…</span> : null}
            {step.hash && step.chain ? <ExplorerLink chain={step.chain} hash={step.hash} /> : null}
            {step.status === "done" && !step.hash ? <span className="text-[var(--ok)]">done</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
