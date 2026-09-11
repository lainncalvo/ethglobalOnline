"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuctions, fetchHealth } from "@/lib/api";
import { POLL_MS } from "@/lib/constants";
import { HealthPanel } from "./HealthPanel";
import { LogPane, type LogEntry } from "./LogPane";
import { OperatorGate, readOperatorToken } from "./OperatorGate";
import { OperatorRow } from "./OperatorRow";

function ConsoleBody() {
  const token = readOperatorToken();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, refetchInterval: POLL_MS });
  const auctions = useQuery({ queryKey: ["auctions"], queryFn: fetchAuctions, refetchInterval: POLL_MS });

  return (
    <main className="mx-auto grid max-w-[1200px] gap-4 px-5 py-6">
      <h1>Operator</h1>
      {health.data ? <HealthPanel health={health.data.health} mocked={health.data.mocked} /> : <p>Loading health…</p>}
      <section className="card overflow-x-auto p-0">
        <table className="table">
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
                <td colSpan={5} className="muted">
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
      </section>
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
