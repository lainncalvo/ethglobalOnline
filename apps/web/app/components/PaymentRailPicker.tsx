"use client";

export type PaymentRail = "arc" | "hedera";

export function PaymentRailPicker({
  value,
  onChange,
}: {
  value: PaymentRail;
  onChange: (rail: PaymentRail) => void;
}) {
  return (
    <section className="card order-ticket" aria-label="Payment rail">
      <div className="order-ticket__header">
        <div>
          <p className="market-phase">Cash leg</p>
          <h2>Pay with</h2>
        </div>
      </div>
      <p className="muted">
        Arc uses the existing USDC escrow and Chainlink award. Hedera uses native USDC on testnet.
      </p>
      <div className="order-ticket__actions" role="group" aria-label="Choose payment network">
        <button
          type="button"
          className={value === "arc" ? "btn btn-primary" : "btn"}
          aria-pressed={value === "arc"}
          onClick={() => onChange("arc")}
        >
          Arc USDC
        </button>
        <button
          type="button"
          className={value === "hedera" ? "btn btn-primary" : "btn"}
          aria-pressed={value === "hedera"}
          onClick={() => onChange("hedera")}
        >
          Hedera USDC
        </button>
      </div>
    </section>
  );
}
