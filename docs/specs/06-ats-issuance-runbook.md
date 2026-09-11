# Spec 06 — ATS issuance runbook (Hedera testnet)

Lane: L1 · Status: todo · Owner: —
Read first: `PLAN.md`

## Goal

Issue the demo bond on Hedera testnet with the **official Asset Tokenization Studio (ATS) web
app**, configure it for our flow (whitelist + internal KYC, single partition, holds enabled,
one coupon), and **prove the hold primitive with `cast` before any contract work starts**.
This lane produces no code. It produces a token address, a set of configured wallets, a list
of transaction links, and screenshots for the video.

Sponsor requirement satisfied (Hedera, Tokenization of Anything): *"Use the Asset Tokenization
Studio (SDK, contracts, web application, or a combination) to issue or manage a tokenised
asset"*, *"deploy and demonstrate on Hedera testnet"*, video showing *"issuance, configuration"*.
Extra points touched: compliance controls in use (KYC grants, whitelist, freeze/pause),
coupon configured.

Gate: **G1 Fri 21:00 ART** — bond exists and the hold sanity test is green. If the hosted app
is not usable by 19:00, run the app locally (Option B). If that is not usable by **23:00**,
switch to Option C (script against the Factory). Do not let this lane slip past 23:00.

## Dependencies

| Input | From |
|---|---|
| Demo wallets created on Hedera testnet (Issuer, Seller, Buyer A, Buyer B, Buyer C, Operator), each with an EVM address and HBAR | L0 |
| Foundry installed (`cast`) | L0 |
| Nothing else. This lane is first on the critical path. | — |

## Prerequisites

1. **ECDSA Hedera testnet account** for the Issuer. Create it at `https://portal.hedera.com`
   (choose ECDSA, not ED25519). It comes funded with test HBAR. Export the raw hex private key.
2. **MetaMask** with the Hedera testnet network:
   - Network name: Hedera Testnet · Chain ID: `296` · RPC: `https://testnet.hashio.io/api` ·
     Currency: HBAR · Explorer: `https://hashscan.io/testnet`
   - Import the Issuer key. Import (or create) Seller, Buyer A, Buyer B, Buyer C, Operator.
3. **Every demo wallet must already exist on Hedera** before it can receive tokens: send
   ~20 HBAR from the Issuer to each address (this auto-creates the account). Confirm each one
   on HashScan (`https://hashscan.io/testnet/account/<evm-address>`).
4. Record all addresses in `packages/shared/src/addresses.json` and `PLAN.md` §9.

## Option A — hosted ATS web app (try first)

- URL: `https://tokenization-studio.hedera.com` (Hedera testnet). Connect with MetaMask on
  chain 296 using the Issuer account. The app rejects non-ECDSA accounts with
  "Selected Account is not a Hedera account".
- The hosted app is wired to the shared testnet Factory `0.0.9213391` and Resolver
  `0.0.9212226` (bond configuration `0x…02`, version 1).

## Option B — run the ATS web app locally (fallback at 19:00)

```bash
git clone https://github.com/hashgraph/asset-tokenization-studio.git
cd asset-tokenization-studio
cp apps/ats/web/.env.example apps/ats/web/.env     # already points at 0.0.9213391 / 0.0.9212226
npm run ats:setup && npm run ats:web:start           # -> http://localhost:4173
```
Requires Node ≥ 20.19.4 and npm ≥ 10.9 (use `fnm install 22` if Node 25 misbehaves). MetaMask
works with no WalletConnect project id. Do not edit the Factory/Resolver values in `.env`.

## Option C — script against the Factory (fallback at 23:00)

- Install `@hashgraph/asset-tokenization-contracts@8.0.0` for the ABIs
  (`./artifacts/*`, `./contracts/*`) and call `Factory.deployBond(...)` at
  `0xd1F118A40f3b02883D35909eF2517e7EDd78379d` with `resolver =
  0xBA2D5FC2083A0b8f164c50e65d782087fBA18E0a`, `resolverProxyConfiguration = {key: 0x…02,
  version: 1}`.
- **The `SecurityData` struct is field-order sensitive and changed in v8.** Build the struct
  from the v8 interface in the npm package, never from a docs page.
- **Never use the addresses on the ATS docs "deployed addresses" page**: they are the stale
  v4 factory (`0.0.7708432`) with a different `deployBond` selector; calls fail silently.
- Coupons are not part of the deploy payload; call `setCoupon` afterwards.

## Bond parameters (demo)

| Field | Value | Why |
|---|---|---|
| Name | `ON Serie I 2027` (replace with the final project name if the team decides) | Argentine ON framing |
| Symbol | `ONS1` | — |
| Decimals | **0** | One token = one bond. Auction `amount` is a whole-bond count; bid amounts are total USDC for the lot in 6-decimal units. No cross-decimal math anywhere. |
| ISIN | `ARONSERIE010` (valid; see below) or `ARREMATE0011` | ATS validates length 12 + check digit |
| Currency | USD | Fixed in the UI |
| Nominal value | `1000.00` (nominalValue 100000, nominalValueDecimals 2) | Face value per bond |
| Starting date | today | — |
| Maturity date | 2027-03-31 (6–12 months out) | Short bond; matches the narrative |
| Max supply | 1000 | — |
| Multi-partition | **OFF** (`isMultiPartition = false`) | ERC-20 style functions and single-partition holds only work in this mode |
| Clearing | **OFF** | `createHoldByPartition` reverts with clearing active; enabling clearing is one-way |
| Protected partitions | **OFF** | `createHoldByPartition` reverts otherwise |
| Controllable | ON | Controller role available for the demo |
| Control list | ON, **whitelist mode** (`isWhiteList = true`) | Only listed wallets can hold |
| Internal KYC | ON | KYC grant enforced at transfer/execution |
| ERC-3643 identity registry / compliance | none (address 0) | Out of scope |
| Bond type | Fixed rate (config `0x…03`) or plain bond (`0x…02`) — pick whichever the app offers with a coupon screen | Coupon is a lifecycle op to show |

### Valid ISIN, briefly

ISIN = 2-letter country code + 9-character NSIN + 1 check digit. To compute the check digit:
convert letters to numbers (A=10 … Z=35), concatenate all digits, then run Luhn from the
rightmost digit (double every second digit starting with the rightmost, subtract 9 from
doubled values above 9, sum, check digit = (10 − sum mod 10) mod 10). Verified examples:
`US037833100` → check `5` → `US0378331005` (a real public ISIN). For the demo:
`ARONSERIE01` → `0` → **`ARONSERIE010`**; `ARREMATE001` → `1` → **`ARREMATE0011`**. Any
online ISIN validator confirms these.

## Roles to keep on the Issuer wallet

The creation form asks which roles to grant. Keep, on the Issuer: **Admin (DEFAULT_ADMIN)**,
**Issuer** (mint), **Control List** (+ Control List Manager if listed separately), **KYC**
(+ KYC Manager / Internal KYC Manager), **SSI Manager** (required to `addIssuer` before
any `grantKyc`), **Corporate Actions** (coupons), **Pauser**, **Freeze Manager**,
**Controller**. Leave Clearing, Locker, Protected Partitions unassigned. Role hashes differ
between ATS versions — assign roles in the app, never by hand-computed hashes.

## Configuration steps in the app

1. **Control list**: add Seller, Buyer A, Buyer B. **Do not add Buyer C** (Buyer C is the
   blocked wallet in the demo). Do not add the Operator (it never holds bonds).
2. **KYC**: register the Issuer address as a KYC issuer (`addIssuer`, needs SSI Manager).
   Then `grantKyc(account, vcId, validFrom, validTo, issuer)` for Seller, Buyer A, Buyer B:
   `vcId` any string (e.g. `vc-seller-1`), `validFrom` = now, `validTo` = now + 1 year,
   `issuer` = Issuer address.
3. **Mint** 100 bonds to Seller.
4. **Coupon**: `setCoupon` with recordDate = now + 3 days, executionDate = recordDate + 1 day,
   startDate = today, endDate = recordDate, fixingDate = recordDate, rate = 900 with
   rateDecimals = 2 (9.00%), rateStatus = SET. Note the coupon id.
5. Optional: open the Freeze and Pause screens once so the video can show they exist.
   Do not actually pause the token.

## Verification with `cast`

```bash
export RPC=https://testnet.hashio.io/api
export BOND=0x...            # EVM address from HashScan (token page → "EVM address")
export P=0x0000000000000000000000000000000000000000000000000000000000000001   # default partition

cast call --rpc-url $RPC $BOND "name()(string)"
cast call --rpc-url $RPC $BOND "symbol()(string)"
cast call --rpc-url $RPC $BOND "decimals()(uint8)"
cast call --rpc-url $RPC $BOND "balanceOf(address)(uint256)" $SELLER            # available balance
cast call --rpc-url $RPC $BOND "getHeldAmountFor(address)(uint256)" $SELLER     # held balance
cast call --rpc-url $RPC $BOND "isInControlList(address)(bool)" $BUYER_A        # true
cast call --rpc-url $RPC $BOND "isInControlList(address)(bool)" $BUYER_C        # false
cast call --rpc-url $RPC $BOND "getKycStatusFor(address)(uint8)" $BUYER_A       # 1 = GRANTED
cast call --rpc-url $RPC $BOND "getKycStatusFor(address)(uint8)" $BUYER_C       # 0 = NOT_GRANTED
cast call --rpc-url $RPC $BOND "isInternalKycActivated()(bool)"                 # true
cast call --rpc-url $RPC $BOND "getControlListType()(bool)"                     # true = whitelist
cast call --rpc-url $RPC $BOND "getMaturityDate()(uint256)"
cast call --rpc-url $RPC $BOND "getCouponCount()(uint256)"                      # 1

# Pre-flight transfer check (EIP-1066 code: 0x51 TO_ACCOUNT_KYC, 0x43 TO_ACCOUNT_BLOCKED)
cast call --rpc-url $RPC $BOND \
  "canTransferByPartition(address,address,bytes32,uint256,bytes,bytes)(bool,bytes1,bytes32)" \
  $SELLER $BUYER_A $P 1 0x 0x        # expect (true, success code, 0x0)
cast call --rpc-url $RPC $BOND \
  "canTransferByPartition(address,address,bytes32,uint256,bytes,bytes)(bool,bytes1,bytes32)" \
  $SELLER $BUYER_C $P 1 0x 0x        # expect (false, 0x51 or 0x43, reason selector)
```

Note: `canTransferByPartition` evaluates `msg.sender` as the caller. From `cast call` with
no `--from`, the sender is the zero address; pass `--from $SELLER` if the result looks off.

## Hold sanity test (must pass before L2 starts)

Uses the Operator EOA as a stand-in escrow. This proves: a hold can be created with an
arbitrary escrow and open destination, only the escrow can execute it, and compliance is
enforced on the destination at execution time.

```bash
export EXPIRY=$(( $(date +%s) + 7*24*3600 ))
export GAS="--gas-limit 3000000"          # Hashio gas estimation is unreliable; add --legacy if EIP-1559 fails

# 1) Seller creates a hold of 1 bond, escrow = Operator EOA, destination open
cast send --rpc-url $RPC $GAS --private-key $SELLER_KEY $BOND \
  "createHoldByPartition(bytes32,(uint256,uint256,address,address,bytes))(bool,uint256)" \
  $P "(1,$EXPIRY,$OPERATOR,0x0000000000000000000000000000000000000000,0x)"
# read holdId from the HeldByPartition(operator, tokenHolder, partition, holdId, hold, operatorData) event:
cast receipt --rpc-url $RPC <txhash> --json | jq '.logs'
# (the ATS SDK polls the mirror node for the id; we read the event instead)

cast call --rpc-url $RPC $BOND "balanceOf(address)(uint256)" $SELLER          # 99
cast call --rpc-url $RPC $BOND "getHeldAmountFor(address)(uint256)" $SELLER   # 1
cast call --rpc-url $RPC $BOND \
  "getHoldForByPartition((bytes32,address,uint256))(uint256,uint256,address,address,bytes,bytes,uint8)" \
  "($P,$SELLER,$HOLD_ID)"

# 2) Non-escrow cannot execute (expect revert IsNotEscrow)
cast send --rpc-url $RPC $GAS --private-key $BUYER_A_KEY $BOND \
  "executeHoldByPartition((bytes32,address,uint256),address,uint256)(bool,bytes32)" \
  "($P,$SELLER,$HOLD_ID)" $BUYER_A 1

# 3) Escrow executes to a compliant buyer (expect success; Buyer A balance = 1)
cast send --rpc-url $RPC $GAS --private-key $OPERATOR_KEY $BOND \
  "executeHoldByPartition((bytes32,address,uint256),address,uint256)(bool,bytes32)" \
  "($P,$SELLER,$HOLD_ID)" $BUYER_A 1
cast call --rpc-url $RPC $BOND "balanceOf(address)(uint256)" $BUYER_A         # 1

# 4) New hold, escrow executes to the NON-compliant Buyer C (expect revert; capture the data)
#    revert selectors: AccountIsBlocked(address) / InvalidKycStatus()
cast send ... createHoldByPartition ...   (as in step 1, new HOLD_ID_2)
cast send --rpc-url $RPC $GAS --private-key $OPERATOR_KEY $BOND \
  "executeHoldByPartition((bytes32,address,uint256),address,uint256)(bool,bytes32)" \
  "($P,$SELLER,$HOLD_ID_2)" $BUYER_C 1
# decode: cast 4byte-decode <revert data>   or   cast sig "AccountIsBlocked(address)"

# 5) Escrow releases the second hold back to the seller; reclaim before expiry must revert
cast send --rpc-url $RPC $GAS --private-key $OPERATOR_KEY $BOND \
  "releaseHoldByPartition((bytes32,address,uint256),uint256)(bool)" "($P,$SELLER,$HOLD_ID_2)" 1
cast send --rpc-url $RPC $GAS --private-key $BUYER_A_KEY $BOND \
  "reclaimHoldByPartition((bytes32,address,uint256))(bool)" "($P,$SELLER,$HOLD_ID_2)"   # expect HoldExpirationNotReached

# 6) Blocked plain transfer (demo beat): Seller -> Buyer C reverts
cast send --rpc-url $RPC $GAS --private-key $SELLER_KEY $BOND "transfer(address,uint256)(bool)" $BUYER_C 1
# record the HashScan link of the reverted tx
```

Hashio notes: pass an explicit `--gas-limit` (3M is plenty; the diamond → resolver →
delegatecall chain is deep), add `--legacy` if EIP-1559 fields are rejected, and expect a
few seconds per receipt. Gas is billed on actual use (HIP-1249).

## Outputs to record

| Item | Where |
|---|---|
| Bond EVM address + Hedera id `0.0.x` (HashScan token page) | `packages/shared/src/addresses.json` → `hedera-testnet.bondToken`; `PLAN.md` §9 |
| Issuer, Seller, Buyer A/B/C, Operator addresses | `addresses.json` (`demoWallets`), `PLAN.md` §9 |
| Coupon id, hold ids used in the test | `docs/evidence/l1-ats.md` |
| Tx links: creation, control list adds, KYC grants, mint, coupon, hold create/execute/revert, blocked transfer | `docs/evidence/l1-ats.md` |
| Screenshots (PNG, 1080p): creation form, control list screen, KYC screen, coupon screen, holders/balances view, HashScan token page | `docs/evidence/screenshots/l1-*.png` |

## Acceptance criteria

- [ ] Bond exists on Hedera testnet; HashScan token page shows name, symbol, and the
      Seller holding 100 (or 99 after the test).
- [ ] `isInControlList` is true for Seller/A/B and false for C; `getKycStatusFor` is 1 for
      Seller/A/B and 0 for C.
- [ ] `canTransferByPartition(Seller → A)` returns true; `(Seller → C)` returns false with
      code `0x51` or `0x43`.
- [ ] Hold created by Seller with the Operator as escrow; execution by a non-escrow reverts;
      execution by the escrow to Buyer A succeeds; execution to Buyer C reverts with an ATS
      compliance selector; release works; reclaim before expiry reverts.
- [ ] Plain `transfer` Seller → Buyer C reverts (HashScan link recorded).
- [ ] One coupon configured (`getCouponCount() == 1`).
- [ ] Addresses and links recorded; screenshots taken.

## Minimum viable / Full

| MV (must, by G1) | Full (after G3) |
|---|---|
| Bond issued, whitelist + KYC for 3 wallets, mint, one coupon set, hold sanity green | Coupon *payment* shown for the new holder (timebox 45 min; ATS scheduling is lazy) |
| Blocked transfer to Buyer C recorded | Freeze demo (`setAddressFrozen` on Buyer B then unfreeze) |
| | A second bond (different maturity) so the market list shows two assets |

## Out of scope

ERC-3643 identity registry / T-REX compliance module; multi-partition tokens; clearing
mode; protected partitions; Scheduled Transactions; Mass Payout app; issuing via our own UI;
verifying the ATS token itself on HashScan (it is a resolver proxy; we verify our own
contract instead).

## Known pitfalls

- ECDSA accounts only; ED25519 accounts cannot sign EVM transactions from MetaMask.
- Accounts must exist on Hedera before receiving tokens; fund each demo wallet first.
- ISIN validation is strict (12 chars, checksum). Use one of the pre-computed values.
- Role hashes changed across ATS versions; `hasRole` from a hand-computed hash may lie.
- Clearing or protected partitions ON makes `createHoldByPartition` revert; clearing is
  one-way. Keep facet options minimal.
- ATS's scheduler is lazy: a coupon "executes" on the next token interaction, not at the
  timestamp. Do not build a demo beat that waits for a timer.
- The ATS SDK polls the mirror node for the hold id and can fail on slow nodes; read the
  `HeldByPartition` event from the receipt.
- Mirror node lags a few seconds behind the JSON-RPC relay; HashScan pages may need a refresh.
- Testnet resets wipe state. If a reset is announced before Sunday, re-run this runbook.
- `balanceOf` is the *available* balance; total = `balanceOf + getHeldAmountFor`.
- `canTransferByPartition` evaluates the caller as `msg.sender`; use `--from` when probing.

## Evidence

| Artifact | Link / path | Captured by | Date |
|---|---|---|---|
| | | | |
