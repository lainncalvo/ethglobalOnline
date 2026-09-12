"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OPERATOR_TOKEN_KEY } from "@/lib/constants";

export function OperatorGate({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [stored, setStored] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStored(sessionStorage.getItem(OPERATOR_TOKEN_KEY));
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="operator-gate operator-gate--loading" role="status" aria-live="polite">
        <p className="banner-neutral">Loading operator session…</p>
      </main>
    );
  }

  if (!stored) {
    return (
      <main className="operator-gate">
        <section className="card operator-gate__panel" aria-labelledby="operator-gate-title">
          <header>
            <p className="operator-eyebrow">Restricted operations</p>
            <h1 id="operator-gate-title">Operator</h1>
            <p className="muted">
              Paste OPERATOR_UI_TOKEN. It stays in sessionStorage for this tab.
            </p>
          </header>
          <form
            className="operator-gate__form"
            onSubmit={(event) => {
              event.preventDefault();
              sessionStorage.setItem(OPERATOR_TOKEN_KEY, token.trim());
              setStored(token.trim());
            }}
          >
            <div className="field">
              <label htmlFor="op-token">Operator token</label>
              <input
                id="op-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!token.trim()}>
              Unlock
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      {children}
      <div className="operator-lockbar" aria-label="Operator session">
        <div className="operator-lockbar__inner">
          <p>
            <span className="operator-status-dot" aria-hidden="true" />
            Console unlocked for this tab
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              sessionStorage.removeItem(OPERATOR_TOKEN_KEY);
              setStored(null);
            }}
          >
            Lock console
          </button>
        </div>
      </div>
    </>
  );
}

export function readOperatorToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(OPERATOR_TOKEN_KEY) ?? "";
}
