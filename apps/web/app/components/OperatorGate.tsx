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

  if (!ready) return <main className="mx-auto max-w-[1200px] px-5 py-6">Loading…</main>;

  if (!stored) {
    return (
      <main className="mx-auto max-w-[640px] px-5 py-10">
        <h1 className="mb-3">Operator</h1>
        <p className="muted mb-4">Paste OPERATOR_UI_TOKEN. It stays in sessionStorage for this tab.</p>
        <form
          className="grid gap-3"
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
      </main>
    );
  }

  return (
    <>
      {children}
      <div className="mx-auto max-w-[1200px] px-5 pb-6">
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
    </>
  );
}

export function readOperatorToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(OPERATOR_TOKEN_KEY) ?? "";
}
