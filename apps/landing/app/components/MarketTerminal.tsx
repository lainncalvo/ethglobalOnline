import { CheckShieldIcon, HoldIcon, ReserveIcon } from "./Icons";

const auctionRows = [
  { icon: HoldIcon, label: "Asset hold", value: "Live" },
  { icon: ReserveIcon, label: "Sealed reserve", value: "Committed" },
  { icon: CheckShieldIcon, label: "Eligible bids", value: "Open" },
  { icon: HoldIcon, label: "Settlement", value: "At auction close" },
];

const timeline = ["Listed", "Bidding", "Awarded", "Delivered", "Paid"];

export function MarketTerminal() {
  return (
    <div className="terminal" aria-label="Illustrative Remate exit auction">
      <div className="terminal-header">
        <span>Exit auction · ONS1</span>
        <span className="terminal-live">
          <span className="status-dot" />
          Testnet market
        </span>
        <span className="ml-auto text-[var(--dim)]" aria-hidden="true">•••</span>
      </div>

      <div className="terminal-rows">
        {auctionRows.map(({ icon: Icon, label, value }, index) => (
          <div className="terminal-row" key={label}>
            <Icon className="h-[18px] w-[18px] text-[var(--muted)]" />
            <span>{label}</span>
            <span className={index === 0 ? "ml-auto text-[var(--green)]" : "ml-auto text-[var(--ivory)]"}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="terminal-market">
        <div>
          <p className="data-label">Illustrative cycle</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="timer">02 : 17 : 43</span>
          </div>
          <div className="mt-1 flex w-[208px] justify-between text-[0.58rem] uppercase tracking-[0.2em] text-[var(--dim)]">
            <span>Hrs</span>
            <span>Min</span>
            <span>Sec</span>
          </div>
        </div>

        <div className="market-curve" aria-hidden="true">
          <svg viewBox="0 0 260 90" preserveAspectRatio="none">
            <path className="curve-grid" d="M0 22.5H260M0 45H260M0 67.5H260" />
            <path
              className="curve-line"
              d="M0 76 C18 78 22 66 39 69 S61 56 79 60 S103 49 119 52 S143 39 158 43 S182 28 198 33 S218 18 232 21 S247 12 260 14"
            />
          </svg>
          <div className="mt-1 flex justify-between text-[0.55rem] uppercase tracking-[0.16em] text-[var(--dim)]">
            <span>Reserve</span>
            <span>Higher eligible bid</span>
          </div>
        </div>
      </div>

      <div className="compliance-row">
        <CheckShieldIcon className="h-9 w-9 shrink-0 text-[var(--green)]" />
        <div>
          <p className="data-label text-[var(--ivory)]">ATS compliant</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Only wallets already KYC&apos;d for that bond can bid. The token
            enforces it again at delivery.
          </p>
        </div>
        <span className="ml-auto hidden items-center gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-[var(--green)] sm:flex">
          <span className="status-dot" />
          Verified
        </span>
      </div>

      <div className="timeline" aria-label="Auction settlement stages">
        {timeline.map((stage, index) => (
          <div className="timeline-step" key={stage}>
            <span className={`timeline-node ${index < 2 ? "timeline-node-active" : ""}`} />
            <span>{stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
