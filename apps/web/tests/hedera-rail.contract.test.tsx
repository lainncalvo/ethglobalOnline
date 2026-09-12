import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentRailPicker } from "../app/components/PaymentRailPicker";

const appDirectory = resolve(import.meta.dir, "../app");
const webDirectory = resolve(import.meta.dir, "..");

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(appDirectory, relativePath), { encoding: "utf8" });
}

function readWebFile(relativePath: string): string {
  return readFileSync(resolve(webDirectory, relativePath), { encoding: "utf8" });
}

describe("Hedera USDC payment rail (additive)", () => {
  test("picker renders both rails", () => {
    const html = renderToStaticMarkup(
      <PaymentRailPicker value="arc" onChange={() => undefined} />,
    );
    expect(html).toContain("Arc USDC");
    expect(html).toContain("Hedera USDC");
    expect(html).toContain('aria-pressed="true"');
  });

  test("AuctionDetail still mounts the Arc BidForm unchanged", () => {
    const source = readAppFile("components/AuctionDetail.tsx");
    expect(source).toContain("<BidForm");
    expect(source).toContain("listingHash={pickListingHash(detail.timeline)}");
    expect(source).toContain("<WithdrawButton auctionRef={auctionRef} escrow={bidEscrow} />");
    expect(source).toContain("<PaymentRailPicker");
    expect(source).toContain("<HederaBidForm");
    expect(source.match(/refetchInterval: POLL_MS/g)?.length).toBe(3);
  });

  test("BidForm still writes placeBid on Arc only", () => {
    const source = readAppFile("components/BidForm.tsx");
    expect(source).toContain("chainId: ARC_CHAIN_ID");
    expect(source).toContain('functionName: "placeBid"');
    expect(source).not.toContain("HEDERA_CHAIN_ID");
    expect(source).not.toContain("HederaBidEscrow");
  });

  test("Hedera form associates, approves, and bids on Hedera", () => {
    const source = readAppFile("components/HederaBidForm.tsx");
    expect(source).toContain("chainId: HEDERA_CHAIN_ID");
    expect(source).toContain('functionName: "associate"');
    expect(source).toContain('functionName: "placeBid"');
    expect(source).toContain("registerHederaRail(auctionRef)");
    expect(source).toContain("assertMinedSuccess");
    expect(source).toContain("awaitingApproveAfterAssociate");
    expect(source).not.toContain("ARC_CHAIN_ID");
  });

  test("operator Arc endpoints stay on /close and /settle", () => {
    const api = readWebFile("lib/api.ts");
    expect(api).toContain("`/api/auctions/${ref}/close`, {}, token");
    expect(api).toContain("`/api/auctions/${ref}/settle`, {}, token");
    expect(api).not.toContain("/hedera/");
  });

  test("Hedera operator routes are separate files", () => {
    const handler = readWebFile("lib/handlers/hedera-rail.ts");
    expect(handler).toContain("cancelAuctionOnArc");
    expect(handler).toContain("award.outcome === 1");
    expect(handler).toContain("awardByOperatorOnHederaRail");
  });
});
