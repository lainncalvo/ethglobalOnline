# Remate — exit auctions for Hedera ATS bonds

> **Working name.** "Remate" (Argentine Spanish for *auction*) is a codename; the team will pick
> the final name later. It is used consistently here so a single find-and-replace fixes it.

**ETHOnline 2026 · submission deadline: Sunday 2026-09-13 16:00 UTC (13:00 ART, 12:00 EDT).**
We submit by 12:00 ART. Feature freeze Saturday 2026-09-12 22:00 ART.

This file is the entry point for every person and every coding agent on the project. Read it
top to bottom once, then read the spec for the lane you are taking. Nothing else is required to
start working.

---

## 0. How to use this file

1. Read §1–§4 (mission, rules, product, architecture) — 10 minutes.
2. Pick a lane in §6 whose status is `todo` and whose dependencies are `done` or mockable.
3. Read that lane's spec in `docs/specs/`. The spec is the contract; this file is the map.
4. Work only inside the lane's directory. Interfaces are frozen (§5). If an interface must
   change, change the spec first in its own commit and add a dated line to §11.
5. Commit at least every 45 minutes. Push to `main` (or a short `lane/lN-name` branch, merged
   without review). Update the lane's status in §6 in the same commit when it changes.
6. Record every deployed address in `packages/shared/src/addresses.json` and in §9, in a
   commit that touches only those files.

**Agent brief template** (paste at the top of any coding-agent prompt):

```
You are building lane L<N> of the Remate project (ETHOnline 2026). Read PLAN.md fully, then
docs/specs/<NN>-<name>.md. Build only what the spec's "Minimum viable" section requires unless told
otherwise. Only touch the paths listed for your lane in PLAN.md §7 (deny-list). Do not change any
interface in docs/specs/01–04 without first editing the spec and noting it in PLAN.md §11. Never
commit .env files, CONTEXT.md or CLAUDE.md. Commit small and often with the prefix feat(l<N>): /
fix(l<N>): / docs: / chore:. When done, list the acceptance criteria from the spec and state, with
evidence (tx hash, command output, URL), which ones pass.
```

**Split C (hybrid).** L0 is human and goes first. Then L2, L3 and L5 run in parallel. L4 starts
against an HTTP stub. L6 starts once the four empty routes and the `AuctionView` shape exist. L1
and L7 stay human.

---

## 1. Mission, deadline, bounties

**One-liner.** Remate is an exit venue for tokenized bonds. A holder of a bond issued with
Hedera's Asset Tokenization Studio (ATS) opens an exit auction; whitelisted investors bid USDC on
Arc; a Chainlink confidential workflow computes the award against a sealed reserve price and a
confidential compliance screen; settlement delivers the bond on Hedera with the token's own
compliance rules enforced at the moment of transfer.

**Why.** Tokenized bond issuance works; exit does not. The ECB counted 183 tokenized bonds issued
2018–2025 and could find secondary-market activity for only 20. ATS lets an issuer mint a
compliant bond and run its lifecycle, but ships no place to sell it. Hedera's own track brief
names "a secondary market for ATS-issued assets" as something the Studio does not have today.

**Bounties we submit to (three partners, the ETHGlobal maximum):**

| Partner · track | What they require | Where we satisfy it |
|---|---|---|
| **Hedera · Tokenization of Anything** | Use ATS to issue/manage an asset; deploy + demo on Hedera testnet; public repo; contracts verified on HashScan; video ≤ 5 min showing issuance, configuration and a lifecycle op (transfer / compliance check / distribution). Extra points: secondary market, compliance controls in use, coupons. | Bond issued in the ATS web app (L1); `ExitAuction` on Hedera testnet, verified (L2); the sale is a compliance-checked transfer; coupon configured (L1); video beats 2, 3, 5, 7 (L7). |
| **Arc · Best DeFi/Onchain Finance Application** | Meaningful use of Arc + USDC; "conditional payments, onchain automation or multi-step settlement"; **working frontend and backend plus an architecture diagram**; video + docs; state the bounty. $2,500 of $3,500 only if deployed to Arc mainnet by Sep 30 (mainnet launches Sep 16). | `BidEscrow` on Arc testnet holding USDC bids, released only after award + delivery confirmation (L3); frontend + API (L5, L6); `docs/architecture.md` (L7); `docs/MAINNET.md` for the post-deadline mainnet path. |
| **Chainlink · Best Confidential Workflow** | CRE workflow using `handlerInTee`; the confidential portion processes a sensitive input/secret/private parameter; meaningfully integrated (a placeholder disqualifies); evidence via CRE CLI simulation or live deployment. | `packages/cre-award`: the enclave holds the API keys, the sealed reserve and the compliance screen, and its report is the only path that awards an auction (L4); evidence in `docs/evidence/`. |

**ETHGlobal-wide rules that bite:** video **2–4 minutes** (uploader rejects longer), ≥ 720p,
human narration, no sped-up footage; **AI-tool disclosure is mandatory** and planning/spec
artifacts must be in the repo (`docs/AI_DISCLOSURE.md`, this file, `docs/specs/`); submissions
with large single commits or missing history may be disqualified.

---

## 2. Hard rules

1. **Never commit `.env*`, `CONTEXT.md` or `CLAUDE.md`.** `.gitignore` already excludes them; do
   not remove those entries and never `git add -f` them.
2. **Commit every 45 minutes or less.** Small commits, real messages. History is judged.
3. **Only touch your lane's directory.** Shared files (`packages/shared/src/addresses.json`,
   `packages/shared/abi/*.json`, this file's §6 and §9) are append-only, in their own commits.
4. **Interfaces are frozen** (§5). Spec first, then code.
5. **Never log or print the reserve price or any secret**, in code, in simulator output, in
   screenshots or in the video.
6. **Every on-chain claim in the README or the video links to an explorer transaction.**
7. **Deadline discipline:** freeze Sat 22:00 ART; clips recorded Sat night; video edited Sun by
   11:00; submitted by 12:00; hard deadline 13:00.
8. **Pre-submission sweep.** Anything that must be completed, updated or removed before the
   submission carries an HTML comment starting with `PRE-SUBMISSION:`. Nothing in this repo is
   meant to be deleted; the sweep is about filling placeholders. Find every hit and resolve it:

   ```
   grep -rn "PRE-SUBMISSION" --include=*.md .
   ```

   The command must print nothing before the form is submitted. Files that must never be in the
   repo (`.env*`, `apps/web/data/`, raw recordings, `CONTEXT.md`, `CLAUDE.md`) are handled by
   `.gitignore`, not by cleanup.

---

## 3. Product in one page

**Actors (demo wallets).** Issuer (ATS admin) · Seller (holds bonds) · Buyer A and Buyer B
(whitelisted + KYC) · Buyer C (not whitelisted; used to show the block) · Operator (backend key
funded on Hedera and Arc) · CRE signer key (funded on Arc, used only by `--broadcast`).

**Demo asset.** ATS Bond styled as an Argentine ON (Obligación Negociable): "ON Serie I 2027",
USD, fixed 9% coupon, short maturity, single partition, whitelist + internal KYC on, one coupon
configured. Issued and configured in the official ATS web app, not in our code.

**Demo lot (frozen).** 10 bonds. Sealed reserve 14,000 USDC. Buyer A bids 14,500 USDC (loses).
Buyer B bids 15,200 USDC (wins). Amounts are the total for the lot, in USDC 6-decimal units.

**Happy path.**
1. Seller creates a *hold* of 10 bonds with `ExitAuction` as escrow (bonds stay in the seller's
   wallet and keep earning coupons), then registers the auction on Hedera with a **sealed
   reserve** of 14,000 USDC (a keccak commitment). Seller posts reserve + salt to our backend.
2. Operator mirrors the auction on Arc (`BidEscrow.registerAuction`).
3. Buyers A and B approve and deposit 14,500 and 15,200 USDC on Arc. Buyer C's wallet sees
   "not eligible" and cannot bid; a forced settlement attempt to C reverts on Hedera with the ATS
   error.
4. After the deadline the backend triggers the Chainlink CRE workflow. Inside the TEE handler
   the workflow fetches the sealed reserve and a confidential compliance screen using secrets,
   verifies the commitment, picks the highest compliant bid ≥ reserve, and writes a DON-signed
   report to Arc: `BidEscrow` marks the auction **Awarded**.
5. Operator executes the hold on Hedera: `ExitAuction.settle` → ATS `executeHoldByPartition` →
   the bond moves to the winner **only if the token's compliance checks pass at that instant**.
6. Operator confirms delivery on Arc → USDC to the seller; the losing bidder withdraws.
7. The ATS coupon view shows the buyer as the new entitled holder (lifecycle op).

**Positioning (say this in README and video).** Compared with other ATS venues:
holder-initiated exit auctions rather than dealer RFQ; the cash leg lives on Arc, a
stablecoin-native chain; the award is computed inside a confidential workflow; cross-chain
settlement is coordinated in explicit steps and the limitation is named, not hidden.

**Trust model (state it, don't hide it).** The award is DON-attested on Arc. Delivery on Hedera
and delivery confirmation on Arc are operator actions. The operator can grief (void, cancel) but
cannot redirect money: `confirmDelivery` pays only the seller, refunds go only to bidders, and ATS
rejects any non-compliant recipient regardless of who calls. The Hedera tx hash stored on Arc is a
pointer, not a proof. The production path (`docs/MAINNET.md`): a second CRE trigger reads Hedera
over HTTP and writes `confirmDelivery` itself; KeystoneForwarder + `setExpectedWorkflowId`
replace the simulation forwarder.

---

## 4. Architecture

```
Hedera testnet (296)                     Arc testnet (5042002)               Chainlink CRE
┌──────────────────────┐                 ┌──────────────────────┐            ┌──────────────────────┐
│ ATS bond (diamond)   │◄─ executeHold ──│                      │            │ award-workflow       │
│  control list + KYC  │                 │  BidEscrow.sol       │◄─ report ──│  handlerInTee:       │
│  holds, coupons      │                 │   USDC 0x3600…       │  (forwarder│   secrets, sealed    │
└──────────▲───────────┘                 │   Bidding→Awarded→   │   onReport)│   reserve, screen,   │
           │ createHold / settle         │   Settled|Voided     │            │   computeAward       │
┌──────────┴───────────┐                 └──────────▲───────────┘            └──────────▲───────────┘
│ ExitAuction.sol      │                            │ placeBid / confirmDelivery         │ HTTP trigger
│  Open→Settled|Cancel │                            │                                     │ + snapshot/screen
└──────────▲───────────┘                            │                                     │
           │                 ┌──────────────────────┴───────────────────────┐             │
           └─────────────────┤ apps/web: Next.js UI + /api (operator, JSON) ├─────────────┘
                             └──────────────────────────────────────────────┘
```

Full diagrams, sequence and trust model: `docs/architecture.md`. Threats and mitigations:
`docs/specs/09-threat-model.md`.

**Chains and fixed addresses**

| Item | Value |
|---|---|
| Hedera testnet | chain id 296 · RPC `https://testnet.hashio.io/api` · mirror `https://testnet.mirrornode.hedera.com/api/v1` · explorer `https://hashscan.io/testnet` |
| ATS shared Factory / Resolver (v8, 2026-06-12) | `0.0.9213391` = `0xd1F118A40f3b02883D35909eF2517e7EDd78379d` / `0.0.9212226` = `0xBA2D5FC2083A0b8f164c50e65d782087fBA18E0a`; bond config `0x…02`, version 1 |
| ATS default partition | `0x0000000000000000000000000000000000000000000000000000000000000001` |
| Arc testnet | chain id 5042002 · RPC `https://rpc.testnet.arc.io` · explorer `https://testnet.arcscan.app` · faucet `https://faucet.circle.com` |
| USDC on Arc (ERC-20 interface, 6 decimals) | `0x3600000000000000000000000000000000000000` |
| Arc fee floor | base fee ≥ 20 gwei → always set `maxFeePerGas ≥ 30 gwei` |
| CRE forwarders on Arc testnet | `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` and `0x76c9cf548b4179F8901cda1f8623568b58215E62` (sources disagree on which is simulation vs production; `BidEscrow` has `setForwarderAddress`; L4 confirms from the first broadcast tx) |

---

## 5. Frozen interfaces

The following are normative and copied verbatim into the specs. Change them only by editing the
spec first and logging the change in §11.

- `ExitAuction.sol` — `docs/specs/01-exit-auction.md`
- `BidEscrow.sol` and the CRE report payload — `docs/specs/02-bid-escrow.md`
- Award engine types and `computeAward` semantics, CRE config/secrets — `docs/specs/03-cre-award-workflow.md`
- Backend REST endpoints and JSON shapes — `docs/specs/04-backend-api.md`
- Frontend routes and per-page contract calls — `docs/specs/05-frontend.md`
- Env vars, `addresses.json` schema, toolchain — `docs/specs/07-envs-addresses-toolchain.md`

Cross-chain binding: `ref = keccak256(abi.encode(uint256(296), address(exitAuction), uint256(auctionId)))`.
Reserve commitment: `keccak256(abi.encode(uint256 reserveUsdc6, bytes32 salt))`.

---

## 6. Lanes and status board

Statuses: `todo` · `doing` · `blocked` · `done`. Owner is whoever took it (Laín / Axel / agent
name). Hours are minimum-viable / full.

| Lane | Spec | Directory | Depends on | Status | Owner | h |
|---|---|---|---|---|---|---|
| **L0** Bootstrap: git repo + remote, npm workspaces, Foundry + CRE CLI + Next.js scaffold, Issuer + 6 EOAs, `addresses.json` skeleton | `docs/specs/07-envs-addresses-toolchain.md` | repo root, `packages/shared`, `packages/contracts`, `apps/web` | — | doing | | 1.5 / 2 |
| **L1** ATS issuance runbook: bond on testnet, whitelist + KYC for A/B, coupon, hold primitives proven with `cast` | `docs/specs/06-ats-issuance-runbook.md` | `docs/runbooks`, `scripts/ats` | L0 | todo | | 4 / 6 |
| **L2** `ExitAuction.sol`: contract, Foundry tests with a mock ATS, deploy, HashScan verify | `docs/specs/01-exit-auction.md` | `packages/contracts/src/hedera`, `test`, `script` | L1 (for the real-token test) | doing | agent | 4 / 6 |
| **L3** `BidEscrow.sol`: contract, tests, deploy, ArcScan verify, `onReport` receiver | `docs/specs/02-bid-escrow.md` | `packages/contracts/src/arc`, `src/cre`, `test`, `script` | L0 | doing | L3 agent | 5 / 7 |
| **L4** CRE award workflow: `handlerInTee`, report, EVM write to Arc, simulate + `--broadcast`, evidence | `docs/specs/03-cre-award-workflow.md` | `packages/cre-award`, `packages/shared/src/award.ts` | L3 address; L5 endpoints (mockable) | doing | L4 agent | 5 / 8 |
| **L5** Backend + operator: API routes, JSON store, shared award engine, operator scripts | `docs/specs/04-backend-api.md` | `apps/web/app/api`, `scripts/ops`, `packages/shared` | L2/L3 ABIs (from the spec, before deploy) | blocked | agent | 5 / 8 |
| **L6** Frontend: `/`, `/sell`, `/auction/[ref]`, `/operator`; two chains; eligibility UX | `docs/specs/05-frontend.md` | `apps/web/app` (pages, components) | L5 API shape, ABIs | done | agent | 7 / 10 |
| **L7** Docs, diagram, video, submission: README, `docs/architecture.md` + PNG, AI disclosure, MAINNET, evidence, video, form | `docs/specs/08-demo-and-submission.md` | `docs`, `README.md` | all | todo | | 6 / 8 |

Totals: minimum viable ≈ 38 h, full ≈ 55 h. Two people at 26–32 productive hours each. **Build
the minimum-viable version of every lane before any "full" item.**

**Critical path:** L1 bond issued and hold sanity proven → L2 `settle` succeeds on testnet →
manual end-to-end with scripts (gate G2) → frontend glue → video. L1 starts in hour one.

---

## 7. Taking a lane

1. Set the lane to `doing` with your name in §6 (one-line commit `docs: L3 doing (Axel)`).
2. Launch or do the work with the spec's "Minimum viable" section as the definition of done.
3. When the acceptance criteria pass, paste the evidence (tx hashes, explorer URLs, command
   output) at the bottom of the spec under "Evidence", set the lane to `done`, commit.
4. Anything you learned that the next lane needs goes into the relevant spec's "Known pitfalls".

Parallelism rule: L2, L3, L5 and L6 can start immediately against the frozen interfaces with
mocks; they do not wait for deployments. L4 needs the `BidEscrow` address only for `--broadcast`.

**Path deny-list (split C).** An agent may only write the paths listed for its lane. Shared
files (`addresses.json`, ABIs) are append-only in their own commits.

| Lane | May write | Must not touch |
|---|---|---|
| L2 | `packages/contracts/src/hedera/`, `src/interfaces/IATSBond.sol`, `test/ExitAuction*`, `test/mocks/MockATSBond.sol`, `script/DeployHedera.s.sol` | `src/arc`, `src/cre`, `apps/`, `packages/cre-award` |
| L3 | `packages/contracts/src/arc/`, `src/cre/`, `test/BidEscrow*`, `test/mocks/MockUSDC.sol`, `script/DeployArc.s.sol` | `src/hedera`, `apps/`, `packages/cre-award` |
| L4 | `packages/cre-award/`, `packages/shared/src/award.ts`, `packages/shared/test/award.test.ts` | contracts, `apps/web` |
| L5 | `apps/web/app/api/`, `apps/web/lib/`, `scripts/ops/`, `scripts/demo/`, `packages/shared/src/{ref,commitment,chains,errors}.ts`, `packages/shared/src/abi/` | pages, `award.ts` |
| L6 | `apps/web/app` pages/layouts/components, wagmi config | `app/api`, server-only `lib`, `scripts/`, `award.ts` |
| All | `addresses.json` append-only, own commit | `.env*`, `CONTEXT.md`, `CLAUDE.md` |

---

## 8. Schedule and gates (ART, UTC−3)

Planning finished Friday 2026-09-11 ~15:30 ART. About 45 hours remain.

| When | Work | Gate |
|---|---|---|
| Fri 16–17 | L0: git repo + remote, workspaces, Foundry + CRE CLI + Next.js scaffold, Issuer + 6 EOAs, faucets; first commits | — |
| Fri 17–21 | L1 spike (bond in the ATS app + `cast` hold sanity) ‖ L2/L3 agents build contracts + tests against mocks; L6 scaffold | **G1 Fri 21:00** — bond exists on testnet; a hold created by Seller and executed by an EOA escrow to A succeeds and to C reverts. Red at **23:00** → switch L1 to the locally run ATS app or the SDK |
| Fri 21–02 | L2 deploy + verify + real `settle`; L3 deploy + verify; L4 scaffold with `--http-payload` (no chain); L5 routes | **G2 Sat 02:00** — manual end-to-end via scripts: hold → auction → register → 2 bids → `awardByOperator` → `settle` → `confirmDelivery` → `withdraw`, all on explorers |
| Sat 02–09 | Sleep. Whoever is awake: L6 pages via agents | — |
| Sat 09–14 | L6 pages ‖ L4 `--broadcast` to Arc, `onReport` accepted (forwarder confirmed); L5 close/settle routes wired | **G3 Sat 14:00 — CRE go/no-go**: `simulate --broadcast` awards a real auction from a real snapshot. No → `AWARD_MODE=local`, keep the simulate transcript as partial evidence |
| Sat 14–20 | Integration UI ↔ API ↔ CRE; `scripts/demo/seed.ts`; coupon beat in the ATS app; non-KYC beat; operator panel; diagram + README started; evidence capture | **G4 Sat 20:00** — timed dry run of the demo script from a clean seed |
| Sat 20–22 | Fixes from the dry run only | **Feature freeze Sat 22:00**, tag `v0.1.0-freeze` |
| Sat 22–01 | Record raw clips per beat (1080p) ‖ README, `docs/architecture.md` + PNG, AI disclosure, MAINNET, specs final | — |
| Sun 09–11 | Edit + narrate video (target 3:30) ‖ re-verify every explorer link, evidence folder, addresses | **G5 Sun 11:00** — submission checklist 100 % |
| Sun 11–12 | Fill the ETHGlobal form (Hedera · Tokenization of Anything; Arc · Best DeFi/Onchain Finance; Chainlink · Best Confidential Workflow), upload, **submit by 12:00** | hard deadline 13:00 |

If G1 is red at 23:00 Friday, everything else still proceeds against a mock bond; the real bond
is swapped in by address when it exists. Nothing else waits on L1 except the real-token test in L2.

## 9. Deployed addresses (append-only; mirror of `packages/shared/src/addresses.json`)

<!-- PRE-SUBMISSION: every "pending" cell below must be a real address or removed. -->

| Network | Contract | Address | Verified | Deployed by / when |
|---|---|---|---|---|
| hedera-testnet | ATS bond "ON Serie I 2027" | `0x619dc395ec05139cdfaa8089c854568e398463dd` (`0.0.10485273`) | n/a (ATS proxy) | whitelist + internal KYC on; mint/KYC pending |
| hedera-testnet | `ExitAuction` | `0x74F7E850AC2511b837480983f6ED9308b3842377` | HashScan pending Sourcify | L0 operator, 2026-09-11 |
| arc-testnet | `BidEscrow` | `0x74F7E850AC2511b837480983f6ED9308b3842377` | [ArcScan](https://testnet.arcscan.app/address/0x74F7E850AC2511b837480983f6ED9308b3842377) | same CREATE address as ExitAuction (operator nonce 0) |
| arc-testnet | CRE forwarder in use | _pending L4_ | — | |

Demo wallets (addresses only, never keys):

| Actor | Address |
|---|---|
| Issuer | `0x5181d07b55ad3496c8bd4671fa50f8451ce0c98a` |
| Seller | `0xE789FA2538505252B5dCeAe9250705046640A7D4` |
| Buyer A | `0x39E24D0C0a464a9249A908Cc6727cFd69Be8c1F9` |
| Buyer B | `0xC728d5658e1256330D842607A6029C0d06727435` |
| Buyer C | `0x326B63C281Ea426dd9802Fe442d920B6399a0F98` |
| Operator | `0x5aDCDb627A75346B74Ed9778161972F5e51E535d` |
| CRE signer | `0x0746C2223F371Be047dEEe889A5e9b968aF9de18` |

---

## 10. Non-goals (do not build these)

Order book or continuous matching · sealed *bids* (only the reserve is sealed; bid amounts are
public on Arc) · second-price clearing · atomic cross-chain settlement · NAV/price oracle ·
Hedera Scheduled Transactions · Circle App Kit / Gateway / Wallets (stretch only, after G3) ·
Hedera Consensus Service · multi-partition tokens · ERC-3643 identity registry (we use ATS
internal KYC + control list) · Arc mainnet before the deadline (documented path only) · 1inch ·
mirror-node event indexer (contracts expose array getters; backend keeps a JSON registry) ·
seller-signed reserve submission · any admin UI for issuance (the ATS web app does it).

Fallbacks, in order of preference, if a lane is red at its gate: fixed-price listing instead of
auction (never needed if L2/L3 are done; keep as a note) · `AWARD_MODE=local` instead of CRE
writes · operator-only Arc escrow · Hedera-native USDC (`0.0.429274`) only if Arc is unusable.

---

## 11. Decision log

- 2026-09-11 — Deadline is Sun 2026-09-13 13:00 ART (ethglobal.com `submissionDeadline`); the
  earlier 09-16 note was the event end date.
- 2026-09-11 — Tracks: Hedera + Arc + Chainlink (ETHGlobal cap of 3 partners). 1inch dropped.
- 2026-09-11 — Market mechanism: exit auction with sealed reserve, first-price. Order book and
  OpenSea-style offers rejected (thin market, demo time).
- 2026-09-11 — Demo asset: ATS Bond styled as an Argentine ON; issued in the ATS web app.
- 2026-09-11 — Cash leg on Arc with coordinated multi-step settlement; Hedera-only USDC rejected
  because CRE cannot write to Hedera and it would drop Arc.
- 2026-09-11 — Holds (`createHoldByPartition` with the contract as escrow) instead of
  `approve`/`transferFrom`: the ATS `approve` path requires a whitelisted spender, holds keep
  coupon entitlement, and compliance is checked at execution.
- 2026-09-11 — Foundry for contracts (single `forge verify-contract` for Sourcify/HashScan and
  Blockscout/ArcScan; no Node coupling). Solidity 0.8.26, `evm_version = paris`.
- 2026-09-11 — Positioning vs. other ATS venues seen this hackathon: holder-initiated, Arc cash
  leg, TEE award, honest coordination.
- 2026-09-11 — Working codename "Remate"; final name pending.
- 2026-09-11 — Demo lot frozen: 10 bonds, reserve 14,000 USDC, bids 14,500 / 15,200.
- 2026-09-11 — Actor set: Issuer (portal ECDSA) + six EOAs (Seller, A, B, C, Operator, CRE signer).
- 2026-09-11 — `packages/shared` ownership: L0 skeleton + package.json; L4 `award.ts`; L5 ref/commitment/chains/errors/abi; `addresses.json` append-only.
- 2026-09-11 — L0 must scaffold Foundry and Next.js (`create-next-app` + wagmi/viem/Tailwind) so L2/L3 and L5/L6 do not collide.
- 2026-09-11 — Agent split C (hybrid) with path deny-list in §7.

---

## 12. Open questions for the team

1. Final project name (README title, video title card, ETHGlobal form).
2. Whether to attempt the Arc mainnet deployment between Sep 16 and Sep 30 (`docs/MAINNET.md`).
3. Which "full" items to pull in after G3 (order: on-chain `bidsDigest` check → timeline UI →
   coupon *payment* beat → sanctions-hit bidder beat).

---

## 13. Documents

| File | What it is |
|---|---|
| `docs/specs/00-overview.md` | Actors, happy path, glossary, non-goals |
| `docs/specs/01-exit-auction.md` | Hedera contract spec (L2) |
| `docs/specs/02-bid-escrow.md` | Arc escrow + CRE receiver spec (L3) |
| `docs/specs/03-cre-award-workflow.md` | Confidential workflow spec (L4) |
| `docs/specs/04-backend-api.md` | API + operator spec (L5) |
| `docs/specs/05-frontend.md` | UI spec (L6) |
| `docs/specs/06-ats-issuance-runbook.md` | Bond issuance in the ATS app + sanity checks (L1) |
| `docs/specs/07-envs-addresses-toolchain.md` | Installs, env vars, addresses schema, git rules (L0) |
| `docs/specs/08-demo-and-submission.md` | Video script, recording plan, submission checklist (L7) |
| `docs/specs/09-threat-model.md` | State machines, holes and mitigations, trust assumptions |
| `docs/architecture.md` | Component + sequence diagrams, trust model, limitation |
| `docs/decisions.md` | ADR-style log with rejected alternatives |
| `docs/MAINNET.md` | Arc mainnet path after the deadline |
| `docs/AI_DISCLOSURE.md` | Where and how AI tools were used (ETHGlobal requirement) |
| `docs/evidence/README.md` | How to capture CRE simulation evidence and explorer proofs |
