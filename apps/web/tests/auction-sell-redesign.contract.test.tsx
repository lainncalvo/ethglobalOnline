import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BidsTable } from "../app/components/BidsTable";
import { EligibilityBadge } from "../app/components/EligibilityBadge";
import { Timeline } from "../app/components/Timeline";
import { TxStepper } from "../app/components/TxStepper";
import type {
  AuctionDetail,
  ComplianceStatus,
  TxStep,
} from "../lib/types";

const appDirectory = resolve(import.meta.dir, "../app");

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(appDirectory, relativePath), "utf8");
}

const DETAIL: AuctionDetail = {
  ref: "0xauction-ref",
  hederaAuctionId: "42",
  token: "0x00000000000000000000000000000000000000aa",
  tokenName: "ON Serie I 2027",
  tokenSymbol: "ON27",
  seller: "0x00000000000000000000000000000000000000bb",
  amount: "10",
  deadline: "2000000000",
  hederaStatus: "Open",
  arcStatus: "Awarded",
  topBid: "12500000",
  bidCount: "2",
  winner: "0x00000000000000000000000000000000000000cc",
  clearingPrice: "12500000",
  awardSource: "CRE",
  links: {
    hashscanAuction: "https://hashscan.test/auction/42",
    hashscanToken: "https://hashscan.test/token/aa",
    arcscanEscrow: "https://arcscan.test/escrow/bb",
  },
  bids: [],
  hederaTxHash: null,
  timeline: [
    {
      step: "listed",
      chain: "hedera",
      txHash: "0x1111111111111111",
      at: "2026-09-11T00:00:00.000Z",
    },
    {
      step: "awarded",
      chain: "arc",
      txHash: "0x2222222222222222",
      at: "2026-09-11T00:01:00.000Z",
    },
  ],
};

describe("auction and sell immutable flow contracts", () => {
  test("preserves auction queries, polling, bid source, and gate props", () => {
    const source = readAppFile("components/AuctionDetail.tsx");

    expect(source).toContain('queryKey: ["auction", auctionRef]');
    expect(source).toContain("queryFn: () => fetchAuction(auctionRef)");
    expect(source).toContain('queryKey: ["compliance", address]');
    expect(source).toContain("queryFn: () => fetchCompliance(address!)");
    expect(source.match(/refetchInterval: POLL_MS/g)?.length).toBe(3);
    expect(source).toContain('functionName: "getBids"');
    expect(source).toContain("args: [auctionRef]");
    expect(source).toContain(
      "const bids = bidsFromChain.length > 0 ? bidsFromChain : (detail?.bids ?? []);",
    );
    expect(source).toContain("disabled={blocked || !address}");
    expect(source).toContain("reason={blocked ? blockReason : undefined}");
    expect(source).toContain("listingHash={pickListingHash(detail.timeline)}");
    expect(source).toContain("<OutcomeCard detail={detail} />");
  });

  test("preserves approve then bid calls, invalidation, and disabled predicates", () => {
    const source = readAppFile("components/BidForm.tsx");

    expect(source).toContain('functionName: "allowance"');
    expect(source).toContain("args: address && escrow ? [address, escrow] : undefined");
    expect(source).toContain(
      "const formLocked = disabled || !isConnected || !escrow || parsed <= 0n || wrongChain;",
    );
    expect(source).toContain("if (!escrow) return;");
    expect(source).toContain('functionName: "approve"');
    expect(source).toContain("args: [escrow, parsed]");
    expect(source).toContain('functionName: "placeBid"');
    expect(source).toContain("args: [auctionRef, escrowed]");
    expect(source).toContain("disabled={formLocked || !needsApprove || isPending}");
    expect(source).toContain("disabled={formLocked || needsApprove || isPending}");
    expect(source).toContain(
      'queryClient.invalidateQueries({ queryKey: ["auction", auctionRef] })',
    );
    expect(source).toContain("allowance.refetch()");
    expect(source.match(/\.catch\(setError\)/g)?.length).toBe(2);
  });

  test("preserves withdrawal guards, ABI call, refreshes, and pending label", () => {
    const source = readAppFile("components/WithdrawButton.tsx");

    expect(source).not.toContain('import { NetworkGuard }');
    expect(source).not.toContain("<NetworkGuard");
    expect(source).not.toMatch(/\bswitchChain\s*[:=(]/);
    expect(source).toContain("const { switchChainAsync } = useSwitchChain();");
    expect(source).toContain("if (!address || !escrow || amount === 0n) return null;");
    expect(source).toContain("if (chainId !== ARC_CHAIN_ID)");
    expect(source).toContain('functionName: "withdraw"');
    expect(source).toContain("args: [auctionRef]");
    expect(source).toContain("disabled={isPending}");
    expect(source).toContain('{isPending ? "Withdrawing…" : "Withdraw"}');
    expect(source).toContain(
      'queryClient.invalidateQueries({ queryKey: ["auction", auctionRef] })',
    );
    expect(source).toContain("await refundable.refetch()");
    expect(source).toContain("setError(err)");
  });

  test("preserves the complete sell transaction and API sequence", () => {
    const source = readAppFile("components/SellForm.tsx");

    expect(source).toContain(
      "if (!tokenAddress || !addresses.exitAuction || !address || !publicClient) return;",
    );
    expect(source).toContain(
      "const canWrite = isConnected && tokenAddress && addresses.exitAuction && !busy;",
    );
    expect(source).toContain(
      "if (deadlineUnix < Math.floor(Date.now() / 1000) + MIN_AUCTION_DURATION_SECONDS)",
    );
    expect(source).toContain("const commitment = computeCommitment(reserve6, salt);");
    expect(source).toContain('functionName: "createHoldByPartition"');
    expect(source).toContain("amount: amountBase");
    expect(source).toContain("expirationTimestamp: expiration");
    expect(source).toContain("escrow: addresses.exitAuction");
    expect(source).toContain("const holdId = holdIdFromReceipt(holdReceipt);");
    expect(source).toContain('functionName: "createAuction"');
    expect(source).toContain(
      "args: [tokenAddress, DEFAULT_PARTITION, holdId, amountBase, BigInt(deadlineUnix), commitment]",
    );
    expect(source).toContain(
      "const created = auctionCreatedFromReceipt(auctionReceipt);",
    );
    expect(source).toContain("const registered = await registerAuction(id);");
    expect(source).toContain(
      "await postReserve(registered.ref ?? ref, reserve6.toString(), salt);",
    );
    expect(source).toContain("...HEDERA_WALLET_TX");
    expect(source).not.toContain("3_000_000n");
    expect(source).toContain("withRpcRetry");
    expect(source).toContain("enabled: Boolean(tokenAddress && address) && !busy");
    expect(source).toContain(
      "disabled={!canWrite || chainId !== HEDERA_CHAIN_ID && isConnected}",
    );
    expect(source).toContain("runMirror(result.id, result.ref).catch(setError)");
    expect(source).toContain(
      'result && steps.every((s) => s.status === "done")',
    );
  });

  test("keeps transaction step and decoded error semantics", () => {
    const stepper = readAppFile("components/TxStepper.tsx");
    const txError = readAppFile("components/TxError.tsx");

    expect(stepper).toContain(
      'step.status === "idle" ? "waiting" : step.status',
    );
    expect(stepper).toContain('step.status === "pending"');
    expect(stepper).toContain('step.status === "done" && !step.hash');
    expect(stepper).toContain("step.error");
    expect(txError).toContain("const decoded = decodeTxError(error);");
    expect(txError).toContain('decoded.kind === "rpc"');
    expect(txError).toContain("decoded.name !== decoded.message");
    expect(txError).toContain("open && decoded.raw");
  });
});

describe("auction and sell accessible presentation contracts", () => {
  test("renders settlement as a labeled, keyboard-scrollable progress region", () => {
    const markup = renderToStaticMarkup(<Timeline detail={DETAIL} />);

    expect(markup).toContain('aria-label="Settlement progress"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('class="settlement-timeline');
    expect(markup).toContain('data-state="reached"');
    expect(markup).toContain("Listed");
    expect(markup).toContain("Bidding");
    expect(markup).toContain("Awarded");
    expect(markup).toContain("Delivered");
    expect(markup).toContain("Paid");
    expect(markup).toContain("CRE");
  });

  test("renders bids as a labeled order-book region without changing values", () => {
    const markup = renderToStaticMarkup(
      <BidsTable
        bids={[
          {
            bidder: "0x00000000000000000000000000000000000000cc",
            amount: "12500000",
          },
        ]}
        me="0x00000000000000000000000000000000000000cc"
      />,
    );

    expect(markup).toContain('aria-label="Auction bids"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('class="order-book');
    expect(markup).toContain("12.50 USDC");
    expect(markup).toContain("<strong>you</strong>");
  });

  test("renders explicit disconnected and eligible states", () => {
    const eligible: ComplianceStatus = {
      whitelisted: true,
      kyc: true,
      canReceive: true,
      code: "OK",
      reasonText: "Eligible",
    };
    const disconnected = renderToStaticMarkup(
      <EligibilityBadge status={undefined} />,
    );
    const connected = renderToStaticMarkup(
      <EligibilityBadge status={eligible} />,
    );

    expect(disconnected).toContain('role="status"');
    expect(disconnected).toContain("Connect a wallet to check eligibility.");
    expect(connected).toContain('data-eligibility="eligible"');
    expect(connected).toContain("Eligible");
  });

  test("renders the numbered transaction ledger with status announcements", () => {
    const steps: TxStep[] = [
      { id: "hold", label: "Create ATS hold", status: "done", chain: "hedera" },
      { id: "auction", label: "Register auction", status: "pending", chain: "hedera" },
      { id: "mirror", label: "Mirror on Arc", status: "idle", chain: "arc" },
    ];
    const markup = renderToStaticMarkup(<TxStepper steps={steps} />);

    expect(markup).toContain('aria-label="Listing progress"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('class="tx-ledger');
    expect(markup).toContain("1");
    expect(markup).toContain("pending…");
    expect(markup).toContain("waiting");
  });

  test("loads modular workspace styles and 390px single-column contracts", () => {
    const components = readAppFile("styles/components.css");
    const auction = readAppFile("styles/auction-detail.css");
    const sell = readAppFile("styles/sell.css");
    const responsive = readAppFile("styles/responsive.css");

    expect(components).toContain('@import "./auction-detail.css";');
    expect(components).toContain('@import "./sell.css";');
    expect(auction).toContain(".auction-workspace__grid");
    expect(auction).toContain("position: sticky");
    expect(auction).toContain(".order-book__scroll");
    expect(sell).toContain(".sell-workspace__grid");
    expect(sell).toContain(".tx-ledger");
    expect(responsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.auction-workspace__grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
    expect(responsive).toMatch(
      /@media \(max-width: 390px\)[\s\S]*\.sell-workspace__grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
    );
  });
});
