import type { HealthResponse } from "@/lib/types";

export function HealthPanel({ health, mocked }: { health: HealthResponse; mocked?: boolean }) {
  return (
    <section className="card operator-health" aria-label="System health">
      <header className="operator-section-heading">
        <div>
          <p className="operator-eyebrow">Infrastructure</p>
          <h2>Health</h2>
        </div>
        <span className="operator-health__mode">awardMode {health.awardMode}</span>
      </header>
      {mocked ? (
        <p className="banner-warn operator-health__notice" role="status">
          API offline — health is a stub.
        </p>
      ) : null}
      <div className="operator-health__networks">
        <article className="operator-network" data-network="hedera">
          <header className="operator-network__header">
            <h3>Hedera</h3>
            <span className="operator-network__chain">chain {health.hedera.chainId}</span>
          </header>
          <p className="operator-network__block">block {String(health.hedera.block)}</p>
          <p className="hash operator-network__address">{health.hedera.operator}</p>
          <p className="operator-network__balance">HBAR {health.hedera.hbar}</p>
        </article>
        <article className="operator-network" data-network="arc">
          <header className="operator-network__header">
            <h3>Arc</h3>
            <span className="operator-network__chain">chain {health.arc.chainId}</span>
          </header>
          <p className="operator-network__block">block {String(health.arc.block)}</p>
          <p className="hash operator-network__address">{health.arc.operator}</p>
          <p className="operator-network__balance">USDC {health.arc.usdc}</p>
        </article>
      </div>
    </section>
  );
}
