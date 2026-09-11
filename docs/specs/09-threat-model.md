# 09 · Threat model — state machines, holes, trust assumptions

Lane: cross-cutting (L2, L3, L4, L5) · Status: reference · Owner: —
Read first: `PLAN.md`, `00-overview.md`. Contract details live in `01-exit-auction.md` and `02-bid-escrow.md`; this file is the single place where the security reasoning is written down so the README and the video can point at it.

## 1. State machines

### 1.1 `ExitAuction` (Hedera)

`None → Open → Settled | Cancelled`

| From | To | Who | Precondition | Effect | Event |
|---|---|---|---|---|---|
| None | Open | seller (hold owner) | hold.escrow == ExitAuction; destination == 0; amount matches; expiration ≥ deadline + 72h; deadline ≥ now + 2 min; not listed | auction stored; `ref` derived | `AuctionCreated` |
| Open | Settled | operator | now ≥ deadline; `executeHoldByPartition` succeeds (ATS compliance on winner) | bond moves seller → winner | `AuctionSettled` |
| Open | Open | operator | ATS reverts (non-compliant winner) | whole tx reverts, no state change | none (ATS selector on HashScan) |
| Open | Cancelled | seller | now < deadline | try release hold; Cancelled | `AuctionCancelled(holdReleased)` |
| Open | Cancelled | operator | any time while Open | same | `AuctionCancelled(holdReleased)` |

### 1.2 `BidEscrow` (Arc)

`None → Bidding → { Awarded → { Settled | Voided } } | Cancelled | Expired | NoWinner`

| From | To | Who | Precondition | Effect | Event |
|---|---|---|---|---|---|
| None | Bidding | operator | deadline > now | auction mirrored under `ref` | `AuctionRegistered` |
| Bidding | Bidding | bidder | now < deadline; amount > 0 | USDC escrowed; total += amount | `BidPlaced` |
| Bidding | Awarded | forwarder (CRE report) / operator | now ≥ deadline; commitment matches; bids[winner] ≥ price > 0 | winner, price, source, awardedAt | `Awarded(source)` |
| Bidding | NoWinner | forwarder / operator | now ≥ deadline; commitment matches; outcome ≠ 1 | all refundable | `NoWinner` |
| Bidding | Cancelled | operator | — | all refundable | `AuctionCancelled` |
| Bidding | Expired | anyone | now > deadline + 24h | all refundable | `AuctionExpired` |
| Awarded | Settled | operator | — | USDC → seller (clearingPrice) | `DeliveryConfirmed` |
| Awarded | Voided | operator | — | all refundable | `AwardVoided` |
| Awarded | Voided | anyone | now > awardedAt + 24h | all refundable | `AwardVoided` |
| terminal | — | bidders | — | `withdraw` only | `Withdrawn` |

Timing invariant across chains: `AWARD_WINDOW + SETTLE_WINDOW = 48h < SETTLE_GRACE = 72h`, so the Hedera hold is still executable during the entire window in which Arc can still settle.

## 2. Holes and their fixes

| # | Hole | Fix | How to test it |
|---|---|---|---|
| 1 | **Report replay.** `cre workflow simulate --listen` re-runs, or the forwarder re-delivers the same report | `_award` requires `status == Bidding`; Awarded/NoWinner are never re-entered; `ref` is inside the payload | Foundry: deliver the same report twice → second reverts `BadStatus(Awarded)` (spec 02 test 11) |
| 2 | **Report for the wrong auction or chain** | `ref = keccak256(abi.encode(296, exitAuction, id))` is computed on Hedera, stored on Arc at registration, and carried in the report; an unknown ref reverts `UnknownRef` | Foundry: report with a ref that was never registered → `UnknownRef`; TS unit test: `computeRef` in `packages/shared` equals the Solidity value |
| 3 | **Award before bidding closes** | `_award` requires `block.timestamp ≥ deadline`, on the CRE path and the operator path alike | Foundry: award at `deadline − 1` → `BeforeDeadline` (spec 02 test 8) |
| 4 | **Winner with insufficient escrow** | `bids[ref][winner] ≥ clearingPrice > 0` | Foundry: award with price above the winner's bid → `InsufficientBid` (test 10) |
| 5 | **Backend feeds the TEE a fake reserve** | The TEE recomputes `keccak256(abi.encode(reserve, salt))` from the snapshot and puts it in the report; the contract compares it with the commitment stored at registration (which came from Hedera) | Foundry: report with a different commitment → `CommitmentMismatch` (test 9); TS: `computeAward` throws when the snapshot's commitment does not match |
| 6 | **Void after delivery** | `voidAward` only from Awarded; Settled is terminal | Foundry: void after `confirmDelivery` → `BadStatus(Settled)` |
| 7 | **Double payment / reentrancy** | pull-based `withdraw`, balance zeroed before transfer, `nonReentrant`, `SafeERC20` | Foundry: malicious ERC-20 mock re-enters `withdraw` → no double pay (test 25); winner withdraws excess twice → second `NothingToWithdraw` (test 12) |
| 8 | **Operator disappears, USDC stuck** | `expireAuction` by anyone after `deadline + 24h`; `voidAward` by anyone after `awardedAt + 24h`; on Hedera the hold is reclaimable by anyone after expiry (native ATS) | Foundry: warp and call from a stranger (tests 16–17); cast on testnet: `reclaimHoldByPartition` after expiry |
| 9 | **Hold expires before settlement** | `createAuction` requires `hold.expiration ≥ deadline + 72h`; Arc windows sum to 48h | Foundry: create with expiration = deadline + 71h → `HoldExpiresTooEarly` (spec 01 test 5); constant assertion test that 24h + 24h < 72h |
| 10 | **Same hold listed twice** | `listedHold[token][seller][holdId]` guard | Foundry: second `createAuction` with the same hold → `AlreadyListed` (spec 01 test 6) |
| 11 | **Backend hides bids from the TEE (censorship)** | The report carries `bidsDigest` over the snapshot; MV emits it so anyone can compare with `bidsDigest(ref)` on-chain; Full verifies it in `_award` | MV: script that reads `Awarded.bidsDigest` and `bidsDigest(ref)` and asserts equality; Full: Foundry test 24 |

Additional guards that fall out of the design:

| Concern | Guard |
|---|---|
| Seller lists but the winner is ineligible at settlement | ATS reverts `executeHoldByPartition`; nothing moved on Hedera; operator voids on Arc; everyone withdraws |
| Seller transfers the bond away after listing | Impossible: the hold locks the amount (available balance excludes held tokens) |
| Seller front-runs by cancelling after bids | `cancel` by seller only before the deadline; after the deadline only the operator can cancel, and the operator has no incentive to |
| Zero-address winner in an "AWARDED" report | `_award` rejects `winner == 0` for outcome 1 |
| Operator registers an auction on Arc with a different seller | The operator is trusted for mirroring in MV; the frontend cross-checks `BidEscrow.getAuction(ref).seller` against `ExitAuction.getAuction(id).seller` and shows a warning if they differ |

## 3. Trust assumptions (hackathon build)

| Party / component | Trusted for | Not trusted for |
|---|---|---|
| **Operator key** | Mirroring auctions faithfully; triggering close; executing the hold; calling `confirmDelivery` / `voidAward` honestly and promptly | Custody of any funds; choosing the winner (the report does that); delivering to a non-compliant wallet (ATS blocks it) |
| **Chainlink CRE (simulation)** | Executing the award logic and producing the report | Hardware attestation: the simulator is not a real TEE and says so on screen. Never claim otherwise |
| **Mock forwarder (simulation)** | Delivering the report to `onReport` | Signature verification: it accepts unsigned reports; contract-level checks 1–5 are the actual defence in the demo |
| **Backend** | Custody of the sealed reserve + salt (demo-grade JSON store); serving the bid snapshot and the compliance screen to the TEE | Being unable to lie about bids (hole 11, digest) or the reserve (hole 5, commitment) |
| **Hedera RPC (Hashio) and mirror node** | Availability during the demo | — (record footage early) |
| **Arc testnet** | Availability | — (record footage early) |
| **ATS bond contracts** | Enforcing whitelist/KYC at hold execution; hold semantics (escrow-only execute/release, permissionless reclaim after expiry) | Nothing beyond what was verified with `cast` in spec 01 §7 |

## 4. What the operator can and cannot do

| Can (grief) | Cannot |
|---|---|
| Not mirror an auction to Arc (seller cancels on Hedera; nothing lost) | Move USDC to any address other than the registered seller (`confirmDelivery`) or the depositing bidder (`withdraw`) |
| Not trigger the close (anyone can `expireAuction` after 24h; all bids refundable) | Change or remove a bid |
| Not settle after an award (anyone can `voidAward` after 24h; all bids refundable) | Deliver the bond to a wallet that is not whitelisted + KYC'd (ATS reverts) |
| Cancel an auction on Hedera (hold released to seller) or on Arc (bids refundable) | Deliver the bond without a hold created by the seller |
| Award via `awardByOperator` when CRE is unavailable — **visible** as `source = Operator` in the event | Hide that the operator path was used |
| Register a wrong seller on Arc (frontend cross-check warns; UI-level, not enforced on-chain in MV) | Pay a seller more than the winner's escrowed bid |

## 5. What production changes

| Hackathon (MV) | Production |
|---|---|
| Mock forwarder, unsigned reports | `KeystoneForwarder` verifies DON signatures; receiver enables `setExpectedWorkflowId` / author checks so only our workflow can award |
| Operator calls `confirmDelivery` after watching Hedera | A second CRE trigger (cron or HTTP) reads the Hedera mirror node over HTTP, verifies `HoldByPartitionExecuted` for the auction, and writes `confirmDelivery` itself; the operator is removed from the payment path |
| Secrets from `.env` via `secrets.yaml` in simulation | Vault DON secrets, per-workflow, encrypted at rest |
| Simulator "not a real TEE" | AWS Nitro enclave in `us-west-2`; DON verifies the enclave attestation before accepting the report |
| `bidsDigest` emitted, not checked | `bidsDigest` verified on-chain in `_award` |
| Reserve + salt POSTed unauthenticated to the backend | Seller signs the reserve submission (EIP-712), or encrypts it to the workflow's public key so the backend never sees plaintext |
| Public bid amounts | Sealed bids: commitments on Arc, plaintext delivered encrypted to the enclave; over-collateralised deposits with refund of excess |
| `awardByOperator` fallback enabled | Fallback disabled or time-locked; `AwardSource.Operator` alerts |
| Operator mirrors the auction to Arc | CRE log trigger on Hedera (if/when supported) or a light-client proof; until then, cross-check on the frontend |
| Single operator EOA | Multisig or role-separated keys (register / settle / void) |
| Internal KYC + control list | ERC-3643 identity registry with claim issuers; screening provider with real sanctions data |

## 6. Residual risks (stated plainly, also in README)

1. **Settlement is coordinated, not atomic.** Two chains, one operator between them. USDC is only released after delivery, and the bond can only move to a compliant wallet, so the failure modes are stalls and refunds, not theft — but a stall is possible.
2. **`hederaTxHash` on Arc is a pointer, not a proof.** Arc cannot verify a Hedera transaction; the value is for the UI and auditors.
3. **The backend holds the sealed reserve.** A compromised backend could leak it (but could not forge it, thanks to the commitment).
4. **Single operator key.** Compromise means griefing (void/cancel/stall), not fund loss.
5. **Simulation forwarder accepts unsigned reports.** A party who knows the mock forwarder address could relay a report for an open auction; contract checks limit the damage to awarding an actual bidder at their actual bid, at or after the deadline, with the correct commitment — which is the same outcome an honest run would produce for the highest eligible bid only if they also pick the right winner. This is acceptable for a testnet demo and is called out in the video.
6. **ATS compliance semantics are as verified in spec 01 §7.** Any ATS behaviour not exercised there is assumed, not proven.

## 7. Acceptance criteria

- [ ] Every row in §2 has a passing test or a recorded `cast` check referenced in the evidence tables of specs 01/02.
- [ ] README contains the §6 residual-risk list verbatim (or a link here).
- [ ] The video says "simulated enclave" when the CRE terminal is on screen.

## 8. Minimum viable / Full

| MV | Full |
|---|---|
| §1–§6 as written; holes 1–10 enforced on-chain; hole 11 auditable off-chain | Hole 11 enforced on-chain; forwarder workflow-id check; seller-signed reserve |

## 9. Out of scope

Formal verification; audits; economic attacks on price discovery (collusion, shilling); MEV on Arc; Hedera consensus-level assumptions.

## 10. Known pitfalls

- Do not "fix" hole 7 with push refunds — that reintroduces reentrancy and gas griefing.
- Do not let the operator path bypass the deadline or commitment checks "for demo convenience"; the fallback must be observably equivalent to the CRE path except for `source`.
- Do not log the reserve inside the TEE handler, even in simulation, if the terminal will be recorded.

## 11. Evidence

| Item | Value / link |
|---|---|
| Test names covering holes 1–11 | |
| `cast` check results (spec 01 §7) | |
| Forwarder address confirmed from first broadcast tx | |
