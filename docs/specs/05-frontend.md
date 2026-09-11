# Spec 05 — Frontend

Lane: L6 · Status: todo · Owner: —
Read first: `PLAN.md`, then `docs/specs/04-backend-api.md` (every read goes through it or through viem with the ABIs in `packages/shared`).

## 1. Goal

A four-route Next.js app that lets the demo wallets list a bond for exit auction on Hedera, bid USDC on Arc, see eligibility before bidding, watch the settlement timeline across both chains, and drive operator actions. It is the "working frontend" the Arc track requires and the surface most of the video is recorded on, so it must read cleanly at 1280×720.

## 2. Sponsor requirement this lane satisfies

| Track | Requirement | How |
|---|---|---|
| Arc | working frontend; meaningful use of USDC | `/auction/[ref]` approve + bid + withdraw in USDC on Arc |
| Hedera | compliance controls in use; secondary market | `/sell` creates the ATS hold; eligibility badge reads the token's own control list and KYC |
| ETHGlobal | video ≥ 720p | layout tested at 1280×720 |

## 3. Stack

| Item | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript, Tailwind |
| Wallet | wagmi 2 + viem 2, **injected connector only** (MetaMask). No RainbowKit, no WalletConnect |
| Chains | `hederaTestnet { id: 296, name: "Hedera Testnet", nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 }, rpcUrls: NEXT_PUBLIC_HEDERA_RPC_URL, blockExplorers: https://hashscan.io/testnet }` · `arcTestnet { id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: NEXT_PUBLIC_ARC_RPC_URL, blockExplorers: https://testnet.arcscan.app }` (both exported from `packages/shared/src/chains.ts`) |
| Arc writes | always pass `maxFeePerGas: 30 gwei`, `maxPriorityFeePerGas: 1 gwei` |
| Network switching | every write button first calls `switchChain` to the required chain and shows a banner while on the wrong one |
| Data | server data via `GET /api/*`; on-chain reads via `useReadContract` with the minimal ABIs; no ATS SDK in the browser |

## 4. Routes

| Route | Chain | Reads | Writes |
|---|---|---|---|
| `/` | — | `GET /api/auctions` | — |
| `/sell` | Hedera | `bond.balanceOf(seller)`, `bond.getHeldAmountFor(seller)`, `bond.decimals()` | see sequence below |
| `/auction/[ref]` | Arc (writes), Hedera (reads) | `GET /api/auctions/[ref]`, `GET /api/compliance/status?address=`, `BidEscrow.getBids`, `BidEscrow.refundable(ref, me)`, `USDC.allowance(me, BidEscrow)`, `USDC.balanceOf(me)` | `USDC.approve(BidEscrow, amt)`, `BidEscrow.placeBid(ref, amt)`, `BidEscrow.withdraw(ref)` |
| `/operator` | via API | `GET /api/health`, `GET /api/auctions` | `POST /api/auctions`, `/close`, `/settle-preview`, `/settle`, `/void`, `/cancel` |

### `/` — market list
Table or cards: bond name + symbol, amount (token decimals), deadline countdown, Hedera status, Arc status, top bid (USDC), bid count, links (HashScan auction contract, ArcScan escrow). Sorted by deadline. Empty state: "No exit auctions yet — list one at /sell".

### `/sell` — list a bond for exit auction (Hedera)
Form: token address (default `NEXT_PUBLIC_BOND_TOKEN_ADDRESS`, editable), amount (demo default **10** bonds), deadline (datetime-local, min now + 2 min), reserve price in USDC (demo default **14,000**), salt (auto-generated 32 bytes, shown once with a copy button and the warning "if you lose this salt the auction cannot be awarded; the app stores it server-side for the demo").

Transaction sequence with a stepper UI (each step shows pending / hash / done):
1. `bond.createHoldByPartition(0x…01, { amount, expirationTimestamp: deadline + 72h + 1h, escrow: NEXT_PUBLIC_EXIT_AUCTION_ADDRESS, to: 0x0000000000000000000000000000000000000000, data: "0x" })` → wait for the receipt → parse the `HeldByPartition` event from the receipt logs → `holdId`.
2. `commitment = keccak256(encodeAbiParameters([uint256, bytes32], [reserve6, salt]))`; `ExitAuction.createAuction(token, 0x…01, holdId, amount, deadline, commitment)` → parse `AuctionCreated` for `id` and `ref`.
3. `POST /api/auctions { hederaAuctionId }` → registered on Arc. This endpoint is public: the backend validates the auction against Hedera state and registers it with the operator key, idempotently (see `04-backend-api.md`). No token needed from the seller.
4. `POST /api/auctions/[ref]/reserve { reserve, salt }`.
Done state: links to HashScan (hold tx, auction tx) and ArcScan (`AuctionRegistered`), "Go to auction" button.

### `/auction/[ref]` — auction detail and bidding (Arc)
- Bond facts card: name, symbol, nominal value + currency (`getNominalValue`, `getNominalValueDecimals`, `getNominalValueCurrency`), maturity date, next coupon (`getCouponCount` → `getCoupon(last)`: rate, record/execution dates), token HashScan link.
- Status timeline: Listed (Hedera) → Bidding (Arc) → Awarded (Arc, shows source CRE/Operator) → Delivered (Hedera `HoldByPartitionExecuted`) → Paid (Arc `DeliveryConfirmed`); each node links to its explorer tx when known (from `/api/auctions/[ref].timeline`). Terminal branches: Voided / Cancelled / Expired / NoWinner shown in red.
- Bids table from `getBids`: bidder (short), amount USDC, "you" marker.
- Eligibility badge for the connected wallet from `GET /api/compliance/status`: green "Eligible to receive this bond" or red "Not eligible — 0x51 KYC not granted" / "0x43 not whitelisted"; when red, the bid form is disabled with the reason.
- Bid form: amount in USDC; shows current allowance; button 1 "Approve USDC" (skipped when allowance ≥ amount), button 2 "Place bid"; both on Arc with the fee settings above. After `BidPlaced`, refresh bids.
- Withdraw button visible when `refundable(ref, me) > 0`; calls `withdraw(ref)`.
- Winner banner after Awarded; "Delivered" banner with the HashScan link after settlement.

### `/operator` — operator console
- Token gate: input for `OPERATOR_UI_TOKEN`, kept in `sessionStorage`, sent as `Authorization: Bearer`.
- Health panel from `/api/health` (both chains, operator balances, award mode).
- Per-auction row with buttons: Register (if Arc status None), Close, Settle-preview (address field; used to show the Buyer C code on screen), Settle, Void (reason field), Cancel.
- Log pane: appends each API response as JSON with explorer links auto-detected from `*TxHash` fields.

## 5. Minimal ABIs to bundle (`packages/shared/src/abi`)

| Contract | Functions / events |
|---|---|
| ATS bond (diamond) | `name`, `symbol`, `decimals`, `balanceOf`, `getHeldAmountFor`, `getNominalValue`, `getNominalValueDecimals`, `getNominalValueCurrency`, `getMaturityDate`, `getCouponCount`, `getCoupon`, `isInControlList`, `getKycStatusFor`, `canTransferByPartition`, `createHoldByPartition`, event `HeldByPartition(address indexed operator, address indexed tokenHolder, bytes32 partition, uint256 holdId, (uint256,uint256,address,address,bytes) hold, bytes operatorData)` |
| ExitAuction | full ABI from `packages/contracts/out` |
| BidEscrow | full ABI from `packages/contracts/out` |
| ERC20 (USDC) | `approve`, `allowance`, `balanceOf`, `decimals` |

Source the ATS fragments from `@hashgraph/asset-tokenization-contracts@8.0.0` (`artifacts/`), not hand-typed.

## 6. Display rules

| Value | Rule |
|---|---|
| USDC | 6 decimals; format with thousands separators and 2 fraction digits |
| Bond amount | token `decimals()`; show symbol |
| Seller balance on `/sell` | total = `balanceOf + getHeldAmountFor`; show "available / held" |
| Deadline | countdown in local time, tooltip with UTC ISO |
| Addresses | `0x1234…abcd` with copy; explorer link on click |
| Reserve, salt | shown only on `/sell` at creation time; never fetched back |

## 7. Components

`WalletButton`, `NetworkGuard(chainId)`, `TxStepper(steps)`, `AuctionCard`, `BondFacts`, `Timeline`, `BidsTable`, `EligibilityBadge`, `BidForm`, `WithdrawButton`, `OperatorGate`, `HealthPanel`, `OperatorRow`, `LogPane`, `ExplorerLink(chain, hash|address)`, `Amount(value, decimals, symbol)`, `Countdown(deadline)`.

## 8. States and errors

| Situation | UI |
|---|---|
| Wallet not connected | Connect button in header; forms disabled |
| Wrong network | Yellow banner "Switch to Hedera Testnet / Arc Testnet" with a switch button; write buttons disabled |
| Tx pending | Spinner on the step; hash link as soon as it exists |
| Tx reverted | Red box with decoded error: custom errors of our contracts by name; ATS selectors mapped (`AccountIsBlocked`, `InvalidKycStatus`, `AddressNotVerified`, `ComplianceNotAllowed`, `IsPaused`); raw data behind a "details" toggle |
| API error | Toast with `error.message` |
| Empty lists | One-line hints, never a blank area |

## 9. Video considerations

Base font 16 px, headings 24–32 px, monospace hashes at 14 px; high-contrast light theme; no sensitive values on screen (reserve and salt only appear on `/sell` — do not record that step's final screen, or blur); explorer links open in a new tab; a "demo mode" toggle that hides the wallet address bar noise is optional.

## 10. Steps

1. L0 already created `apps/web` with Next.js 15, Tailwind, wagmi and viem. This lane wires chains, the injected connector, and the header with `WalletButton` + `NetworkGuard`. Do not re-run `create-next-app`.
2. `/` from `GET /api/auctions` (mock JSON until L5 is up).
3. `/auction/[ref]`: facts, bids, badge, bid form, withdraw.
4. `/sell`: stepper with the four steps; test against the L1 bond and the L2 contract.
5. `/operator`: gate, health, rows, log pane.
6. Decoded-error helper shared with the backend (`packages/shared/src/errors.ts`).
7. 720p pass: record a 30-second scroll-through and check readability.

## 11. Acceptance criteria

- Demo beats 3–7 (list on `/sell`, two bids, Buyer C badge, award visible, settle + withdraw) are executable from the UI with the demo wallets.
- Buyer C sees the red badge with the code and cannot submit a bid.
- All txs show explorer links; the timeline reaches "Paid" after `confirmDelivery`.
- Every page is legible in a 1280×720 recording without zooming.

## 12. Minimum viable / Full

| MV | Full |
|---|---|
| Four routes, polling every 5 s | Timeline persisted from backend events; live updates |
| Inline status text | Toasts, skeleton loaders |
| Bids table | Bid history chart, USDC balance sparkline |

## 13. Out of scope

RainbowKit / WalletConnect, mobile layout, i18n, issuer/admin screens (issuance happens in the ATS web app), dark mode, analytics.

## 14. Known pitfalls

| Pitfall | Mitigation |
|---|---|
| ATS SDK is not browser-safe (`fs`, `winston`, extensionless ESM) | Never import it; use viem + minimal ABIs |
| MetaMask account on Hedera must be an ECDSA account with an alias | Demo wallets are created per spec 07; if a tx fails with an account error, fund the address with HBAR first |
| Hashio `eth_getLogs` can be slow or incomplete | Take `holdId` and `auctionId` from the write's own receipt logs, never from a later log query |
| Arc fee floor 20 gwei | Hard-coded 30 gwei on every Arc write |
| USDC `approve` before `placeBid` | Two-step button; check allowance first |
| `/sell` step 3 fails because Arc registration errors (operator key unfunded, fee floor) | The auction still exists on Hedera; show the error with a "Retry registration" button that calls `POST /api/auctions` again (idempotent). `/operator` also exposes the same call |
| ATS `balanceOf` excludes held tokens | Always show available + held |

## 15. Evidence

| Artifact | Path | Captured by | Date |
|---|---|---|---|
| Screenshots of the four routes at 1280×720 | `docs/evidence/ui-*.png` | | |
| Screen recording of beats 3–7 | `docs/evidence/ui-flow.mp4` (not committed; link) | | |
