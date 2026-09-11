import type { HealthResponse } from "@/lib/types";

export function HealthPanel({ health, mocked }: { health: HealthResponse; mocked?: boolean }) {
  return (
    <section className="card">
      <div className="mb-2 flex items-center justify-between">
        <h2>Health</h2>
        <span className="font-semibold">awardMode {health.awardMode}</span>
      </div>
      {mocked ? <p className="banner-warn mb-3">API offline — health is a stub.</p> : null}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold">Hedera ({health.hedera.chainId})</h3>
          <p>block {String(health.hedera.block)}</p>
          <p className="hash break-all">{health.hedera.operator}</p>
          <p>HBAR {health.hedera.hbar}</p>
        </div>
        <div>
          <h3 className="font-semibold">Arc ({health.arc.chainId})</h3>
          <p>block {String(health.arc.block)}</p>
          <p className="hash break-all">{health.arc.operator}</p>
          <p>USDC {health.arc.usdc}</p>
        </div>
      </div>
    </section>
  );
}
