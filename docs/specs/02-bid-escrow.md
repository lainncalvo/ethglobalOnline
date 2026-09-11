# 02 · BidEscrow.sol — USDC bid escrow and award receiver on Arc testnet

Lane: L3 · Status: todo · Owner: —
Read first: `PLAN.md`, then `docs/specs/00-overview.md` (glossary) and `09-threat-model.md` (state machines, holes).

## 1. Goal

A verified Solidity contract on Arc testnet (chain 5042002) that:

1. mirrors each Hedera auction under its `ref`,
2. escrows USDC bids (one running total per bidder, top-ups allowed),
3. moves to **Awarded** only on a Chainlink DON report delivered through the forwarder (or, as a documented fallback, an operator call that is labelled as such in the event),
4. pays the seller when the operator confirms delivery on Hedera,
5. lets losers, and everyone in failure cases, withdraw their USDC without needing the operator,
6. never gets stuck: anyone can expire a stale auction or void a stale award.

## 2. Sponsor requirements satisfied

| Sponsor | Requirement | How this lane meets it |
|---|---|---|
| Arc · Best DeFi/Onchain Finance | "Meaningful use of Arc and USDC"; "conditional payments, onchain automation or multi-step settlement" | Escrow → award → conditional release / refund, all in native-issued USDC on Arc; every step is an observable tx on ArcScan |
| Arc | Contracts verified, working backend/frontend, diagram | Verified on ArcScan (Blockscout); operator + UI in specs 04/05; diagram in `docs/architecture.md` |
| Chainlink · Confidential Workflow | Workflow output must be consumed by the application | `onReport` is the **only** CRE path to `Awarded`; the `Awarded` event records `source = CRE` |

## 3. USDC on Arc — read before writing a line

| Interface | Address | Decimals | Use |
|---|---|---|---|
| Native (gas, `msg.value`) | — | **18** | never used by this contract |
| ERC-20 | `0x3600000000000000000000000000000000000000` | **6** | `approve`, `transferFrom`, `transfer`, `balanceOf` |

Same asset, two views. Rules for this contract:

- **ERC-20 path only.** No `payable` functions, no `receive()`, no `fallback()`, no native sweeps, no `selfdestruct`. A native sweep would move the users' ERC-20 balances too.
- All amounts in this contract are **6-decimal USDC units** (`1_450_000000` = 1,450 USDC).
- `balanceOf` truncates sub-micro amounts; irrelevant for us but do not assert exact equality against native balances in tests.
- Use OpenZeppelin `SafeERC20`.

## 4. Frozen interface

Changes require a commit to this file and a dated line in `PLAN.md` → Decision log. The report ABI (§4.3) is shared with spec 03 and must never drift.

### 4.1 `BidEscrow` (`src/arc/BidEscrow.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";                 // OZ v5.1.0
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReceiverTemplate} from "../cre/ReceiverTemplate.sol"; // copied from smartcontractkit/cre-templates; see §7

contract BidEscrow is ReceiverTemplate, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- types ----------
    enum Status { None, Bidding, Awarded, Settled, Voided, Cancelled, Expired, NoWinner }
    enum AwardSource { None, CRE, Operator }

    struct Auction {
        address seller;             // paid on confirmDelivery
        uint64  deadline;           // bidding closes; awards only at/after this
        uint64  awardedAt;          // set on Awarded
        bytes32 reserveCommitment;  // must match the value in the report
        Status  status;
        address winner;
        uint256 clearingPrice;      // == winner's bid (first-price)
        AwardSource source;
        bytes32 hederaTxHash;       // pointer only, set on confirmDelivery
        uint256 hederaAuctionId;    // for the UI
        uint256 totalEscrowed;      // sum of all bids, for the UI / sanity
    }

    // ---------- constants ----------
    uint64 public constant AWARD_WINDOW  = 24 hours;   // after deadline, anyone may expire an un-awarded auction
    uint64 public constant SETTLE_WINDOW = 24 hours;   // after award, anyone may void an unsettled award
    // invariant: AWARD_WINDOW + SETTLE_WINDOW (48h) < ExitAuction.SETTLE_GRACE (72h)

    // ---------- storage ----------
    IERC20  public immutable usdc;    // 0x3600000000000000000000000000000000000000 on Arc testnet
    address public operator;
    mapping(bytes32 => Auction) internal _auctions;
    mapping(bytes32 => mapping(address => uint256)) public bids;   // running total per bidder
    mapping(bytes32 => address[]) internal _bidders;               // insertion order (first bid only)

    // ---------- events ----------
    event AuctionRegistered(bytes32 indexed ref, address indexed seller, uint64 deadline, bytes32 reserveCommitment, uint256 hederaAuctionId);
    event BidPlaced(bytes32 indexed ref, address indexed bidder, uint256 added, uint256 total);
    event Awarded(bytes32 indexed ref, address indexed winner, uint256 clearingPrice, bytes32 reserveCommitment, AwardSource source, bytes32 bidsDigest);
    event NoWinner(bytes32 indexed ref, uint8 outcome, AwardSource source);
    event DeliveryConfirmed(bytes32 indexed ref, bytes32 hederaTxHash, address seller, uint256 paid);
    event AwardVoided(bytes32 indexed ref, address by, string reason);
    event AuctionCancelled(bytes32 indexed ref);
    event AuctionExpired(bytes32 indexed ref);
    event Withdrawn(bytes32 indexed ref, address indexed bidder, uint256 amount);
    event OperatorChanged(address operator);

    // ---------- errors ----------
    error NotOperator();
    error BadStatus(Status have);
    error BeforeDeadline();
    error AfterDeadline();
    error UnknownRef();
    error CommitmentMismatch();
    error InsufficientBid();
    error NothingToWithdraw();
    error TooEarly();
    error ZeroAmount();
    error ZeroAddress();

    // ---------- constructor ----------
    /// @param _usdc      0x3600000000000000000000000000000000000000
    /// @param _operator  backend key
    /// @param _forwarder Chainlink forwarder on Arc testnet (see §7); changeable via setForwarderAddress
    constructor(address _usdc, address _operator, address _forwarder) ReceiverTemplate(_forwarder) Ownable(msg.sender);

    // ---------- operator ----------
    /// None → Bidding. deadline must be > block.timestamp.
    function registerAuction(bytes32 ref, address seller, uint64 deadline, bytes32 reserveCommitment, uint256 hederaAuctionId) external;
    /// Fallback award path. Same rules as the CRE path; event carries AwardSource.Operator.
    function awardByOperator(bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 bidsDigest) external;
    /// Awarded → Settled. usdc.safeTransfer(seller, clearingPrice). hederaTxHash is stored as a pointer only.
    function confirmDelivery(bytes32 ref, bytes32 hederaTxHash) external nonReentrant;
    /// Bidding → Cancelled (e.g. seller cancelled on Hedera). Everyone can withdraw.
    function cancelAuction(bytes32 ref) external;

    // ---------- bidders ----------
    /// Bidding && block.timestamp < deadline && amount > 0. transferFrom(msg.sender, this, amount).
    /// First bid appends msg.sender to _bidders[ref]; later calls top up bids[ref][msg.sender].
    function placeBid(bytes32 ref, uint256 amount) external nonReentrant;
    /// Pays refundable(ref, msg.sender); zeroes the tracked balance BEFORE transferring.
    function withdraw(bytes32 ref) external nonReentrant;

    // ---------- anyone ----------
    /// Awarded → Voided. Operator: any time while Awarded. Anyone: block.timestamp > awardedAt + SETTLE_WINDOW.
    function voidAward(bytes32 ref, string calldata reason) external;
    /// Bidding → Expired when block.timestamp > deadline + AWARD_WINDOW. Everyone can withdraw.
    function expireAuction(bytes32 ref) external;

    // ---------- CRE ----------
    /// Called by ReceiverTemplate.onReport after the forwarder check.
    /// report = abi.encode(bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 bidsDigest)
    function _processReport(bytes calldata report) internal override; // → _award(..., AwardSource.CRE)

    // ---------- views ----------
    function refundable(bytes32 ref, address who) public view returns (uint256);
    function getAuction(bytes32 ref) external view returns (Auction memory);
    function getBids(bytes32 ref) external view returns (address[] memory bidders, uint256[] memory amounts);
    /// keccak256(abi.encodePacked(bidder_0, amount_0, bidder_1, amount_1, ...)) in insertion order
    function bidsDigest(bytes32 ref) public view returns (bytes32);

    // ---------- admin ----------
    function setOperator(address _operator) external;                      // onlyOwner
    function setForwarderAddress(address _forwarder) external override;    // onlyOwner (ReceiverTemplate's setter re-gated to owner)
}
```

### 4.2 `_award` (internal, shared by both paths)

```
_award(ref, winner, clearingPrice, reserveCommitment, outcome, bidsDigest, source):
  a = _auctions[ref]
  require a.status != None                    else UnknownRef()
  require a.status == Bidding                 else BadStatus(a.status)      // replay + ordering protection
  require block.timestamp >= a.deadline       else BeforeDeadline()
  require reserveCommitment == a.reserveCommitment else CommitmentMismatch()
  if outcome != 1:
      a.status = NoWinner; a.source = source
      emit NoWinner(ref, outcome, source); return
  require winner != 0                         else ZeroAddress()
  require clearingPrice > 0 && bids[ref][winner] >= clearingPrice   else InsufficientBid()
  // Full version only: require bidsDigest == bidsDigest(ref) else BidsDigestMismatch()
  a.status = Awarded; a.winner = winner; a.clearingPrice = clearingPrice; a.source = source; a.awardedAt = uint64(block.timestamp)
  emit Awarded(ref, winner, clearingPrice, reserveCommitment, source, bidsDigest)
```

MV **emits** `bidsDigest` from the report without checking it (so the operator/TEE can be audited off-chain). Full **verifies** it on-chain and adds error `BidsDigestMismatch()`.

### 4.3 Report payload (shared with spec 03 — do not change)

```
abi.encode(
  bytes32 ref,               // keccak256(abi.encode(uint256(296), exitAuction, auctionId))
  address winner,            // 0x0 when outcome != 1
  uint256 clearingPrice,     // USDC 6 dec; 0 when outcome != 1
  bytes32 reserveCommitment, // recomputed inside the TEE from the sealed reserve + salt
  uint8   outcome,           // 1 AWARDED · 2 NO_COMPLIANT_BID · 3 ALL_BELOW_RESERVE · 4 NO_BIDS
  bytes32 bidsDigest         // keccak256(abi.encodePacked(bidder_i, amount_i)...) over the snapshot
)
```

192 bytes, six static words. Solidity side: `abi.decode(report, (bytes32, address, uint256, bytes32, uint8, bytes32))`.

### 4.4 `refundable(ref, who)`

| Auction status | `who` is winner | Refundable |
|---|---|---|
| Bidding | — | 0 (bids are commitments) |
| Awarded | no | full `bids[ref][who]` |
| Awarded | yes | 0 (funds reserved for the seller until Settled or Voided) |
| Settled | no | full |
| Settled | yes | `bids[ref][who] − clearingPrice` |
| Voided, Cancelled, Expired, NoWinner | — | full |
| None | — | 0 |

`withdraw` sets `bids[ref][who] = 0` **before** `usdc.safeTransfer` and reverts `NothingToWithdraw()` on zero. Note: after a winner withdraws their excess in Settled, `bids[ref][winner]` becomes 0, which is fine because `refundable` for a Settled winner reads `bids − clearingPrice` only once; implement by tracking a `withdrawn` flag or by storing the excess explicitly (implementer's choice; test 12 pins the behaviour).

## 5. State machine

`None → Bidding → { Awarded → { Settled | Voided } } | Cancelled | Expired | NoWinner`

| From | To | Who | Precondition | Effect | Event |
|---|---|---|---|---|---|
| None | Bidding | operator | `deadline > now`, `seller != 0`, ref unused | store auction | `AuctionRegistered` |
| Bidding | Bidding | bidder | `now < deadline`, `amount > 0` | `transferFrom`; total += amount | `BidPlaced` |
| Bidding | Awarded | forwarder (CRE) or operator | `now >= deadline`; commitment matches; `bids[winner] >= clearingPrice > 0` | winner, price, source, awardedAt | `Awarded` |
| Bidding | NoWinner | forwarder or operator | `now >= deadline`; commitment matches; `outcome != 1` | everyone refundable | `NoWinner` |
| Bidding | Cancelled | operator | — | everyone refundable | `AuctionCancelled` |
| Bidding | Expired | anyone | `now > deadline + AWARD_WINDOW` | everyone refundable | `AuctionExpired` |
| Awarded | Settled | operator | — | `usdc.safeTransfer(seller, clearingPrice)`; store hederaTxHash | `DeliveryConfirmed` |
| Awarded | Voided | operator | — | everyone refundable | `AwardVoided` |
| Awarded | Voided | anyone | `now > awardedAt + SETTLE_WINDOW` | everyone refundable | `AwardVoided` |
| Settled, Voided, Cancelled, Expired, NoWinner | — | — | terminal | `withdraw` only | `Withdrawn` |

No transition ever moves USDC to anyone except the registered `seller` (on Settled) and the bidders themselves (on withdraw).

## 6. Access summary

| Function | Who |
|---|---|
| `registerAuction`, `awardByOperator`, `confirmDelivery`, `cancelAuction` | operator |
| `voidAward` | operator (any time while Awarded) / anyone (after `awardedAt + SETTLE_WINDOW`) |
| `expireAuction` | anyone (after `deadline + AWARD_WINDOW`) |
| `placeBid`, `withdraw` | any EOA/contract with USDC allowance |
| `onReport` | forwarder address only (ReceiverTemplate) |
| `setOperator`, `setForwarderAddress` | owner |

## 7. The forwarder and `ReceiverTemplate`

- Copy `ReceiverTemplate.sol` (and `IReceiver`) from `smartcontractkit/cre-templates` into `src/cre/`. It exposes `onReport(bytes metadata, bytes report)` gated to `forwarderAddress`, and calls the abstract `_processReport(bytes)`. Keep its `setForwarderAddress` but override the access check to `onlyOwner`. Do **not** enable `setExpectedWorkflowId`/author checks in MV (they are production hardening; see spec 09).
- Two Arc-testnet forwarder addresses are documented by Chainlink, and the two sources consulted disagree on which is **simulation** (MockKeystoneForwarder) and which is **production** (KeystoneForwarder):
  - `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`
  - `0x76c9cf548b4179F8901cda1f8623568b58215E62`
- Procedure: deploy with **one of them** (put it in `CRE_FORWARDER_ADDRESS`). After L4's first `cre workflow simulate --broadcast`, if `onReport` reverts with the ReceiverTemplate's unauthorized-sender error, open the failed tx on ArcScan, read its `from`, and call `setForwarderAddress(thatAddress)` as owner. Record the final value in `addresses.json` and in `PLAN.md` → Decision log. Do not spend more than 15 minutes theorising; the tx tells you.
- In simulation the mock forwarder does not verify DON signatures — anyone who knows its address could theoretically relay a fake report. This is stated in spec 09; contract-level checks (status, deadline, commitment, bid ≥ price) still hold.

## 8. Tests (Foundry, `test/BidEscrow.t.sol`, with `test/mocks/MockUSDC.sol` 6-dec and a `forwarder` test address)

| # | Test | Expect |
|---|---|---|
| 1 | register | status Bidding, `AuctionRegistered` |
| 2 | register twice / unknown ref on other calls | `BadStatus` / `UnknownRef` |
| 3 | placeBid (approve + bid) | USDC moved, `bids` = amount, bidder appended once |
| 4 | top-up | `bids` summed, `_bidders` not duplicated |
| 5 | bid after deadline | `AfterDeadline` |
| 6 | bid zero | `ZeroAmount` |
| 7 | awardByOperator happy | Awarded, `source = Operator`, `awardedAt` set |
| 8 | award before deadline | `BeforeDeadline` |
| 9 | award with wrong commitment | `CommitmentMismatch` |
| 10 | award with `clearingPrice > bids[winner]` | `InsufficientBid` |
| 11 | award replay (second award after Awarded) | `BadStatus(Awarded)` |
| 12 | confirmDelivery pays seller exactly `clearingPrice`; winner excess withdrawable once | balances exact; second withdraw `NothingToWithdraw` |
| 13 | loser withdraw after Awarded | full refund |
| 14 | withdraw during Bidding | `NothingToWithdraw` |
| 15 | void by operator while Awarded, then everyone withdraws | all balances restored |
| 16 | void by stranger before `SETTLE_WINDOW` | `TooEarly`; after window → Voided |
| 17 | expire by stranger before `AWARD_WINDOW` | `TooEarly`; after → Expired; withdraw works |
| 18 | cancelAuction by operator during Bidding | Cancelled; withdraw works |
| 19 | onReport from non-forwarder | ReceiverTemplate unauthorized revert |
| 20 | onReport from forwarder with outcome 1 | Awarded, `source = CRE` |
| 21 | onReport with outcome 2/3/4 | NoWinner, everyone withdraws |
| 22 | confirmDelivery when not Awarded | `BadStatus` |
| 23 | `bidsDigest` matches an off-chain recomputation for 3 bidders | equality |
| 24 | (Full) award with wrong bidsDigest | `BidsDigestMismatch` |
| 25 | reentrancy: malicious USDC mock re-entering withdraw | blocked / no double pay |

## 9. Toolchain, deploy, verify

- Foundry, `solc = "0.8.26"`, `evm_version = "paris"` (Arc is Osaka-compatible; paris is the safe common denominator with Hedera). OpenZeppelin v5.1.0.
- `foundry.toml` `[rpc_endpoints] arc = "${ARC_RPC_URL}"` with `ARC_RPC_URL=https://rpc.testnet.arc.io`.
- Deploy (`script/DeployArc.s.sol` reads `ARC_USDC_ADDRESS`, `OPERATOR_ADDRESS`, `CRE_FORWARDER_ADDRESS`):

```bash
forge script script/DeployArc.s.sol --rpc-url arc --broadcast \
  --priority-gas-price 1gwei --with-gas-price 30gwei
```

- Verify on ArcScan (Blockscout):

```bash
forge verify-contract --chain-id 5042002 \
  --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ \
  <BID_ESCROW_ADDRESS> src/arc/BidEscrow.sol:BidEscrow \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" $ARC_USDC_ADDRESS $OPERATOR_ADDRESS $CRE_FORWARDER_ADDRESS)
```

Manual fallback: `https://testnet.arcscan.app/contract-verification`.

- Explorer link formats: `https://testnet.arcscan.app/address/<addr>`, `https://testnet.arcscan.app/tx/<hash>`.
- Funding: `https://faucet.circle.com` → "Arc Testnet" for deployer, operator, Buyer A, Buyer B, CRE signer. USDC is both gas and the bid asset.

## 10. Acceptance criteria (demo-observable)

- [ ] `BidEscrow` shows **Verified** on ArcScan.
- [ ] `registerAuction` for the demo `ref`; `AuctionRegistered` on ArcScan.
- [ ] Buyer A `placeBid(ref, 1_450_000000)` and Buyer B `placeBid(ref, 1_520_000000)`; two `BidPlaced` events; contract USDC balance = 2,970 USDC.
- [ ] After the deadline, an award lands: `Awarded(ref, BuyerB, 1_520_000000, …, source = CRE)` from `onReport` (gate G3) or `source = Operator` (fallback), visible on ArcScan.
- [ ] `confirmDelivery(ref, hederaTxHash)` → seller's USDC balance +1,520; `DeliveryConfirmed`.
- [ ] Buyer A `withdraw(ref)` → +1,450; `Withdrawn`.
- [ ] Negative demo path recorded once: `voidAward` → both buyers withdraw.
- [ ] `forge test` passes (§8, tests 1–23 for MV).

## 11. Minimum viable / Full

| MV (must) | Full (after gate G3) |
|---|---|
| §4 interface without on-chain `bidsDigest` check | on-chain `bidsDigest` verification + `BidsDigestMismatch` |
| Tests 1–23 | Tests 24–25, fuzz on amounts, invariant "sum of bids ≥ contract balance" |
| Deploy + verify | Gas report in `docs/evidence/` |
| `getBids` returns arrays | pagination guard on `getBids` for > 200 bidders |

## 12. Out of scope

Reading Hedera state (the backend does that). Verifying `hederaTxHash` (pointer only). Second-price clearing. Bid withdrawal during Bidding. Fees. Upgradability. Native USDC handling. Any interaction with Circle App Kit / Gateway / CCTP.

## 13. Known pitfalls

- **20 gwei minimum base fee on Arc testnet.** Transactions below it hang forever with no error. Every script and the frontend set `maxFeePerGas ≥ 30 gwei`, `maxPriorityFeePerGas = 1 gwei`.
- **6 vs 18 decimals.** `msg.value` is 18-dec native; the ERC-20 at `0x3600…` is 6-dec. This contract only uses the ERC-20. Never mix.
- **Value transfer to `address(0)` reverts on Arc** ("Zero address not allowed"). `_award` already rejects a zero winner for outcome 1; `withdraw` never targets zero.
- **Blocklisted addresses** revert on transfer and still consume gas (Arc runtime rule). Not expected on testnet; mention in the threat model.
- **USDC `balanceOf` truncation.** Sub-micro native dust reads as 0; tests should assert deltas on the ERC-20 view only.
- **Testnet instability.** Circle warns of downtime; record ArcScan footage of the full path as soon as it works.
- **Forwarder ambiguity** (§7). Deploy, broadcast once, read `from`, set. Do not guess twice.
- **ReceiverTemplate's own `setForwarderAddress`** may be gated to the template's owner variable; re-gate it to OZ `Ownable` to avoid two owners.
- **Approvals.** Buyers must `approve(BidEscrow, amount)` before `placeBid`; the frontend sequences the two txs.

## 14. Evidence (fill during the build)

| Item | Value / link |
|---|---|
| Deployed address (5042002) | |
| ArcScan verified link | |
| Forwarder address in use (after §7 procedure) | |
| `registerAuction` tx | |
| `placeBid` txs (A, B) | |
| `Awarded` tx (source, from) | |
| `confirmDelivery` tx | |
| `withdraw` tx (Buyer A) | |
| `voidAward` + withdraw txs (negative path) | |
| `forge test` summary | |
