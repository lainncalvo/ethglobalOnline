// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReceiverTemplate} from "../cre/ReceiverTemplate.sol";

/// @title BidEscrow — USDC bid escrow and CRE award receiver on Arc.
/// @dev ERC-20 USDC (6 decimals) only. No payable / receive / fallback.
///      Ownable comes from ReceiverTemplate (OZ v5).
contract BidEscrow is ReceiverTemplate, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- types ----------
    enum Status {
        None,
        Bidding,
        Awarded,
        Settled,
        Voided,
        Cancelled,
        Expired,
        NoWinner
    }

    enum AwardSource {
        None,
        CRE,
        Operator
    }

    struct Auction {
        address seller;
        uint64 deadline;
        uint64 awardedAt;
        bytes32 reserveCommitment;
        Status status;
        address winner;
        uint256 clearingPrice;
        AwardSource source;
        bytes32 hederaTxHash;
        uint256 hederaAuctionId;
        uint256 totalEscrowed;
    }

    // ---------- constants ----------
    uint64 public constant AWARD_WINDOW = 24 hours;
    uint64 public constant SETTLE_WINDOW = 24 hours;

    // ---------- storage ----------
    IERC20 public immutable usdc;
    address public operator;
    mapping(bytes32 => Auction) internal _auctions;
    mapping(bytes32 => mapping(address => uint256)) public bids;
    mapping(bytes32 => address[]) internal _bidders;

    // ---------- events ----------
    event AuctionRegistered(
        bytes32 indexed ref, address indexed seller, uint64 deadline, bytes32 reserveCommitment, uint256 hederaAuctionId
    );
    event BidPlaced(bytes32 indexed ref, address indexed bidder, uint256 added, uint256 total);
    event Awarded(
        bytes32 indexed ref,
        address indexed winner,
        uint256 clearingPrice,
        bytes32 reserveCommitment,
        AwardSource source,
        bytes32 bidsDigest
    );
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

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    /// @param _usdc      Arc ERC-20 USDC (0x3600… on testnet).
    /// @param _operator  Backend key.
    /// @param _forwarder Chainlink forwarder; changeable via setForwarderAddress.
    constructor(address _usdc, address _operator, address _forwarder) ReceiverTemplate(_forwarder) {
        if (_usdc == address(0) || _operator == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        operator = _operator;
    }

    // ---------- operator ----------

    function registerAuction(
        bytes32 ref,
        address seller,
        uint64 deadline,
        bytes32 reserveCommitment,
        uint256 hederaAuctionId
    ) external onlyOperator {
        if (seller == address(0)) revert ZeroAddress();
        if (deadline <= block.timestamp) revert AfterDeadline();
        Auction storage a = _auctions[ref];
        if (a.status != Status.None) revert BadStatus(a.status);
        a.seller = seller;
        a.deadline = deadline;
        a.reserveCommitment = reserveCommitment;
        a.status = Status.Bidding;
        a.hederaAuctionId = hederaAuctionId;
        emit AuctionRegistered(ref, seller, deadline, reserveCommitment, hederaAuctionId);
    }

    function awardByOperator(
        bytes32 ref,
        address winner,
        uint256 clearingPrice,
        bytes32 reserveCommitment,
        uint8 outcome,
        bytes32 digest
    ) external onlyOperator {
        _award(ref, winner, clearingPrice, reserveCommitment, outcome, digest, AwardSource.Operator);
    }

    function confirmDelivery(bytes32 ref, bytes32 hederaTxHash) external onlyOperator nonReentrant {
        Auction storage a = _requireKnown(ref);
        if (a.status != Status.Awarded) revert BadStatus(a.status);
        a.status = Status.Settled;
        a.hederaTxHash = hederaTxHash;
        usdc.safeTransfer(a.seller, a.clearingPrice);
        emit DeliveryConfirmed(ref, hederaTxHash, a.seller, a.clearingPrice);
    }

    function cancelAuction(bytes32 ref) external onlyOperator {
        Auction storage a = _requireKnown(ref);
        if (a.status != Status.Bidding) revert BadStatus(a.status);
        a.status = Status.Cancelled;
        emit AuctionCancelled(ref);
    }

    // ---------- bidders ----------

    function placeBid(bytes32 ref, uint256 amount) external nonReentrant {
        Auction storage a = _requireKnown(ref);
        if (a.status != Status.Bidding) revert BadStatus(a.status);
        if (block.timestamp >= a.deadline) revert AfterDeadline();
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        uint256 previous = bids[ref][msg.sender];
        if (previous == 0) {
            _bidders[ref].push(msg.sender);
        }
        uint256 total = previous + amount;
        bids[ref][msg.sender] = total;
        a.totalEscrowed += amount;
        emit BidPlaced(ref, msg.sender, amount, total);
    }

    function withdraw(bytes32 ref) external nonReentrant {
        uint256 amount = refundable(ref, msg.sender);
        if (amount == 0) revert NothingToWithdraw();
        bids[ref][msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(ref, msg.sender, amount);
    }

    // ---------- anyone ----------

    function voidAward(bytes32 ref, string calldata reason) external {
        Auction storage a = _requireKnown(ref);
        if (a.status != Status.Awarded) revert BadStatus(a.status);
        if (msg.sender != operator && block.timestamp <= uint256(a.awardedAt) + SETTLE_WINDOW) {
            revert TooEarly();
        }
        a.status = Status.Voided;
        emit AwardVoided(ref, msg.sender, reason);
    }

    function expireAuction(bytes32 ref) external {
        Auction storage a = _requireKnown(ref);
        if (a.status != Status.Bidding) revert BadStatus(a.status);
        if (block.timestamp <= uint256(a.deadline) + AWARD_WINDOW) revert TooEarly();
        a.status = Status.Expired;
        emit AuctionExpired(ref);
    }

    // ---------- CRE ----------

    function _processReport(bytes calldata report) internal override {
        (bytes32 ref, address winner, uint256 clearingPrice, bytes32 reserveCommitment, uint8 outcome, bytes32 digest) =
            abi.decode(report, (bytes32, address, uint256, bytes32, uint8, bytes32));
        _award(ref, winner, clearingPrice, reserveCommitment, outcome, digest, AwardSource.CRE);
    }

    // ---------- views ----------

    function refundable(bytes32 ref, address who) public view returns (uint256) {
        Auction storage a = _auctions[ref];
        Status s = a.status;
        if (s == Status.None || s == Status.Bidding) return 0;

        uint256 bid = bids[ref][who];
        if (bid == 0) return 0;

        if (s == Status.Awarded) {
            return who == a.winner ? 0 : bid;
        }
        if (s == Status.Settled && who == a.winner) {
            // Zeroed after the excess withdraw; guard so bids - clearingPrice cannot underflow.
            return bid > a.clearingPrice ? bid - a.clearingPrice : 0;
        }
        return bid;
    }

    function getAuction(bytes32 ref) external view returns (Auction memory) {
        return _auctions[ref];
    }

    function getBids(bytes32 ref) external view returns (address[] memory bidders, uint256[] memory amounts) {
        address[] storage list = _bidders[ref];
        uint256 n = list.length;
        bidders = new address[](n);
        amounts = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            bidders[i] = list[i];
            amounts[i] = bids[ref][list[i]];
        }
    }

    function bidsDigest(bytes32 ref) public view returns (bytes32) {
        address[] storage list = _bidders[ref];
        bytes memory packed;
        for (uint256 i = 0; i < list.length; i++) {
            packed = abi.encodePacked(packed, list[i], bids[ref][list[i]]);
        }
        return keccak256(packed);
    }

    // ---------- admin ----------

    function setOperator(address _operator) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        operator = _operator;
        emit OperatorChanged(_operator);
    }

    // ReceiverTemplate.setForwarderAddress is already onlyOwner (OZ Ownable).

    // ---------- internals ----------

    function _requireKnown(bytes32 ref) internal view returns (Auction storage a) {
        a = _auctions[ref];
        if (a.status == Status.None) revert UnknownRef();
    }

    function _award(
        bytes32 ref,
        address winner,
        uint256 clearingPrice,
        bytes32 reserveCommitment,
        uint8 outcome,
        bytes32 digest,
        AwardSource source
    ) internal {
        Auction storage a = _requireKnown(ref);
        if (a.status != Status.Bidding) revert BadStatus(a.status);
        if (block.timestamp < a.deadline) revert BeforeDeadline();
        if (reserveCommitment != a.reserveCommitment) revert CommitmentMismatch();
        if (outcome != 1) {
            a.status = Status.NoWinner;
            a.source = source;
            emit NoWinner(ref, outcome, source);
            return;
        }
        if (winner == address(0)) revert ZeroAddress();
        if (clearingPrice == 0 || bids[ref][winner] < clearingPrice) revert InsufficientBid();
        a.status = Status.Awarded;
        a.winner = winner;
        a.clearingPrice = clearingPrice;
        a.source = source;
        a.awardedAt = uint64(block.timestamp);
        emit Awarded(ref, winner, clearingPrice, reserveCommitment, source, digest);
    }
}
