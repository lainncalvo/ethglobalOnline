import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionReceipt } from "../app/components/ActionReceipt";
import { HealthPanel } from "../app/components/HealthPanel";
import { LogPane } from "../app/components/LogPane";
import { OperatorRow } from "../app/components/OperatorRow";
import { OutcomeCard } from "../app/components/OutcomeCard";
import type { ArcStatus, AuctionDetail, AuctionView } from "../lib/types";

const appDirectory = resolve(import.meta.dir, "../app");
const webDirectory = resolve(import.meta.dir, "..");
const TX_A = `0x${"1".repeat(64)}`;
const TX_B = `0x${"2".repeat(64)}`;
const TX_H = `0x${"3".repeat(64)}`;

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(appDirectory, relativePath), "utf8");
}

function readWebFile(relativePath: string): string {
  return readFileSync(resolve(webDirectory, relativePath), "utf8");
}

const AUCTION: AuctionView = {
  ref: "0xauction-ref",
  hederaAuctionId: "42",
  token: "0x00000000000000000000000000000000000000aa",
  tokenName: "ON Serie I 2027",
  tokenSymbol: "ON27",
  seller: "0x00000000000000000000000000000000000000bb",
  amount: "10",
  deadline: "2000000000",
  hederaStatus: "Open",
  arcStatus: "None",
  topBid: "12500000",
  bidCount: "2",
  winner: "0x00000000000000000000000000000000000000cc",
  clearingPrice: "12500000",
  awardSource: "Operator",
  links: {
    hashscanAuction: "https://hashscan.test/auction/42",
    hashscanToken: "https://hashscan.test/token/aa",
    arcscanEscrow: "https://arcscan.test/escrow/bb",
  },
};

function outcomeDetail(arcStatus: ArcStatus): AuctionDetail {
  return {
    ...AUCTION,
    arcStatus,
    hederaTxHash: TX_H,
    bids: [],
    timeline: [
      { step: "listed", chain: "hedera", txHash: `0x${"4".repeat(64)}`, at: "listed-at" },
      { step: "awarded", chain: "arc", txHash: TX_A, at: "awarded-at" },
      { step: "paid", chain: "arc", txHash: TX_B, at: "paid-at" },
    ],
  };
}

describe("operator immutable behavior contracts", () => {
  test("preserves gate storage, guards, handlers, and child rendering", () => {
    const source = readAppFile("components/OperatorGate.tsx");

    expect(source).toContain("sessionStorage.getItem(OPERATOR_TOKEN_KEY)");
    expect(source).toContain("if (!ready)");
    expect(source).toContain("if (!stored)");
    expect(source).toContain("event.preventDefault()");
    expect(source).toContain("sessionStorage.setItem(OPERATOR_TOKEN_KEY, token.trim())");
    expect(source).toContain("setStored(token.trim())");
    expect(source).toContain("disabled={!token.trim()}");
    expect(source).toContain("{children}");
    expect(source).toContain("sessionStorage.removeItem(OPERATOR_TOKEN_KEY)");
    expect(source).toContain("setStored(null)");
    expect(source).toContain('if (typeof window === "undefined") return "";');
  });

  test("preserves polling queries and auction rendering", () => {
    const source = readAppFile("components/OperatorConsole.tsx");

    expect(source).toContain('queryKey: ["health"]');
    expect(source).toContain("queryFn: fetchHealth");
    expect(source).toContain('queryKey: ["auctions"]');
    expect(source).toContain("queryFn: fetchAuctions");
    expect(source.match(/refetchInterval: POLL_MS/g)?.length).toBe(2);
    expect(source).toContain("(auctions.data?.auctions ?? []).map((auction)");
    expect(source).toContain("setLogs((prev) => [entry, ...prev])");
  });

  test("preserves operator endpoints, authorization, and JSON payloads", () => {
    const source = readWebFile("lib/api.ts");

    expect(source).toContain('headers.Authorization = `Bearer ${token}`');
    expect(source).toContain('{ "Content-Type": "application/json" }');
    expect(source).toContain("body: JSON.stringify(body ?? {})");
    expect(source).toContain('fetch("/api/health", { cache: "no-store" })');
    expect(source).toContain('fetch("/api/auctions", { cache: "no-store" })');
    expect(source).toContain('"/api/auctions",');
    expect(source).toContain("{ hederaAuctionId }");
    expect(source).toContain("`/api/auctions/${ref}/close`, {}, token");
    expect(source).toContain("`/api/auctions/${ref}/settle-preview`,");
    expect(source).toContain("{ to },");
    expect(source).toContain("`/api/auctions/${ref}/settle`, {}, token");
    expect(source).toContain("`/api/auctions/${ref}/void`, { reason }, token");
    expect(source).toContain("`/api/auctions/${ref}/cancel`, {}, token");
  });

  test("preserves action order, calls, inputs, and disabled predicates", () => {
    const source = readAppFile("components/OperatorRow.tsx");
    const labels = ["Register", "Close", "Preview", "Settle", "Void", "Cancel"];
    const positions = labels.map(
      (label) => source.match(new RegExp(`>\\s*${label}\\s*</button>`))?.index ?? -1,
    );

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(source).toContain('auction.arcStatus === "None"');
    expect(source).toContain('run("register", () => registerAuction(auction.hederaAuctionId))');
    expect(source).toContain('run("close", () => closeAuction(auction.ref, token))');
    expect(source).toContain('run("settle-preview", () => settlePreview(auction.ref, to, token))');
    expect(source).toContain('run("settle", () => settleAuction(auction.ref, token))');
    expect(source).toContain('run("void", () => voidAuction(auction.ref, reason, token))');
    expect(source).toContain('run("cancel", () => cancelAuction(auction.ref, token))');
    expect(source.match(/disabled=\{Boolean\(busy\)\}/g)?.length).toBe(4);
    expect(source).toContain("disabled={Boolean(busy) || !to}");
    expect(source).toContain("disabled={Boolean(busy) || !reason}");
  });
});

describe("receipt behavior and presentation contracts", () => {
  test("renders compact receipt details and both explorer destinations", () => {
    const markup = renderToStaticMarkup(
      <ActionReceipt
        title="Bid placed"
        summary="Escrowed 12.50 USDC on Arc"
        details={[{ label: "Your bid", value: "12.50 USDC" }]}
        links={[
          { label: "Escrowed", chain: "arc", hash: TX_A },
          { label: "Bonds delivered", chain: "hedera", hash: TX_H },
        ]}
      />,
    );

    expect(markup).toContain('class="card action-receipt');
    expect(markup).toContain('aria-label="Bid placed transaction receipt"');
    expect(markup).toContain("Transaction receipt");
    expect(markup).toContain("Your bid");
    expect(markup).toContain("12.50 USDC");
    expect(markup).toContain(`/tx/${TX_A}`);
    expect(markup).toContain(`/transaction/${TX_H}`);
    expect(markup).toContain('aria-label="Transaction evidence"');
  });

  test("keeps optional details and links absent when omitted", () => {
    const markup = renderToStaticMarkup(
      <ActionReceipt title="Recorded" summary="No evidence yet" links={[]} />,
    );

    expect(markup).not.toContain("<dl");
    expect(markup).not.toContain("<ul");
    expect(markup).toContain("No evidence yet");
  });

  test("preserves all outcome branches and transaction link rules", () => {
    expect(renderToStaticMarkup(<OutcomeCard detail={outcomeDetail("Bidding")} />)).toBe("");

    const awarded = renderToStaticMarkup(<OutcomeCard detail={outcomeDetail("Awarded")} />);
    expect(awarded).toContain("Winner selected — delivery pending");
    expect(awarded).toContain("Winner selected on Arc. Hedera delivery has not confirmed yet.");
    expect(awarded).toContain("Awarded");
    expect(awarded).not.toContain("Paid");
    expect(awarded).toContain("Bonds delivered");

    const settled = renderToStaticMarkup(<OutcomeCard detail={outcomeDetail("Settled")} />);
    expect(settled).toContain("Auction settled");
    expect(settled).toContain("Bonds delivered on Hedera and USDC released on Arc.");
    expect(settled).toContain("Paid");

    for (const status of ["NoWinner", "Voided", "Cancelled", "Expired"] as const) {
      const markup = renderToStaticMarkup(<OutcomeCard detail={outcomeDetail(status)} />);
      const label = status === "NoWinner" ? "No winner" : status;
      expect(markup).toContain(`Auction ended as ${label}.`);
    }
  });
});

describe("operator cockpit presentation contracts", () => {
  test("renders health as semantic network status cards without changing values", () => {
    const markup = renderToStaticMarkup(
      <HealthPanel
        mocked
        health={{
          hedera: { chainId: 296, block: "100", operator: "0xhedera", hbar: "8.5" },
          arc: { chainId: 5042002, block: "200", operator: "0xarc", usdc: "20" },
          addresses: {},
          awardMode: "local",
        }}
      />,
    );

    expect(markup).toContain('aria-label="System health"');
    expect(markup).toContain("API offline — health is a stub.");
    expect(markup).toContain("Hedera");
    expect(markup).toContain("296");
    expect(markup).toContain("0xhedera");
    expect(markup).toContain("HBAR 8.5");
    expect(markup).toContain("Arc");
    expect(markup).toContain("5042002");
    expect(markup).toContain("USDC 20");
    expect(markup).toContain("awardMode local");
  });

  test("renders lot actions as a named group and keeps initial disabled states", () => {
    const markup = renderToStaticMarkup(
      <table>
        <tbody>
          <OperatorRow auction={AUCTION} token="secret" onLog={() => undefined} />
        </tbody>
      </table>,
    );

    expect(markup).toContain('class="operator-lot');
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-label="Actions for auction 42"');
    expect(markup).toContain("Register");
    expect(markup).toContain("Close");
    expect(markup).toContain("Settle");
    expect(markup).toMatch(/>Preview<\/button>/);
    expect(markup).toMatch(/>Void<\/button>/);
    expect(markup.match(/disabled=""/g)?.length).toBe(2);
  });

  test("renders an empty log and a keyboard-scrollable audit entry", () => {
    const empty = renderToStaticMarkup(<LogPane entries={[]} />);
    expect(empty).toContain("No operator calls yet.");
    expect(empty).toContain('role="status"');

    const populated = renderToStaticMarkup(
      <LogPane
        entries={[{ at: "2026-09-11T00:00:00.000Z", action: "settle 42", body: { arcTxHash: TX_A } }]}
      />,
    );
    expect(populated).toContain('aria-label="Operator audit log"');
    expect(populated).toContain('tabindex="0"');
    expect(populated).toContain("2026-09-11T00:00:00.000Z");
    expect(populated).toContain("arcTxHash");
    expect(populated).toContain(TX_A);
    expect(readAppFile("components/LogPane.tsx")).toContain(
      "JSON.stringify(entry.body, null, 2)",
    );
    expect(populated).toContain(`/tx/${TX_A}`);
  });

  test("loads modular receipt/operator CSS with 390px reflow and no legacy borders", () => {
    const components = readAppFile("styles/components.css");
    const responsive = readAppFile("styles/responsive.css");
    const operatorResponsive = readAppFile("styles/operator-responsive.css");
    const receiptsResponsive = readAppFile("styles/receipts-responsive.css");
    const targetSources = [
      "components/ActionReceipt.tsx",
      "components/OutcomeCard.tsx",
      "components/OperatorGate.tsx",
      "components/OperatorConsole.tsx",
      "components/OperatorRow.tsx",
      "components/HealthPanel.tsx",
      "components/LogPane.tsx",
    ].map(readAppFile).join("\n");

    expect(components).toContain('@import "./receipts.css";');
    expect(components).toContain('@import "./operator.css";');
    expect(components).toContain('@import "./operator-log.css";');
    expect(responsive).toContain('@import "./receipts-responsive.css";');
    expect(responsive).toContain('@import "./operator-responsive.css";');
    expect(operatorResponsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.operator-table[\s\S]*display:\s*block/,
    );
    expect(receiptsResponsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.action-receipt__detail[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    expect(targetSources).not.toMatch(/border-\[#(?:ccc|ddd|eee)\]/i);
  });

  test("keeps transaction errors and feedback semantically announced", () => {
    const source = readAppFile("components/TxError.tsx");

    expect(source).toContain('className="banner-bad tx-error" role="alert"');
    expect(source).toContain('"banner-neutral"');
    expect(source).toContain('role="status"');
    expect(source).toContain("open && decoded.raw");
  });
});
