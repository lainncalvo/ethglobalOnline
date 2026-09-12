import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { AuctionCard } from "../app/components/AuctionCard";
import { Address } from "../app/components/Address";
import { Amount, UsdcAmount } from "../app/components/Amount";
import { Countdown } from "../app/components/Countdown";
import { ExplorerLink } from "../app/components/ExplorerLink";
import type { AuctionView } from "../lib/types";

const appDirectory = resolve(import.meta.dir, "../app");

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(appDirectory, relativePath), "utf8");
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
  arcStatus: "Bidding",
  topBid: "12500000",
  bidCount: "3",
  winner: null,
  clearingPrice: null,
  awardSource: "None",
  links: {
    hashscanAuction: "https://hashscan.test/auction/42",
    hashscanToken: "https://hashscan.test/token/aa",
    arcscanEscrow: "https://arcscan.test/escrow/bb",
  },
};

describe("market workspace contracts", () => {
  test("keeps market query, clock, sorting, filtering, and state branches intact", () => {
    const source = readAppFile("components/MarketList.tsx");

    expect(source).toContain('queryKey: ["auctions"]');
    expect(source).toContain("queryFn: fetchAuctions");
    expect(source).toContain("refetchInterval: POLL_MS");
    expect(source).toContain("setInterval(() => setNowMs(Date.now()), 1_000)");
    expect(source).toContain("deadlineUnix(a.deadline) - deadlineUnix(b.deadline)");
    expect(source).toContain('filterAuctions(sorted, "open", nowMs).length');
    expect(source).toContain('filterAuctions(sorted, "closed", nowMs).length');
    expect(source).toContain("data?.mocked");
    expect(source).toContain("isPending");
    expect(source).toContain("error");
    expect(source).toContain("auctions.length === 0");
    expect(source).toContain('href="/sell"');
  });

  test("exposes market filters as an accessible segmented tab set", () => {
    const source = readAppFile("components/MarketList.tsx");

    expect(source).toContain('role="tablist"');
    expect(source).toContain('aria-label="Auction status"');
    expect(source).toContain('role="tab"');
    expect(source).toContain("aria-selected={selected}");
    expect(source).toContain('aria-controls="market-auction-list"');
    expect(source).toContain('id="market-auction-list"');
    expect(source).toContain('role="tabpanel"');
  });

  test("renders a complete auction row with preserved destinations and labels", () => {
    const markup = renderToStaticMarkup(
      <AuctionCard auction={AUCTION} nowMs={1_900_000_000_000} />,
    );

    expect(markup).toContain("ON Serie I 2027");
    expect(markup).toContain("ON27");
    expect(markup).toContain("Open");
    expect(markup).toContain("Hedera");
    expect(markup).toContain("Arc");
    expect(markup).toContain("Top bid");
    expect(markup).toContain("12.50 USDC");
    expect(markup).toContain("Bids");
    expect(markup).toContain('href="/auction/0xauction-ref"');
    expect(markup).toContain('href="https://hashscan.test/auction/42"');
    expect(markup).toContain('href="https://arcscan.test/escrow/bb"');
    expect(markup).toContain("HashScan auction");
    expect(markup).toContain("ArcScan escrow");
    expect(markup).toContain('class="market-auction');
  });

  test("renders data primitives with monospace and explicit affordances", () => {
    const amount = renderToStaticMarkup(<Amount value="1000000" decimals={6} />);
    const usdc = renderToStaticMarkup(<UsdcAmount value="12500000" />);
    const explorer = renderToStaticMarkup(
      <ExplorerLink chain="arc" hash="0x1234567890abcdef" />,
    );
    const address = renderToStaticMarkup(
      <Address value="0x00000000000000000000000000000000000000bb" />,
    );
    const countdown = renderToStaticMarkup(<Countdown deadline="2000000000" />);

    expect(amount).toContain('class="data-value');
    expect(amount).toContain("1.00 USDC");
    expect(usdc).toContain('class="data-value');
    expect(usdc).toContain("12.50 USDC");
    expect(explorer).toContain("Open Arc transaction in explorer");
    expect(explorer).toContain("↗");
    expect(address).toContain("Copy 0x00000000000000000000000000000000000000bb");
    expect(countdown).toContain('class="data-value countdown-value');
    expect(countdown).toContain("title=");
  });

  test("preserves address copy feedback and countdown timer behavior", () => {
    const address = readAppFile("components/Address.tsx");
    const countdown = readAppFile("components/Countdown.tsx");

    expect(address).toContain("navigator.clipboard.writeText(value!)");
    expect(address).toContain("setCopied(true)");
    expect(address).toContain("setTimeout(() => setCopied(false), 1200)");
    expect(countdown).toContain("deadlineUnix(deadline)");
    expect(countdown).toContain("isoUtc(unix)");
    expect(countdown).toContain("setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)");
    expect(countdown).toContain("clearInterval(id)");
  });

  test("loads focused market styles with a 390px overflow-safe layout", () => {
    const components = readAppFile("styles/components.css");
    const market = readAppFile("styles/market.css");
    const responsive = readAppFile("styles/responsive.css");

    expect(components).toContain('@import "./data.css";');
    expect(components).toContain('@import "./market.css";');
    expect(components).toContain('@import "./auction.css";');
    expect(market).toContain(".market-metrics");
    expect(market).toContain(".market-tabs");
    expect(market).toContain(".market-auction");
    expect(responsive).toContain("@media (max-width: 390px)");
    expect(responsive).toMatch(
      /\.market-auction__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
    );
    expect(responsive).toMatch(
      /\.market-auction\s*\{[^}]*min-width:\s*0;/s,
    );
  });
});
