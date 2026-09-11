# Decision log

One entry per decision. Format: Date · Status · Context · Decision · Consequences ·
Alternatives rejected. Add new entries at the bottom; never rewrite an accepted one, add a
superseding entry instead.

## D1 — Exit auction with a sealed reserve
Date 2026-09-11 · Status accepted
Context: the market is thin; a demo must show one complete trade in under four minutes;
the sponsor brief allows order book or auction.
Decision: a holder-initiated auction with a fixed deadline, public USDC bids, and a reserve
price committed on-chain and revealed only inside the award computation.
Consequences: one seller action, no matching engine, a natural role for the confidential
workflow, losers refunded by withdrawal.
Rejected: continuous order book (empty book on video, matching engine to build);
OpenSea-style offers (extra seller acceptance step); fixed-price listing (weaker story;
kept as the documented fallback if the auction slips).

## D2 — ATS Bond styled as an Argentine ON, issued in the ATS web app
Date 2026-09-11 · Status accepted
Context: Hedera favours real asset classes with real lifecycle management; nobody on the
team had used ATS.
Decision: issue a fixed-rate bond ("ON Serie I 2027") through the official Studio web app,
with a coupon configured; build only the marketplace.
Consequences: issuance and configuration are shown in the Studio itself; a coupon is a
lifecycle operation available for the video; a day of issuer UI work avoided.
Rejected: equity/fund unit (NAV oracle needed, lifecycle harder to show); invoice (not a
native ATS type); our own issuer UI (duplicates the Studio).

## D3 — Cash leg on Arc with coordinated multi-step settlement
Date 2026-09-11 · Status accepted
Context: Circle's Arc is the stablecoin-native chain the team targets; there is no Circle
interop with Hedera; Chainlink CRE writes to Arc but not to Hedera.
Decision: bids and escrow in USDC on Arc; award written to Arc by CRE; delivery on Hedera by
the operator; cash released after delivery. Settlement is coordinated, not atomic, and the
docs say so.
Consequences: two chains in the wallet UX; an operator role; a clear "multi-step
conditional settlement" story for Arc; strong on-chain evidence for Chainlink.
Rejected: Hedera-native USDC with atomic DvP in one transaction (cleaner, but CRE cannot
write to Hedera and Arc would be dropped; kept as fallback).

## D4 — Holds instead of approve/transferFrom
Date 2026-09-11 · Status accepted
Context: ATS `approve` requires the spender to pass the token's compliance checks, so the
venue contract would need to be whitelisted; ATS ships a hold primitive designed for
marketplace escrow.
Decision: the seller creates a hold with `ExitAuction` as escrow and an open destination;
settlement executes the hold to the winner.
Consequences: the venue never holds the asset; held bonds keep coupon entitlement;
compliance is checked at execution; expired holds are reclaimable by anyone.
Rejected: `approve` + `transferFrom` (venue must be a compliant holder); clearing mode
(one-way switch that disables normal transfers and holds); locks (cannot deliver to a third
party).

## D5 — Chainlink CRE confidential award written to Arc
Date 2026-09-11 · Status accepted
Context: the Chainlink track requires a `handlerInTee` handler processing a sensitive input
and meaningfully integrated; Arc testnet is a supported CRE write target.
Decision: the enclave fetches the sealed reserve and a compliance screening with secret
keys, computes the award, and the DON writes the report to `BidEscrow.onReport`.
Consequences: the escrow has no award path except the report (or the documented operator
fallback); evidence is a real Arc transaction from a simulated run.
Rejected: award posted over HTTP to our backend (weaker evidence, backend becomes the
authority); sealed bids by client-side encryption decrypted in the enclave (too much for
the window; only the reserve is sealed).

## D6 — First-price clearing
Date 2026-09-11 · Status accepted
Context: bids are public amounts; the video has no time to explain auction theory.
Decision: the winner pays their own bid; `clearingPrice = winner.amount`.
Consequences: no partial refund for the winner; the interface keeps `clearingPrice` so a
second-price rule can be added later.
Rejected: second-price (Vickrey) — extra refund logic and explanation time for no visible
benefit with public bids.

## D7 — Foundry over Hardhat
Date 2026-09-11 · Status accepted
Context: nothing was installed locally; Node 25 triggers Hardhat's unsupported-version
warnings; two explorers to verify against.
Decision: Foundry for contracts, tests, deploys, and verification (`forge verify-contract`
with the Sourcify verifier for HashScan and the Blockscout verifier for ArcScan).
Consequences: one toolchain for both chains; `cast` used for the ATS sanity tests.
Rejected: Hardhat (Node friction, two verification plugins).

## D8 — Three partners: Hedera, Arc, Chainlink
Date 2026-09-11 · Status accepted
Context: ETHGlobal allows at most three partner prizes per submission; the team has prior
experience with 1inch SwapVM and Chainlink CRE.
Decision: submit to Hedera Tokenization of Anything, Arc Best DeFi/Onchain Finance
Application, Chainlink Best Confidential Workflow.
Consequences: every integration must be load-bearing; 1inch Aqua is not pursued.
Rejected: 1inch Aqua (no fourth slot; would need a redeploy on Hedera).

## D9 — No fixed lane owners
Date 2026-09-11 · Status accepted
Context: two people, agents doing most typing, unpredictable blockers per lane.
Decision: lanes with frozen interfaces; whoever is free takes the next lane and launches
agents; the status board in `PLAN.md` is the source of truth.
Consequences: interfaces change only by a commit to the spec plus a note in `PLAN.md`.
Rejected: fixed owner per lane (idle time when one lane blocks).

## D10 — English for everything in the repository
Date 2026-09-11 · Status accepted
Context: judges and sponsors read English; the team works in Spanish.
Decision: all repo docs, code comments, and the video in English; chat in Spanish.
Rejected: Spanish docs translated at the end (no time on Sunday).

## D11 — Public repo from day one, continuous commits
Date 2026-09-11 · Status accepted
Context: Hedera requires a public repo at submission; ETHGlobal may disqualify single
large commits or missing history.
Decision: `lainncalvo/ethglobalOnline` public now; commit at least every 45 minutes; small
commits with lane prefixes.
Rejected: private until submission (no benefit worth the extra step).

## D12 — Working codename "Remate"
Date 2026-09-11 · Status accepted (name pending)
Context: the final name is deferred by the team.
Decision: use "Remate" (Argentine Spanish for auction) in docs and UI until a final name is
chosen; one find-and-replace later.
Rejected: shipping without a name (README and form need one).

## D13 — Minimum-viable first, full items only after gate G3
Date 2026-09-11 · Status accepted
Context: about 48 working hours for seven lanes; MV ≈ 38 h, Full ≈ 55 h.
Decision: every lane ships its MV before anyone starts a Full item; Full items are picked
in priority order after the Saturday 14:00 CRE go/no-go.
Consequences: a demoable system exists by Friday night with the operator fallback.
Rejected: building Full versions lane by lane (nothing demoable until late).

## D14 — Backend as reserve custodian for the hackathon
Date 2026-09-11 · Status accepted (hackathon-grade)
Context: the reserve must be secret from bidders and available to the enclave; the
commitment is on-chain.
Decision: the frontend posts `{reserve, salt}` to the backend after the auction transaction;
the backend verifies the commitment and stores it; only the TEE handler and the local
fallback engine read it through a secret-authenticated endpoint; the enclave recomputes the
commitment before awarding.
Consequences: integrity is guaranteed by the on-chain commitment; secrecy relies on the
backend for the demo. Production path: reserve encrypted to a key held only in the enclave.
Rejected: on-chain encrypted reserve (key management in 48 h); seller signatures on the
submission (adds nothing visible in the demo).
