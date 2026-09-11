// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IATSBond} from "../interfaces/IATSBond.sol";

/// @title ExitAuction
/// @notice Registry and hold executor for ATS bond exit auctions on Hedera.
/// @dev The contract never holds bonds; it is only the `escrow` of the seller's hold.
contract ExitAuction is Ownable {
    // ---------- types ----------
    enum Status {
        None,
        Open,
        Settled,
        Cancelled
    }

    struct Auction {
        address token;
        address seller;
        bytes32 partition;
        uint256 holdId;
        uint256 amount;
        uint64 deadline;
        uint64 createdAt;
        bytes32 reserveCommitment;
        Status status;
        address winner;
        bytes32 ref;
    }

    // ---------- constants ----------
    uint64 public constant SETTLE_GRACE = 72 hours;
    uint64 public constant MIN_DURATION = 2 minutes;
    bytes32 public constant DEFAULT_PARTITION = bytes32(uint256(1));

    // ---------- storage ----------
    address public operator;
    uint256 public auctionCount;
    mapping(uint256 => Auction) internal _auctions;
    mapping(bytes32 => uint256) public idByRef;
    mapping(address => mapping(address => mapping(uint256 => bool))) public listedHold;

    // ---------- events ----------
    event AuctionCreated(
        uint256 indexed id,
        bytes32 indexed ref,
        address indexed seller,
        address token,
        bytes32 partition,
        uint256 holdId,
        uint256 amount,
        uint64 deadline,
        bytes32 reserveCommitment
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
    constructor(address _operator) Ownable(msg.sender) {
        if (_operator == address(0)) revert ZeroAddress();
        operator = _operator;
        emit OperatorChanged(_operator);
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    // ---------- seller ----------
    /// Registers an existing hold as an auction. Caller must be the hold's tokenHolder.
    function createAuction(
        address token,
        bytes32 partition,
        uint256 holdId,
        uint256 amount,
        uint64 deadline,
        bytes32 reserveCommitment
    ) external returns (uint256 id, bytes32 ref) {
        if (token == address(0)) revert ZeroAddress();
        if (deadline < block.timestamp + MIN_DURATION) revert DeadlineTooSoon();
        if (listedHold[token][msg.sender][holdId]) revert AlreadyListed();

        _validateHold(token, partition, holdId, amount, deadline);

        id = ++auctionCount;
        ref = computeRef(id);
        _storeAuction(id, ref, token, partition, holdId, amount, deadline, reserveCommitment);
        listedHold[token][msg.sender][holdId] = true;

        emit AuctionCreated(id, ref, msg.sender, token, partition, holdId, amount, deadline, reserveCommitment);
    }

    function _validateHold(address token, bytes32 partition, uint256 holdId, uint256 amount, uint64 deadline)
        internal
        view
    {
        IATSBond.HoldIdentifier memory hid =
            IATSBond.HoldIdentifier({partition: partition, tokenHolder: msg.sender, holdId: holdId});
        (uint256 amount_, uint256 expiration_, address escrow_, address destination_,,,) =
            IATSBond(token).getHoldForByPartition(hid);

        if (escrow_ != address(this)) revert HoldNotForThisEscrow();
        if (destination_ != address(0)) revert HoldHasFixedDestination();
        if (amount_ != amount) revert HoldAmountMismatch();

        uint256 needed = uint256(deadline) + SETTLE_GRACE;
        if (expiration_ < needed) revert HoldExpiresTooEarly(expiration_, needed);
    }

    function _storeAuction(
        uint256 id,
        bytes32 ref,
        address token,
        bytes32 partition,
        uint256 holdId,
        uint256 amount,
        uint64 deadline,
        bytes32 reserveCommitment
    ) internal {
        _auctions[id] = Auction({
            token: token,
            seller: msg.sender,
            partition: partition,
            holdId: holdId,
            amount: amount,
            deadline: deadline,
            createdAt: uint64(block.timestamp),
            reserveCommitment: reserveCommitment,
            status: Status.Open,
            winner: address(0),
            ref: ref
        });
        idByRef[ref] = id;
    }

    /// Seller: only while Open and before deadline. Operator: any time while Open.
    /// Attempts releaseHoldByPartition inside try/catch; marks Cancelled regardless.
    function cancel(uint256 id) external {
        Auction storage a = _auctions[id];
        if (a.status != Status.Open) revert BadStatus(a.status);

        if (msg.sender == a.seller) {
            if (block.timestamp >= a.deadline) revert AfterDeadline();
        } else if (msg.sender != operator) {
            revert NotOperator();
        }

        bool holdReleased;
        IATSBond.HoldIdentifier memory hid =
            IATSBond.HoldIdentifier({partition: a.partition, tokenHolder: a.seller, holdId: a.holdId});
        try IATSBond(a.token).releaseHoldByPartition(hid, a.amount) returns (bool ok) {
            holdReleased = ok;
        } catch {
            holdReleased = false;
        }

        a.status = Status.Cancelled;
        emit AuctionCancelled(id, a.ref, msg.sender, holdReleased);
    }

    // ---------- operator ----------
    /// Open && block.timestamp >= deadline. ATS reverts bubble up unchanged.
    function settle(uint256 id, address winner) external onlyOperator {
        if (winner == address(0)) revert ZeroAddress();
        Auction storage a = _auctions[id];
        if (a.status != Status.Open) revert BadStatus(a.status);
        if (block.timestamp < a.deadline) revert BeforeDeadline();

        IATSBond.HoldIdentifier memory hid =
            IATSBond.HoldIdentifier({partition: a.partition, tokenHolder: a.seller, holdId: a.holdId});
        IATSBond(a.token).executeHoldByPartition(hid, winner, a.amount);

        a.winner = winner;
        a.status = Status.Settled;
        emit AuctionSettled(id, a.ref, winner, a.amount);
    }

    // ---------- views ----------
    /// canTransferByPartition(seller, to, partition, amount, "", "")
    function previewSettle(uint256 id, address to) external view returns (bool ok, bytes1 code, bytes32 reason) {
        Auction storage a = _auctions[id];
        return IATSBond(a.token).canTransferByPartition(a.seller, to, a.partition, a.amount, "", "");
    }

    function computeRef(uint256 id) public view returns (bytes32) {
        return keccak256(abi.encode(uint256(block.chainid), address(this), id));
    }

    function getAuction(uint256 id) external view returns (Auction memory) {
        return _auctions[id];
    }

    /// Inclusive range, clamped to [1, auctionCount].
    function getAuctions(uint256 from, uint256 to) external view returns (Auction[] memory) {
        uint256 count = auctionCount;
        if (count == 0) return new Auction[](0);

        uint256 start = from < 1 ? 1 : from;
        uint256 end = to > count ? count : to;
        if (start > end) return new Auction[](0);

        uint256 len = end - start + 1;
        Auction[] memory page = new Auction[](len);
        for (uint256 i; i < len; ++i) {
            page[i] = _auctions[start + i];
        }
        return page;
    }

    // ---------- admin ----------
    function setOperator(address _operator) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        operator = _operator;
        emit OperatorChanged(_operator);
    }
}
