# Spec 04 — Backend API and operator scripts

Lane: L5 · Status: todo · Owner: —
Read first: `PLAN.md`, then `docs/specs/01-exit-auction.md` and `docs/specs/02-bid-escrow.md` (the ABIs this lane calls) and `docs/specs/03-cre-award-workflow.md` (the two endpoints the TEE consumes).

## 1. Goal

Provide the "working backend" the Arc track requires: Next.js route handlers that read both chains, hold the sealed reserve, answer the TEE's two calls, and drive the operator actions (register on Arc, close, settle, confirm/void). Plus bun scripts for the same operator actions from a terminal and a seed script for the demo.

## 2. Sponsor requirement this lane satisfies

| Track | Requirement | How |
|---|---|---|
| Arc · Best DeFi/Onchain Finance | "working frontend and backend" | route handlers under `apps/web/app/api`, operator scripts |
| Arc | "conditional payments, onchain automation or multi-step settlement" | `/close` → award on Arc → `/settle` executes Hedera delivery then `confirmDelivery` on Arc, or `voidAward` on failure |
| Chainlink | confidential inputs come from an authenticated API | `/snapshot` (sealed reserve) and `/compliance/screen` (screening) gated by secret headers |

## 3. Location

```
apps/web/app/api/**/route.ts        Next.js 15 route handlers (Node runtime, not edge)
apps/web/lib/                       server-only helpers: clients.ts (viem), store.ts (db.json), hedera.ts, arc.ts, errors.ts
apps/web/data/db.json               JSON store (gitignored)
scripts/ops/*.ts                    bun CLI: register.ts, close.ts, settle.ts
scripts/demo/seed.ts                bun CLI: full demo state from clean wallets
packages/shared/src/award.ts        computeAward (see spec 03 §6)
packages/shared/src/ref.ts          computeRef(chainId, exitAuction, auctionId)
packages/shared/src/commitment.ts   computeCommitment(reserve, salt)
packages/shared/src/chains.ts       viem chain objects for 296 and 5042002
packages/shared/src/abi/*.json      ExitAuction, BidEscrow, IATSBond (minimal), ERC20
```

## 4. Storage

`apps/web/data/db.json`:
```json
{
  "auctions": {
    "0x<ref>": {
      "hederaAuctionId": "1",
      "reserve": "1500000000",
      "salt": "0x…",
      "timeline": [ { "step": "listed", "chain": "hedera", "txHash": "0x…", "at": "2026-09-12T14:03:00Z" } ]
    }
  }
}
```
Rules: `DATA_DIR` env (default `./data`); write = serialize → write `db.json.tmp` → `rename` (atomic); a single in-process mutex around read-modify-write; `reserve`/`salt` are never returned by any public endpoint and never logged. No native modules (no sqlite).

## 5. Auth

| Class | Header | Endpoints |
|---|---|---|
| Public | none | `GET /api/health`, `GET /api/auctions`, `GET /api/auctions/[ref]`, `GET /api/compliance/status`, `POST /api/auctions` (mirrors an existing on-chain auction; validated against Hedera state and idempotent, so it needs no token), `POST /api/auctions/[ref]/reserve` (demo-grade, see pitfalls) |
| Operator | `Authorization: Bearer $OPERATOR_UI_TOKEN` | `/close`, `/settle`, `/settle-preview`, `/void`, `/cancel` |
| TEE | `x-award-api-key: $AWARD_API_KEY` | `GET /api/auctions/[ref]/snapshot` |
| TEE | `x-compliance-api-key: $COMPLIANCE_API_KEY` | `POST /api/compliance/screen` |

Compare tokens with a constant-time equality. 401 on missing/wrong header.

## 6. Endpoints

All responses are JSON. Errors: `{ "error": { "code": "STRING_CODE", "message": "human text" } }` with 400/401/404/409/500. Amounts are decimal strings in base units (USDC 6 decimals, bond in token decimals). Addresses checksummed. `ref` = `0x` + 64 hex.

| Method · Path | Auth | Request | Response | Behaviour |
|---|---|---|---|---|
| `GET /api/health` | — | — | `{ hedera: { chainId: 296, block, operator, hbar }, arc: { chainId: 5042002, block, operator, usdc }, addresses, awardMode }` | One `getBlockNumber` per chain, operator balances, `addresses.json` echo, `AWARD_MODE` |
| `GET /api/auctions` | — | — | `{ auctions: [AuctionView] }` | `ExitAuction.getAuctions(0, auctionCount)` on Hedera; for each, `computeRef` → `BidEscrow.getAuction(ref)` + `getBids(ref)` on Arc; merge with `db.json` timeline; sort by deadline desc |
| `GET /api/auctions/[ref]` | — | — | `AuctionView & { bids: [{bidder, amount}], clearingPrice, hederaTxHash, timeline }` | Same as above for one ref; 404 if unknown on both chains |
| `POST /api/auctions` | public (validated) | `{ hederaAuctionId }` | `{ ref, arcTxHash }` or `{ ref, alreadyRegistered: true }` | Read `ExitAuction.getAuction(id)`; require `status == Open` and `deadline > now` (404/409 otherwise); `ref = computeRef(296, EXIT_AUCTION, id)`; if Arc status is already `Bidding` return `alreadyRegistered` (idempotent, 200); else `BidEscrow.registerAuction(ref, seller, deadline, reserveCommitment, id)` with the operator key; store `{hederaAuctionId}`; append timeline `registered`. Safe without a token: it can only mirror what is already on Hedera |
| `POST /api/auctions/[ref]/reserve` | — | `{ reserve, salt }` | `{ ok: true }` | Read on-chain `reserveCommitment` from Hedera; require `computeCommitment(reserve, salt) == commitment` else 409 `COMMITMENT_MISMATCH`; store server-side only; never echo |
| `GET /api/auctions/[ref]/snapshot` | TEE | — | `Snapshot` (spec 03 §6) | 404 `NO_RESERVE` if reserve not stored; bids from `BidEscrow.getBids` in insertion order; `hedera` block from `ExitAuction.getAuction` |
| `POST /api/compliance/screen` | TEE | `{ token, seller, partition, amount, candidates: [address] }` | `Screening` (spec 03 §6) | Per candidate on Hedera: `isInControlList`, `getKycStatusFor`, `canTransferByPartition(seller, addr, partition, amount, "0x", "0x")`; `sanctions = HIT` iff address ∈ `MOCK_SANCTIONS_LIST`; `code`/`reason` from `canTransferByPartition`. Response is confidential: never persisted, never logged. Cap `candidates` at 20 |
| `GET /api/compliance/status?address=` | — | — | `{ whitelisted, kyc, canReceive, code, reasonText }` | Same Hedera reads for one address using the demo bond and a nominal amount of 1 unit; `reasonText` from the EIP-1066 map (`0x43` "not whitelisted", `0x51` "KYC not granted", `0x50`/`0x52`… as ATS returns) — no sanctions here (that stays confidential) |
| `POST /api/auctions/[ref]/close` | operator | — | `AWARD_MODE=cre`: `{ mode: "cre", accepted: true }` · `local`: `{ mode: "local", arcTxHash, award: { outcome, winner, clearingPrice, eligible } }` | Require Arc status `Bidding` and `now ≥ deadline`. `cre`: `POST $CRE_TRIGGER_URL` body `{ ref }`, 202. `local`: build `Snapshot` + `Screening` in-process, `computeAward`, `BidEscrow.awardByOperator(ref, winner, clearingPrice, reserveCommitment, outcome, bidsDigest)`; never include the reserve in the response |
| `POST /api/auctions/[ref]/settle` | operator | — | success `{ hederaTxHash, arcTxHash }` · failure `{ voided: true, reason, hederaTxHash? }` | Require Arc status `Awarded`. `ExitAuction.settle(hederaAuctionId, winner)` with operator key, explicit `gas` (see §7), 120 s timeout. Success → `BidEscrow.confirmDelivery(ref, hederaTxHash)`. Revert → decode selector (`AccountIsBlocked`, `InvalidKycStatus`, `AddressNotVerified`, `ComplianceNotAllowed`, `IsPaused`, else `Unknown`) → `BidEscrow.voidAward(ref, selectorName)` and `ExitAuction.cancel(id)`; append timeline entries |
| `POST /api/auctions/[ref]/settle-preview` | operator | `{ to }` | `{ ok, code, reasonText }` | `ExitAuction.previewSettle(id, to)` (view); map code → text |
| `POST /api/auctions/[ref]/void` | operator | `{ reason }` | `{ arcTxHash, hederaTxHash? }` | `BidEscrow.voidAward`; if Hedera still `Open`, `ExitAuction.cancel(id)` |
| `POST /api/auctions/[ref]/cancel` | operator | — | `{ arcTxHash?, hederaTxHash? }` | `BidEscrow.cancelAuction` (if `Bidding`) and `ExitAuction.cancel(id)` (if `Open`) |

`AuctionView`:
```
{ ref, hederaAuctionId, token, tokenName, tokenSymbol, seller, amount, deadline,
  hederaStatus: "Open"|"Settled"|"Cancelled", arcStatus: "None"|"Bidding"|"Awarded"|"Settled"|"Voided"|"Cancelled"|"Expired"|"NoWinner",
  topBid, bidCount, winner, clearingPrice, awardSource: "None"|"CRE"|"Operator",
  links: { hashscanAuction, hashscanToken, arcscanEscrow } }
```

EIP-1066 code map used by `status` and `settle-preview`:

| code | text |
|---|---|
| `0x01` / `0x51` ok variants | "transfer allowed" |
| `0x43` | "recipient not whitelisted" |
| `0x51` (when `ok=false`) | "recipient KYC not granted" |
| other | "blocked: code 0x.." + reason bytes32 |

Verify the exact success/failure codes ATS returns during L1 (`cast call … canTransferByPartition`) and fix the map before wiring the badge.

## 7. viem client configuration (`apps/web/lib/clients.ts`)

| Chain | Object | Transport | Write defaults |
|---|---|---|---|
| Hedera testnet | `hederaTestnet` (id 296, `NEXT_PUBLIC_HEDERA_RPC_URL`) | `http(url, { timeout: 120_000, retryCount: 2 })` | explicit `gas` per call (settle 2_500_000, cancel 1_000_000 — measure in L2 and adjust), `pollingInterval` 2 s, `waitForTransactionReceipt` with `confirmations: 1`, timeout 180 s |
| Arc testnet | `arcTestnet` (id 5042002, `NEXT_PUBLIC_ARC_RPC_URL`) | `http(url, { timeout: 30_000 })` | `maxFeePerGas: 30 gwei`, `maxPriorityFeePerGas: 1 gwei` on every write; `gas` estimated |

Operator account: `privateKeyToAccount(OPERATOR_PRIVATE_KEY)` used on both chains (same key, two nonces). Keep one `walletClient` per chain; serialise writes per chain with a small queue to avoid nonce races.

## 8. Operator and demo scripts (bun)

| Script | Usage | Behaviour |
|---|---|---|
| `scripts/ops/register.ts` | `bun scripts/ops/register.ts <hederaAuctionId>` | Same as `POST /api/auctions`; prints `ref` and ArcScan link |
| `scripts/ops/close.ts` | `bun scripts/ops/close.ts <ref> [--local]` | Same as `/close`; `--local` forces the local engine regardless of `AWARD_MODE` |
| `scripts/ops/settle.ts` | `bun scripts/ops/settle.ts <ref>` | Same as `/settle`; prints both hashes or the decoded revert |
| `scripts/demo/seed.ts` | `bun scripts/demo/seed.ts --deadline-minutes 5 --reserve 1400 --bidA 1450 --bidB 1520` | From `.env` keys: Seller creates the hold and the auction (with a fresh salt), stores the reserve via `/reserve`, Operator registers on Arc, Buyer A and Buyer B approve + bid. Prints `ref`, all tx links, and the salt (stderr only). Idempotent per run: a new auction each time |

Scripts import the same helpers as the route handlers (`packages/shared` + `apps/web/lib`), so behaviour cannot drift.

## 9. Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_HEDERA_RPC_URL`, `NEXT_PUBLIC_ARC_RPC_URL`, `NEXT_PUBLIC_HEDERA_MIRROR_URL` | clients | Hashio / Arc RPC; mirror only for explorer links |
| `NEXT_PUBLIC_EXIT_AUCTION_ADDRESS`, `NEXT_PUBLIC_BID_ESCROW_ADDRESS`, `NEXT_PUBLIC_BOND_TOKEN_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS` | clients | mirror `addresses.json` |
| `OPERATOR_PRIVATE_KEY` | writes | never `NEXT_PUBLIC_` |
| `OPERATOR_UI_TOKEN` | operator auth | random 32 bytes hex |
| `AWARD_API_KEY`, `COMPLIANCE_API_KEY` | TEE auth | must match `packages/cre-award/.env` |
| `AWARD_MODE` | `/close` | `cre` (default) or `local` |
| `CRE_TRIGGER_URL` | `/close` | `http://127.0.0.1:2000` while `cre workflow simulate --listen` runs |
| `MOCK_SANCTIONS_LIST` | screen | comma-separated addresses; empty for the base demo |
| `DATA_DIR` | store | default `./data` |

## 10. Steps

1. Scaffold `apps/web/lib/{clients,store,errors}.ts` and `packages/shared/src/{ref,commitment,chains}.ts`; copy ABIs from `packages/contracts/out` into `packages/shared/src/abi` (spec 01/02 define the ABIs; L5 can start from the spec signatures before deployment).
2. Implement read endpoints (`health`, `auctions`, `auctions/[ref]`, `compliance/status`) against deployed addresses.
3. Implement `POST /api/auctions` and `/reserve`; test with `scripts/ops/register.ts`.
4. Implement `/snapshot` and `/compliance/screen`; verify with `curl` and the exact headers the TEE will send.
5. Implement `/close` local path and `awardByOperator`; then the `cre` path (POST to trigger).
6. Implement `/settle`, `/settle-preview`, `/void`, `/cancel` with the revert decoder.
7. Write `scripts/demo/seed.ts`; run it end to end with `AWARD_MODE=local`, then with `cre`.
8. Route tests (bun test + mocked viem): `close` cre/local branches, `settle` success/revert branches, `reserve` mismatch 409, auth 401s.

## 11. Acceptance criteria

- `POST …/close` produces `Awarded` (or `NoWinner`) on ArcScan in both modes.
- `POST …/settle` returns a HashScan hash showing `HoldByPartitionExecuted` and an ArcScan hash showing `DeliveryConfirmed`; on a non-compliant winner it returns `{ voided: true, reason: "InvalidKycStatus" | "AccountIsBlocked" }` and ArcScan shows `AwardVoided`.
- `GET /api/health` shows both chain heads and operator balances.
- `POST …/settle-preview` with Buyer C returns `ok=false`, `code=0x51` (or `0x43`), readable text.
- `scripts/demo/seed.ts` builds a complete auction with two bids in under 3 minutes.
- No log line anywhere contains the reserve, the salt, an API key, or a screening verdict.

## 12. Minimum viable / Full

| MV | Full |
|---|---|
| Endpoints above, JSON store, scripts | SSE or polling endpoint streaming the operator log to `/operator` |
| Timeline appended on operator actions | Timeline also backfilled from chain events on read |
| One write at a time per chain | Idempotency keys on operator POSTs; retry with nonce recovery |

## 13. Out of scope

Database, user accounts, sessions or any auth beyond the three tokens; an event indexer or mirror-node polling; rate limiting; multi-operator support; production secret management.

## 14. Known pitfalls

| Pitfall | Mitigation |
|---|---|
| Hashio `eth_estimateGas` is unreliable for diamond → BLR → delegatecall paths | Explicit `gas` on Hedera writes; measure once in L2 |
| `settle` call stack is deep (ExitAuction → diamond → facet → Ops library); must fit the 15M cap | Measured gas in L2; fail fast if above 10M |
| Arc txs below 20 gwei hang forever | 30 gwei `maxFeePerGas` on every Arc write, including scripts |
| USDC on Arc has 6 decimals in ERC-20 calls but 18 for native balance | Backend only uses the ERC-20 interface; `hbar`/`usdc` in `/health` labelled with units |
| Two chains share one operator key → nonce confusion is impossible across chains but possible within one | Per-chain write queue |
| Screening or reserve leaking through logs, error messages or Next.js dev overlays | Redact in the error helper; never `console.log` request bodies on TEE routes |
| `POST /reserve` is unauthenticated | Acceptable for the demo because the commitment is on-chain; documented in `09-threat-model.md` |
| Next.js route handlers on the edge runtime cannot use `fs` | Force `export const runtime = "nodejs"` on every route |

## 15. Evidence

| Artifact | Path | Captured by | Date |
|---|---|---|---|
| `curl` transcript: health, close (cre), settle success | `docs/evidence/api-happy-path.log` | | |
| `curl` transcript: settle-preview Buyer C, settle revert + void | `docs/evidence/api-noncompliant.log` | | |
| Seed script output with links | `docs/evidence/seed-<ref>.log` | | |
