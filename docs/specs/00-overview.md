# 00 · Overview — Remate, exit auctions for Hedera ATS bonds

Lane: all · Status: reference · Owner: —
Read first: `PLAN.md` (mission, hard rules, lanes, gates). This file is the shared vocabulary every other spec assumes.

> "Remate" is the working codename (Argentine Spanish for *auction*). It may be renamed with a single find-and-replace.

## 1. What the system does

A holder of a bond issued with Hedera's Asset Tokenization Studio (ATS) opens an **exit auction**. Whitelisted investors bid **USDC on Arc**. At the deadline a **Chainlink CRE confidential workflow** computes the award against the seller's **sealed reserve price** and a **confidential compliance screen**, and writes the award on Arc. The bond is then delivered on Hedera through an ATS **hold execution**, where the token itself enforces KYC/whitelist at the instant of transfer. USDC is released to the seller only after delivery is confirmed.

Design principle: **the token, not the operator, enforces compliance.** `executeHoldByPartition` reverts on a non-compliant recipient. Every demo beat is built to prove that on-chain.

## 2. Actors and demo wallets

| Actor | Chain(s) | Role | Demo wallet |
|---|---|---|---|
| Issuer | Hedera | Creates the bond in the ATS web app; manages the control list (whitelist), internal KYC and coupons | `ISSUER` (ECDSA account from portal.hedera.com) |
| Seller | Hedera | Holds bonds; creates the hold; opens the auction; submits the sealed reserve | `SELLER` (whitelisted + KYC) |
| Buyer A | Arc (bids), Hedera (must be eligible) | Bids 14,500 USDC on a 10-bond lot — loses, withdraws | `BUYER_A` (whitelisted + KYC) |
| Buyer B | Arc, Hedera | Bids 15,200 USDC on the same 10-bond lot — wins, receives the bonds | `BUYER_B` (whitelisted + KYC) |
| Buyer C | Arc, Hedera | Not whitelisted — UI badge "not eligible"; forced `settle(id, C)` reverts on-chain | `BUYER_C` (no whitelist, no KYC) |
| Operator | Hedera + Arc | Backend key: mirrors auctions to Arc, triggers close, executes the hold, confirms delivery, voids | `OPERATOR` (funded HBAR + USDC) |
| CRE signer | Arc | Key used by `cre workflow simulate --broadcast` to submit the report through the forwarder | `CRE_ETH_PRIVATE_KEY` (funded USDC) |
| ExitAuction | Hedera | Our contract; the **escrow** address of every hold | deployed by L2 |
| BidEscrow | Arc | Our contract; holds bids, receives the DON report, pays the seller, refunds | deployed by L3 |

All wallets and addresses are recorded in `packages/shared/src/addresses.json` (append-only).

## 3. Happy path (7 steps)

| # | Step | Chain | Who | Call / effect |
|---|---|---|---|---|
| 1 | Issue + configure | Hedera | Issuer | ATS web app: bond (single partition, clearing off, protected partitions off), whitelist + KYC for Seller/A/B, mint to Seller, one coupon set. → spec 06 |
| 2 | List | Hedera | Seller | `bond.createHoldByPartition(0x…01, Hold{amount: 10, expiration = deadline + 72h + 1h, escrow = ExitAuction, to = 0x0, data = "0x"})` → `holdId` from `HeldByPartition` event → `ExitAuction.createAuction(..., amount: 10, deadline, reserveCommitment)` with reserve **14,000 USDC** (6 dec: `14000000000`). Frontend POSTs `{reserve, salt}` to the backend. Bonds stay in the seller's wallet and keep earning coupons. → specs 01, 05 |
| 3 | Mirror | Arc | Operator | `BidEscrow.registerAuction(ref, seller, deadline, reserveCommitment, hederaAuctionId)`. → spec 02 |
| 4 | Bid | Arc | Buyers A, B | `USDC.approve(BidEscrow, amt)` → `BidEscrow.placeBid(ref, amt)` with A = 14,500 USDC (`14500000000`) and B = 15,200 USDC (`15200000000`). Buyer C sees "not eligible" and cannot bid from the UI. → specs 02, 05 |
| 5 | Close + award | CRE → Arc | Operator triggers; TEE decides | Backend POSTs `{ref}` to the CRE HTTP trigger. Inside `handlerInTee`: secrets → snapshot (bids, sealed reserve) → compliance screen → `computeAward` → report → `BidEscrow.onReport` → `Awarded(source=CRE)` or `NoWinner`. → specs 03, 04 |
| 6 | Deliver | Hedera | Operator | `ExitAuction.settle(id, winner)` → `bond.executeHoldByPartition(...)`. ATS checks the winner's compliance here; a non-compliant winner reverts the whole call. → spec 01 |
| 7 | Pay | Arc | Operator, losers | Success → `BidEscrow.confirmDelivery(ref, hederaTxHash)` pays the seller; losers `withdraw(ref)`. Revert → `voidAward(ref, reason)` on Arc + `cancel(id)` on Hedera; everyone withdraws. → spec 02 |

Sequence diagram and component diagram: `docs/architecture.md`.

## 4. Glossary

| Term | Meaning |
|---|---|
| **Bond / ATS token** | An ERC-1400/ERC-3643-style security token issued through ATS. One diamond address exposes all facets (transfer, hold, KYC, control list, coupon…). |
| **Partition** | ERC-1410 balance bucket. We use single-partition bonds; the default partition id is `0x0000000000000000000000000000000000000000000000000000000000000001`. |
| **Hold** | ATS primitive: `Hold{amount, expirationTimestamp, escrow, to, data}`. Tokens stay in the holder's wallet but are locked; only `escrow` can execute (deliver) or release; anyone can reclaim after expiry. Compliance is checked on execution, not creation. |
| **Escrow (hold)** | The address allowed to execute/release a hold. For us: the `ExitAuction` contract. Not to be confused with `BidEscrow` on Arc, which escrows USDC. |
| **HoldIdentifier** | `{bytes32 partition; address tokenHolder; uint256 holdId}` — how ATS addresses a hold. |
| **Auction id** | `uint256` assigned by `ExitAuction` on Hedera (`auctionCount`). |
| **ref** | `bytes32 = keccak256(abi.encode(uint256(296), address(exitAuction), uint256(auctionId)))`. Binds an auction to its chain and contract; the key on Arc and in the CRE report. |
| **Reserve commitment** | `bytes32 = keccak256(abi.encode(uint256 reserveUsdc6, bytes32 salt))`. Stored on both chains at listing; the reserve itself is sealed off-chain and only revealed inside the TEE. |
| **Reserve** | Minimum acceptable price in USDC (6 decimals) for the whole lot. First-price auction: the winner pays their own bid. |
| **Operator** | The backend's key. Mirrors auctions, triggers close, executes holds, confirms delivery, voids. Can grief, cannot steal (see §7). |
| **Forwarder** | Chainlink `KeystoneForwarder` (or the simulation `MockKeystoneForwarder`) on Arc testnet. The only address allowed to call `BidEscrow.onReport`. |
| **Report** | DON-signed payload produced by the CRE workflow: `abi.encode(bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 bidsDigest)`. |
| **Snapshot** | JSON the backend serves to the TEE: bids in insertion order, seller, deadline, sealed reserve + salt, Hedera context. Protected by `x-award-api-key`. |
| **Screening** | JSON the backend returns to the TEE per candidate: whitelisted, kyc, sanctions, canTransfer, EIP-1066 code, reason. Protected by `x-compliance-api-key`; treated as confidential. |
| **Outcome codes** | `1 AWARDED`, `2 NO_COMPLIANT_BID`, `3 ALL_BELOW_RESERVE`, `4 NO_BIDS`. |
| **bidsDigest** | `keccak256(abi.encodePacked(bidder_0, amount_0, bidder_1, amount_1, …))` in insertion order. Lets the contract detect a censored snapshot (verified on-chain in the Full version). |
| **Clearing price** | Amount the winner pays = the winner's bid (first-price). |
| **EIP-1066 code** | One-byte status returned by `canTransferByPartition`: `0x43` TO_ACCOUNT_BLOCKED (control list), `0x51` TO_ACCOUNT_KYC (KYC missing). |
| **MV / Full** | Minimum-viable version of a lane vs. the stretch version. Build MV everywhere first; Full items only after gate G3. |

## 5. Non-goals (explicitly out of scope)

- Order book or continuous matching.
- Sealed **bids** (only the **reserve** is sealed; bid amounts are public on Arc).
- Second-price / Vickrey clearing.
- NAV or price oracle.
- Circle App Kit, Gateway, CCTP, Circle Wallets (there is no Circle interop with Hedera).
- Hedera Scheduled Transactions; HCS ordering.
- ERC-3643 identity registry / ONCHAINID (internal KYC + control list instead).
- Multi-partition bonds; clearing mode; protected partitions.
- Mirror-node indexer (contracts expose `getAuctions` / `getBids`; backend keeps a JSON registry).
- Seller-signed reserve submission; push refunds; `eth_call` from inside the TEE.
- Arc mainnet deployment before submission (documented path in `docs/MAINNET.md`).
- 1inch or any fourth sponsor integration.
- Atomic cross-chain settlement (settlement is coordinated and stated as such).

## 6. How the lanes fit together

Contracts on both chains (L2, L3) share one binding key, `ref`, and one report ABI, so they can be built and tested independently against mocks. The CRE workflow (L4) and the backend (L5) share one pure TypeScript award function (`packages/shared/src/award.ts`, **owned by L4**), so the local fallback and the confidential path cannot disagree. The frontend (L6) only talks to the two contracts through viem and to the backend through the REST contract in spec 04. Issuance (L1) is a runbook, not code: its only output is a bond address and three eligible wallets. Docs and video (L7) consume everything.

Shared-package ownership (do not write outside your files):

| File | Owner |
|---|---|
| `packages/shared/src/addresses.json` | L0 creates the skeleton; afterwards append-only, own commit |
| `packages/shared/src/award.ts` and `test/award.test.ts` | L4 |
| `packages/shared/src/{ref,commitment,chains,errors}.ts` and `src/abi/*` | L5 |
| `packages/shared/package.json` | L0 |

Dependencies:

- L0 bootstrap → everything.
- L1 bond address → L2 integration test, L5 screening reads, L6 eligibility badge, L7 demo.
- L2/L3 frozen interfaces (this spec set) → L4, L5, L6 can start before deployment.
- L3 deployed address → L4 `--broadcast`, L5 operator, L6 bidding.
- L2 deployed address → L5 operator, L6 sell page.
- L5 `/snapshot` + `/compliance/screen` → L4 (mockable with fixtures until then).
- Everything → L7 evidence, README, video.

Spec index:

| File | Lane |
|---|---|
| `00-overview.md` | shared vocabulary (this file) |
| `01-exit-auction.md` | L2 — `ExitAuction.sol` on Hedera |
| `02-bid-escrow.md` | L3 — `BidEscrow.sol` on Arc |
| `03-cre-award-workflow.md` | L4 — confidential award workflow |
| `04-backend-api.md` | L5 — REST, JSON store, operator scripts |
| `05-frontend.md` | L6 — Next.js pages |
| `06-ats-issuance-runbook.md` | L1 — bond issuance in the ATS web app |
| `07-envs-addresses-toolchain.md` | L0 — installs, env vars, addresses |
| `08-demo-and-submission.md` | L7 — video script, evidence, submission form |
| `09-threat-model.md` | cross-cutting — state machines, holes, trust |

## 7. Trust model (one paragraph, repeated in README)

The award is computed inside a CRE confidential handler and delivered to Arc as a DON-signed report; the `BidEscrow` contract only moves to `Awarded` on a report (or, as a fallback, an operator call, and the event says which). Delivery of the bond on Hedera and the delivery confirmation on Arc are **operator actions**, because CRE cannot write to Hedera today. The operator can therefore stall or void an auction, but cannot redirect funds: `confirmDelivery` pays only the registered seller, refunds go only to the bidders who deposited, and ATS itself refuses to deliver a bond to a wallet that is not whitelisted and KYC'd, whatever the operator submits. The `hederaTxHash` recorded on Arc is a pointer for the UI, not a proof. In simulation the forwarder accepts unsigned reports; in production the `KeystoneForwarder` verifies DON signatures and a second CRE trigger reads Hedera over HTTP to write `confirmDelivery` itself. Full detail: `09-threat-model.md`.
