# 01 · ExitAuction.sol — auction registry and hold executor on Hedera testnet

Lane: L2 · Status: todo · Owner: —
Read first: `PLAN.md`, then `docs/specs/00-overview.md` (glossary) and `09-threat-model.md` (state machines).

## 1. Goal

A small, verified Solidity contract on Hedera testnet (chain 296) that:

1. lets a bondholder list an ATS **hold** as an exit auction,
2. lets the operator **settle** the auction by executing that hold to the winner, so that the ATS token performs the compliance check at the instant of transfer,
3. lets the seller or operator **cancel**, releasing the hold,
4. exposes a read-only **preflight** so the UI and the compliance screen can tell whether a wallet could receive the bond.

The contract never holds bonds. It is only the `escrow` address of the seller's hold.

## 2. Sponsor requirement satisfied

| Sponsor | Requirement | How this lane meets it |
|---|---|---|
| Hedera · Tokenization of Anything | Deploy and demonstrate on Hedera testnet; contracts verified on HashScan | `ExitAuction` deployed on 296 and verified through Sourcify (`server-verify.hashscan.io`) |
| Hedera | Video shows at least one lifecycle operation such as a transfer or compliance check | `settle` = a transfer executed through `executeHoldByPartition` with ATS compliance applied; a forced `settle(id, BuyerC)` reverts with the ATS selector visible on HashScan |
| Hedera · extra points | Secondary market for ATS assets; compliance controls in use | This contract is the Hedera half of the market; `previewSettle` surfaces control-list / KYC status |

## 3. Frozen interface

Changes to anything in this section require a commit to this file and a dated line in `PLAN.md` → Decision log.

### 3.1 Minimal ATS interface (`src/interfaces/IATSBond.sol`)

Exact signatures from ATS v8.0.0 (`facets/holdByPartition/IHoldByPartition.sol`, `facets/hold/IHoldTypes.sol`, `facets/complianceByPartition/IComplianceByPartition.sol`). The bond is a diamond: one address exposes all of these.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IATSBond {
    struct HoldIdentifier {
        bytes32 partition;
        address tokenHolder;
        uint256 holdId;
    }

    /// Only callable by the hold's `escrow`. Runs the full ATS compliance check on `to`
    /// (control list, internal KYC, identity registry, pause, recovered wallet).
    function executeHoldByPartition(
        HoldIdentifier calldata _holdIdentifier,
        address _to,
        uint256 _amount
    ) external returns (bool success_, bytes32 partition_);

    /// Only callable by the hold's `escrow`, before expiry. Tokens return to the holder.
    function releaseHoldByPartition(
        HoldIdentifier calldata _holdIdentifier,
        uint256 _amount
    ) external returns (bool success_);

    function getHoldForByPartition(
        HoldIdentifier calldata _holdIdentifier
    )
        external
        view
        returns (
            uint256 amount_,
            uint256 expirationTimestamp_,
            address escrow_,
            address destination_,
            bytes memory data_,
            bytes memory operatorData_,
            uint8 thirdPartyType_
        );

    /// ERC-1594 style preflight. Returns (ok, EIP-1066 status byte, reason selector).
    function canTransferByPartition(
        address _from,
        address _to,
        bytes32 _partition,
        uint256 _value,
        bytes calldata _data,
        bytes calldata _operatorData
    ) external view returns (bool, bytes1, bytes32);
}
```

Related ATS event the frontend parses after the seller creates the hold (not called by this contract):

```solidity
event HeldByPartition(
    address indexed operator,
    address indexed tokenHolder,
    bytes32 partition,
    uint256 holdId,
    Hold hold,            // struct Hold { uint256 amount; uint256 expirationTimestamp; address escrow; address to; bytes data; }
    bytes operatorData
);
```

### 3.2 `ExitAuction` (`src/hedera/ExitAuction.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol"; // OZ v5.1.0
import {IATSBond} from "../interfaces/IATSBond.sol";

contract ExitAuction is Ownable {
    // ---------- types ----------
    enum Status { None, Open, Settled, Cancelled }

    struct Auction {
        address token;             // ATS bond (diamond address)
        address seller;            // hold.tokenHolder
        bytes32 partition;         // DEFAULT_PARTITION for single-partition bonds
        uint256 holdId;            // from HeldByPartition event
        uint256 amount;            // == hold.amount, in bond units (token decimals)
        uint64  deadline;          // bidding closes (unix seconds)
        uint64  createdAt;
        bytes32 reserveCommitment; // keccak256(abi.encode(uint256 reserveUsdc6, bytes32 salt))
        Status  status;
        address winner;            // set on settle
        bytes32 ref;               // computeRef(id), cached
    }

    // ---------- constants ----------
    uint64  public constant SETTLE_GRACE      = 72 hours;   // hold must outlive deadline by at least this
    uint64  public constant MIN_DURATION      = 2 minutes;  // demo-friendly minimum auction length
    bytes32 public constant DEFAULT_PARTITION = bytes32(uint256(1));

    // ---------- storage ----------
    address public operator;
    uint256 public auctionCount;                       // ids are 1..auctionCount
    mapping(uint256 => Auction) internal _auctions;
    mapping(bytes32 => uint256) public idByRef;
    mapping(address => mapping(address => mapping(uint256 => bool))) public listedHold; // token => seller => holdId

    // ---------- events ----------
    event AuctionCreated(
        uint256 indexed id, bytes32 indexed ref, address indexed seller, address token,
        bytes32 partition, uint256 holdId, uint256 amount, uint64 deadline, bytes32 reserveCommitment
    );
    event AuctionSettled(uint256 indexed id, bytes32 indexed ref, address indexed winner, uint256 amount);
    event AuctionCancelled(uint256 indexed id, bytes32 indexed ref, address by, bool holdReleased);
    event OperatorChanged(address operator);

    // ---------- errors ----------
    error NotOperator();
    error NotSeller();
    error BadStatus(Status have);
    error DeadlineTooSoon();
    error HoldNotForThisEscrow();
    error HoldHasFixedDestination();
    error HoldAmountMismatch();
    error HoldExpiresTooEarly(uint256 expiration, uint256 needed);
    error AlreadyListed();
    error BeforeDeadline();
    error AfterDeadline();
    error ZeroAddress();

    // ---------- constructor ----------
    /// @param _operator backend key allowed to settle and cancel
    constructor(address _operator) Ownable(msg.sender);

    // ---------- seller ----------
    /// Registers an existing hold as an auction. Caller must be the hold's tokenHolder.
    /// Reverts unless: token != 0; hold.escrow == address(this); hold.destination == address(0);
    /// hold.amount == amount; hold.expirationTimestamp >= deadline + SETTLE_GRACE;
    /// deadline >= block.timestamp + MIN_DURATION; !listedHold[token][msg.sender][holdId].
    function createAuction(
        address token,
        bytes32 partition,
        uint256 holdId,
        uint256 amount,
        uint64  deadline,
        bytes32 reserveCommitment
    ) external returns (uint256 id, bytes32 ref);

    /// Seller: only while Open and before deadline. Operator: any time while Open.
    /// Attempts releaseHoldByPartition inside try/catch; marks Cancelled regardless.
    function cancel(uint256 id) external;

    // ---------- operator ----------
    /// Open && block.timestamp >= deadline. Calls executeHoldByPartition({partition, seller, holdId}, winner, amount).
    /// ATS reverts bubble up unchanged (AccountIsBlocked, InvalidKycStatus, AddressNotVerified, ComplianceNotAllowed, IsPaused).
    function settle(uint256 id, address winner) external;

    // ---------- views ----------
    /// canTransferByPartition(seller, to, partition, amount, "", "")
    function previewSettle(uint256 id, address to) external view returns (bool ok, bytes1 code, bytes32 reason);
    function computeRef(uint256 id) public view returns (bytes32);   // keccak256(abi.encode(uint256(block.chainid), address(this), id))
    function getAuction(uint256 id) external view returns (Auction memory);
    function getAuctions(uint256 from, uint256 to) external view returns (Auction[] memory); // inclusive, clamped to [1, auctionCount]

    // ---------- admin ----------
    function setOperator(address _operator) external; // onlyOwner; emits OperatorChanged
}
```

Access summary:

| Function | Who | Modifier |
|---|---|---|
| `createAuction` | anyone who is the hold's tokenHolder | none (hold ownership is checked by reading the hold under `msg.sender`) |
| `settle` | operator | `onlyOperator` |
| `cancel` | seller (before deadline) or operator (any time while Open) | custom check |
| `setOperator` | owner (deployer) | `onlyOwner` |
| views | anyone | — |

## 4. State machine

`None → Open → Settled | Cancelled`

| From | To | Who | Precondition | Effect | Event |
|---|---|---|---|---|---|
| None | Open | seller | validation rules in §5 | store Auction, `idByRef[ref] = id`, `listedHold = true` | `AuctionCreated` |
| Open | Settled | operator | `block.timestamp >= deadline`; `executeHoldByPartition` succeeds | `winner` set; bond moved seller → winner by ATS | `AuctionSettled` |
| Open | Cancelled | seller | `block.timestamp < deadline` | try `releaseHoldByPartition(amount)`; status Cancelled | `AuctionCancelled(holdReleased)` |
| Open | Cancelled | operator | any time while Open | same as above | `AuctionCancelled(holdReleased)` |
| Open | Open | operator | `settle` reverted inside ATS | **no state change** (whole tx reverts) | none (HashScan shows the ATS selector) |

Terminal states never change. A hold whose auction was Cancelled but whose release failed is still reclaimable by anyone after its expiry through ATS's own `reclaimHoldByPartition` (no code needed here).

## 5. Validation rules for `createAuction`

| Check | Revert |
|---|---|
| `token != address(0)` | `ZeroAddress()` |
| `deadline >= block.timestamp + MIN_DURATION` | `DeadlineTooSoon()` |
| `!listedHold[token][msg.sender][holdId]` | `AlreadyListed()` |
| read `getHoldForByPartition({partition, msg.sender, holdId})` | (ATS reverts if the hold does not exist) |
| `escrow_ == address(this)` | `HoldNotForThisEscrow()` |
| `destination_ == address(0)` | `HoldHasFixedDestination()` |
| `amount_ == amount` | `HoldAmountMismatch()` |
| `expirationTimestamp_ >= uint256(deadline) + SETTLE_GRACE` | `HoldExpiresTooEarly(expiration, needed)` |

Why `SETTLE_GRACE = 72h`: `BidEscrow` allows `AWARD_WINDOW (24h) + SETTLE_WINDOW (24h)` after the deadline before anyone can void; the hold must still be executable through that whole window. The frontend creates holds with `expirationTimestamp = deadline + 72h + 1h`.

## 6. Semantics of `settle`, `cancel`, `previewSettle`

**`settle(id, winner)`** — `onlyOperator`; `BadStatus` unless Open; `BeforeDeadline` if `block.timestamp < deadline`; `ZeroAddress` if `winner == 0`. Then a plain external call to `executeHoldByPartition({partition, seller, holdId}, winner, amount)`. **No try/catch**: an ATS revert reverts the whole transaction so the failure is visible on HashScan as the ATS custom error (`AccountIsBlocked(address)`, `InvalidKycStatus()`, `AddressNotVerified()`, `ComplianceNotAllowed()`, `IsPaused()`, `IsNotEscrow()`, `HoldExpirationReached()`). On success set `winner`, `status = Settled`, emit `AuctionSettled`.

**`cancel(id)`** — `BadStatus` unless Open. If `msg.sender == seller` require `block.timestamp < deadline` (`AfterDeadline`); else require `msg.sender == operator` (`NotOperator`). Then `try bond.releaseHoldByPartition({partition, seller, holdId}, amount) returns (bool ok) { holdReleased = ok; } catch { holdReleased = false; }`; set `status = Cancelled`; emit `AuctionCancelled(id, ref, msg.sender, holdReleased)`. Marking Cancelled even when release fails is deliberate: the auction must not stay Open, and the hold remains reclaimable via ATS after expiry.

**`previewSettle(id, to)`** — returns `bond.canTransferByPartition(seller, to, partition, amount, "", "")`. EIP-1066 codes to surface in the UI:

| `code` | Meaning | Typical cause |
|---|---|---|
| `0x51` | TO_ACCOUNT_KYC | `to` has no internal KYC grant |
| `0x43` | TO_ACCOUNT_BLOCKED | `to` is not on the whitelist (control list in whitelist mode) |
| `0x00`/`ok=true` | allowed | — |

Caveat: ATS evaluates `msg.sender` inside `canTransferByPartition` for the *sender* branch. When called through this contract (or via `eth_call` with `from = ExitAuction`), the sender-side checks reflect the contract's standing, not the seller's. Treat `previewSettle` as a **recipient** eligibility probe. The backend may also call `canTransferByPartition` directly on the bond with `from = seller` for a cleaner answer.

## 7. Verify first (30 minutes on testnet, before writing tests)

Do these with `cast` against the L1 bond before touching Foundry tests. Record results in §13.

| # | Question | How | If it fails |
|---|---|---|---|
| a | Can a **contract** be `hold.escrow` and successfully call `executeHoldByPartition`? (ATS reads `msg.sender` through `EvmAccessors.getMsgSender()`; it should be plain `msg.sender`.) | Deploy a 10-line `EscrowProbe` that forwards `executeHoldByPartition`; seller creates a hold with `escrow = probe`; call `probe.execute(...)` to Buyer A | Fall back to the operator EOA as escrow and have `ExitAuction` only record state (weaker, document it) |
| b | Does the escrow contract itself need to be whitelisted / KYC'd? (`executeHoldByPartition` has `onlyIdentifiedAddresses(tokenHolder, to)` and `onlyCompliant(address(0), to, false)`; `_validateExecuteHold` checks `isAbleToAccess(tokenHolder)`. None should involve the escrow.) | Same probe, escrow **not** on the control list | Contingency (10 min): in the ATS app, `addToControlList(ExitAuction)` and `grantKyc(ExitAuction, …)` |
| c | Does `getHoldForByPartition` return `destination = 0` for a hold created with `to = address(0)`? | `cast call` | Adjust the validation rule |
| d | Does a hold with `expirationTimestamp` far in the future get created (there is a max?) | create with `deadline + 73h` | Lower `SETTLE_GRACE` in both contracts consistently |

## 8. Tests (Foundry, `test/ExitAuction.t.sol`, against `test/mocks/MockATSBond.sol`)

Mock: stores holds keyed by `(partition, holder, holdId)`, an `allowedRecipients` set, and a `revertWith` selector switch so `executeHoldByPartition` can revert with `AccountIsBlocked(address)` or succeed and emit `HoldByPartitionExecuted`. `canTransferByPartition` returns `(false, 0x51, selector)` for non-allowed recipients.

| # | Test | Expect |
|---|---|---|
| 1 | happy path: create → warp past deadline → settle(A) | Settled, winner A, `AuctionSettled`, mock records execution |
| 2 | create with hold whose escrow != this | `HoldNotForThisEscrow` |
| 3 | create with hold whose destination != 0 | `HoldHasFixedDestination` |
| 4 | create with amount != hold.amount | `HoldAmountMismatch` |
| 5 | create with expiration < deadline + 72h | `HoldExpiresTooEarly` |
| 6 | create the same hold twice | `AlreadyListed` |
| 7 | create with deadline < now + 2 min | `DeadlineTooSoon` |
| 8 | settle before deadline | `BeforeDeadline` |
| 9 | settle by non-operator | `NotOperator` |
| 10 | settle where mock reverts `AccountIsBlocked(C)` | revert bubbles with the same selector and args; status still Open |
| 11 | settle twice | second reverts `BadStatus(Settled)` |
| 12 | cancel by seller before deadline | Cancelled, `holdReleased = true`, mock hold released |
| 13 | cancel by seller after deadline | `AfterDeadline` |
| 14 | cancel by operator after deadline | Cancelled |
| 15 | cancel when mock release reverts | Cancelled, `holdReleased = false` |
| 16 | cancel by third party | `NotOperator` |
| 17 | previewSettle passthrough | returns mock's `(ok, code, reason)` for A and C |
| 18 | computeRef | equals `keccak256(abi.encode(uint256(296), address(exitAuction), id))` when `vm.chainId(296)` |
| 19 | getAuctions(0, 999) | clamped to `[1, auctionCount]`, correct length |
| 20 | setOperator by non-owner | OZ `OwnableUnauthorizedAccount` |

Optional integration test (only if Hashio tolerates `vm.createSelectFork`): fork 296, use the real L1 bond, run tests 1 and 10 against real ATS.

## 9. Toolchain, deploy, verify

- Foundry, `solc = "0.8.26"`, `evm_version = "paris"`, `optimizer = true`, `optimizer_runs = 200`. OpenZeppelin v5.1.0 (`Ownable` only): `forge install OpenZeppelin/openzeppelin-contracts@v5.1.0`.
- `foundry.toml` `[rpc_endpoints] hedera = "${HEDERA_RPC_URL}"` with `HEDERA_RPC_URL=https://testnet.hashio.io/api`.
- Deploy (`script/DeployHedera.s.sol` reads `OPERATOR_ADDRESS`, writes the address to stdout and to `packages/shared/src/addresses.json` in a separate commit):

```bash
forge script script/DeployHedera.s.sol --rpc-url hedera --broadcast
# if Hashio rejects gas estimation or EIP-1559 fields:
forge script script/DeployHedera.s.sol --rpc-url hedera --broadcast --legacy --slow --gas-estimate-multiplier 150
```

- Verify on HashScan (Sourcify):

```bash
forge verify-contract --chain-id 296 \
  --verifier sourcify --verifier-url https://server-verify.hashscan.io \
  <EXIT_AUCTION_ADDRESS> src/hedera/ExitAuction.sol:ExitAuction \
  --constructor-args $(cast abi-encode "constructor(address)" $OPERATOR_ADDRESS)
# fallback verifier: --verifier-url https://sourcify.dev/server
```

- Re-verification script `scripts/ops/reverify-hedera.sh` (same command, idempotent) because Hedera testnet resets wipe Sourcify state.
- HashScan link format: `https://hashscan.io/testnet/contract/<0x-address>` and `https://hashscan.io/testnet/transaction/<tx-hash>`.

## 10. Acceptance criteria (demo-observable)

- [ ] `ExitAuction` shows **Verified** on HashScan testnet.
- [ ] With the L1 bond: seller creates a hold (escrow = ExitAuction) and `createAuction` succeeds; `AuctionCreated` visible on HashScan.
- [ ] After the deadline, `settle(id, BuyerA)` (or B) succeeds; HashScan shows `HoldByPartitionExecuted` on the bond and `AuctionSettled` here; Buyer's `balanceOf` increases by `amount`.
- [ ] `settle(id, BuyerC)` on a fresh auction **reverts** and HashScan shows the ATS error (`InvalidKycStatus()` or `AccountIsBlocked(C)`); auction stays Open.
- [ ] `previewSettle(id, BuyerC)` returns `ok=false` with code `0x51` or `0x43`; `previewSettle(id, BuyerA)` returns `ok=true`.
- [ ] `cancel(id)` by the seller before the deadline releases the hold (seller's available balance restored).
- [ ] All Foundry tests in §8 pass (`forge test`).

## 11. Minimum viable / Full

| MV (must) | Full (after gate G3) |
|---|---|
| Everything in §3–§6 | NatSpec on every function |
| Tests 1–18 | Tests 19–20, fork integration test |
| Deploy + verify | Gas report committed to `docs/evidence/` |
| Address in `addresses.json` | `getAuctions` pagination polish (page size guard) |

## 12. Out of scope

Bids, USDC, refunds (all on Arc — spec 02). Reading bids from Hedera. Indexing events (backend reads `getAuctions`). Multi-partition or clearing-mode bonds. Fee collection. Upgradability. Any transfer of bonds by this contract other than through `executeHoldByPartition` / `releaseHoldByPartition`.

## 13. Known pitfalls

- **15M gas cap per transaction on Hedera.** `settle` goes bond diamond → resolver → facet → Ops library (nested delegatecalls). Measure once with `cast estimate`; it should be far below the cap, but pass an explicit `--gas-limit` if estimation is flaky.
- **Hashio is slow and estimation is flaky.** Use 120 s timeouts; keep `--legacy --slow --gas-estimate-multiplier 150` as the fallback for scripts.
- **Testnet resets wipe Sourcify verification.** Keep the re-verify script; re-run after any reset and before recording.
- **`balanceOf` on ATS = available balance.** Total = `balanceOf + getHeldAmountFor(holder)`. The UI must show both or the seller looks like they lost tokens after listing.
- **`expirationTimestamp = 0` is invalid** for holds (ATS rejects it). Always set a real future timestamp.
- **Read `holdId` from the `HeldByPartition` event** in the hold-creation receipt. Do not poll the mirror node for it.
- **Hold creation has no compliance check**; execution does. A seller can list, and only at `settle` will an ineligible winner be rejected — which is why `previewSettle` and the backend screening exist.
- **`canTransferByPartition` sender branch** reflects `msg.sender` (see §6).
- **Contract size** is not a concern here (< 24 KiB easily), but keep it that way: no strings in errors, no fancy views.
- Tinybar/weibar: this contract never uses `msg.value`; keep it that way.

## 14. Evidence (fill during the build)

| Item | Value / link |
|---|---|
| Deployed address (296) | |
| HashScan verified link | |
| Deploy tx | |
| `createAuction` tx (demo auction) | |
| `settle(id, BuyerB)` tx (success) | |
| `settle(id, BuyerC)` tx (revert, selector) | |
| `cancel` tx | |
| `forge test` summary | |
| Verify-first results (§7 a–d) | |
