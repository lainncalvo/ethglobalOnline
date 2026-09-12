# 10 · Hedera USDC bid rail (additive)

Status: additive sidecar · Does not change specs 01–05, BidEscrow, CRE, or `computeAward`.

## 1. Goal

Let a bidder escrow **Hedera-native USDC** (HTS `0.0.429274`) on Hedera testnet instead of Arc USDC. The Arc + Chainlink path stays the production award path. This rail is a separate escrow with operator award.

## 2. Asset

| Item | Value |
|---|---|
| Network | Hedera testnet, chain 296 |
| Token | USDC HTS `0.0.429274` |
| EVM address | `0x0000000000000000000000000000000000068c9a` (confirm `decimals() == 6`) |
| Amounts | Same 6-decimal USDC units as Arc |

HIP-719: the escrow contract, each bidder, and the seller must `associate()` the token before receiving it. `associate()` on an already-associated account is a no-op / revert to ignore.

Faucet is **not** Circle Arc. Use Hedera testnet USDC.

## 3. Contract `HederaBidEscrow`

Deployed on Hedera testnet. Same state machine as `BidEscrow` **without** `ReceiverTemplate` / `onReport`. Award only via `awardByOperator`.

Functions: `registerAuction`, `placeBid`, `withdraw`, `awardByOperator`, `confirmDelivery`, `cancelAuction`, `voidAward`, `expireAuction`, `associateUsdc`, views `getAuction` / `getBids` / `refundable` / `bidsDigest`.

Constructor `(address usdc, address operator)` calls `associate()` on the HTS token (low-level; ignore failure in tests).

## 4. UI

On `/auction/[ref]` a **payment rail picker**: Arc USDC | Hedera USDC.

- Arc → existing `BidForm` / `WithdrawButton` / Arc `getBids` (unchanged).
- Hedera → associate (if needed) → approve → `placeBid` on `HederaBidEscrow`.

## 5. Operator API (new routes only)

All operator-gated with `Authorization: Bearer $OPERATOR_UI_TOKEN`.

| Method · Path | Behaviour |
|---|---|
| `POST /api/auctions/[ref]/hedera/register` | Public (same trust as `POST /api/auctions`): mirror `ExitAuction` into `HederaBidEscrow.registerAuction` with the operator key. Idempotent if already `Bidding`. |
| `POST /api/auctions/[ref]/hedera/close` | After deadline: snapshot **Hedera bids only**, `computeAward` (unchanged module), `awardByOperator` on Hedera escrow. Then `BidEscrow.cancelAuction` on Arc if Arc is still `Bidding` (so Arc bidders can withdraw). |
| `POST /api/auctions/[ref]/hedera/settle` | Require Hedera escrow `Awarded`. `ExitAuction.settle` then `confirmDelivery` on Hedera escrow. On hold revert: `voidAward` + `ExitAuction.cancel`. |
| `POST /api/auctions/[ref]/hedera/cancel` | `HederaBidEscrow.cancelAuction` while `Bidding` (e.g. after a normal Arc/CRE close). |

Existing `/close` and `/settle` are not modified. CRE snapshot stays Arc-only.

## 6. Trust

CRE cannot write to Hedera. A Hedera-rail award is operator-attested (`AwardSource.Operator`). Arc CRE awards remain DON-attested. Do not run both closes on the same lot: one cash rail wins, the other is cancelled.
