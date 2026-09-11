<!-- PRE-SUBMISSION: fill the Deployments table with explorer links, add the architecture PNG, write the Running it section, replace the working name if the team renames the project, remove this comment. -->
# Remate — exit auctions for tokenized bonds

> Working name. ETHOnline 2026 submission. Status: **in development** (see `PLAN.md`).

**Issuance is solved. Exit is not.** The ECB counted 183 tokenized bonds issued between 2018 and
2025 and could find secondary-market activity for only 20. Hedera's Asset Tokenization Studio
(ATS) lets an issuer mint a compliant bond and run its whole lifecycle, but once you hold one there
is nowhere to sell it.

Remate is that venue. A bondholder opens an **exit auction**; whitelisted investors bid **USDC on
Arc**; a **Chainlink confidential workflow** computes the award against a sealed reserve price and
a confidential compliance screen; settlement delivers the bond on **Hedera** with the token's own
compliance rules enforced at the moment of transfer.

## How it works

1. **List.** The seller places a *hold* on their ATS bond with the `ExitAuction` contract as
   escrow. The bond never leaves the seller's wallet and keeps earning coupons. The seller commits
   to a sealed reserve price.
2. **Bid.** KYC'd investors deposit USDC bids into `BidEscrow` on Arc. Wallets that are not on
   the bond's whitelist cannot bid.
3. **Award.** After the deadline, a Chainlink CRE workflow runs inside a confidential handler: it
   reads the sealed reserve and a compliance screen using secrets that never leave the enclave,
   picks the highest compliant bid at or above the reserve, and writes a DON-signed report to Arc.
4. **Settle.** The venue operator executes the hold on Hedera. ATS checks the buyer's whitelist
   and KYC status *at that instant*; a non-compliant buyer makes the transfer revert.
5. **Pay.** With delivery confirmed, USDC is released to the seller. Losing bidders withdraw.

## Architecture

_Diagram: `docs/architecture.md` (PNG to be added before submission)._

| Layer | Where | What |
|---|---|---|
| Asset + compliance | Hedera testnet | ATS-issued bond (whitelist, KYC, holds, coupons) and `ExitAuction.sol` |
| Cash leg + escrow | Arc testnet | `BidEscrow.sol` holding USDC (`0x3600…`), released only after award and delivery |
| Confidential award | Chainlink CRE | `handlerInTee` workflow; report delivered on Arc through the CRE forwarder |
| App | Next.js | Marketplace UI, operator console, API and operator scripts |

Settlement is **coordinated across two chains, not atomic**. The award is DON-attested on Arc;
delivery on Hedera and its confirmation on Arc are operator steps. The operator cannot redirect
funds: USDC can only go to the seller or back to bidders, and ATS rejects any non-compliant
recipient regardless of who calls. Details and the production path: `docs/architecture.md`,
`docs/specs/09-threat-model.md`, `docs/MAINNET.md`.

## Bounties

| Partner | Track | What we use |
|---|---|---|
| Hedera | Tokenization of Anything | ATS web app for issuance and configuration; `ExitAuction` on Hedera testnet, verified on HashScan; compliance-checked transfer; coupon configured |
| Arc (Circle) | Best DeFi/Onchain Finance Application | `BidEscrow` on Arc testnet with native USDC; multi-step conditional settlement; frontend + backend + architecture diagram |
| Chainlink | Best Confidential Workflow | CRE workflow with `handlerInTee`; sealed reserve, secret API keys and confidential screening processed in the enclave; simulation evidence in `docs/evidence/` |

## Deployments

_To be filled by the team as lanes complete. Source of truth: `packages/shared/src/addresses.json`._

| Network | Contract | Address | Explorer |
|---|---|---|---|
| Hedera testnet (296) | ATS bond `ONS1` | `0x619dc395ec05139cdfaa8089c854568e398463dd` | [HashScan](https://hashscan.io/testnet/token/0.0.10485273) |
| Hedera testnet (296) | `ExitAuction` | `0x74F7E850AC2511b837480983f6ED9308b3842377` | [HashScan](https://hashscan.io/testnet/contract/0x74F7E850AC2511b837480983f6ED9308b3842377) |
| Arc testnet (5042002) | `BidEscrow` | `0x74F7E850AC2511b837480983f6ED9308b3842377` | [ArcScan](https://testnet.arcscan.app/address/0x74F7E850AC2511b837480983f6ED9308b3842377) |

## Running it

_Setup instructions land with lane L0/L7. See `docs/specs/07-envs-addresses-toolchain.md`._

## Repository map

- `PLAN.md` — the plan, lanes, gates and decision log (start here)
- `docs/specs/` — one specification per lane
- `docs/architecture.md`, `docs/decisions.md`, `docs/MAINNET.md`, `docs/evidence/`
- `docs/AI_DISCLOSURE.md` — how AI tools were used
- `packages/contracts` (Foundry), `packages/shared` (TS), `packages/cre-award` (CRE), `apps/web` (Next.js), `scripts/`

## Team

Laín Calvo · Axel Geslin — Argentina.
