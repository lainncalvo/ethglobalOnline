"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuctions, fetchHealth } from "@/lib/api";
import { POLL_MS } from "@/lib/constants";
import { HealthPanel } from "./HealthPanel";
import { HederaOperatorActions } from "./HederaOperatorActions";
import { LogPane, type LogEntry } from "./LogPane";
import { OperatorGate, readOperatorToken } from "./OperatorGate";
import { OperatorRow } from "./OperatorRow";

function ConsoleBody() {
  const token = readOperatorToken();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, refetchInterval: POLL_MS });
  const auctions = useQuery({ queryKey: ["auctions"], queryFn: fetchAuctions, refetchInterval: POLL_MS });

  return (
    <main className="workspace-main operator-cockpit">
      <header className="operator-cockpit__header">
        <div>
          <p className="operator-eyebrow">Settlement control</p>
          <h1>Operator</h1>
        </div>
        <p className="muted">
          Monitor both networks, advance eligible lots, and retain an audit trail.
        </p>
      </header>

      {health.data ? (
        <HealthPanel health={health.data.health} mocked={health.data.mocked} />
      ) : (
        <p className="banner-neutral operator-state" role="status">
          Loading health…
        </p>
      )}

      <section className="card operator-lots" aria-labelledby="operator-lots-title">
        <header className="operator-section-heading">
          <div>
            <p className="operator-eyebrow">Execution queue</p>
            <h2 id="operator-lots-title">Auction lots</h2>
          </div>
          <span className="operator-lots__count">
            {(auctions.data?.auctions ?? []).length} lots
          </span>
        </header>
        <div
          className="operator-table-scroll"
          role="region"
          aria-label="Operator auction lots"
          tabIndex={0}
        >
          <table className="table operator-table">
            <caption className="sr-only">Auction lots and operator actions</caption>
          <thead>
            <tr>
              <th>Id</th>
              <th>Status</th>
              <th>Seller</th>
              <th>Top bid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(auctions.data?.auctions ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="muted operator-table__empty">
                  No auctions.
                </td>
              </tr>
            ) : (
              (auctions.data?.auctions ?? []).map((auction) => (
                <OperatorRow
                  key={auction.ref}
                  auction={auction}
                  token={token}
                  onLog={(entry) => setLogs((prev) => [entry, ...prev])}
                />
              ))
            )}
          </tbody>
          </table>
        </div>
      </section>
      <HederaOperatorActions
        auctions={auctions.data?.auctions ?? []}
        token={token}
        onLog={(entry) => setLogs((prev) => [entry, ...prev])}
      />
      <LogPane entries={logs} />
    </main>
  );
}

export function OperatorConsole() {
  return (
    <OperatorGate>
      <ConsoleBody />
    </OperatorGate>
  );
}
