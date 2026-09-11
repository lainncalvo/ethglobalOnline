// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BidEscrow} from "../src/arc/BidEscrow.sol";
import {ReceiverTemplate} from "../src/cre/ReceiverTemplate.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract BidEscrowTest is Test {
    uint256 internal constant BID_A = 14_500_000000;
    uint256 internal constant BID_B = 15_200_000000;
    uint256 internal constant RESERVE = 14_000_000000;
    uint256 internal constant HEDERA_ID = 1;

    BidEscrow internal escrow;
    MockUSDC internal usdc;

    address internal operator;
    address internal forwarder;
    address internal seller;
    address internal buyerA;
    address internal buyerB;
    address internal buyerC;
    address internal stranger;

    bytes32 internal ref;
    bytes32 internal commitment;
    uint64 internal deadline;

    event AuctionRegistered(
        bytes32 indexed ref, address indexed seller, uint64 deadline, bytes32 reserveCommitment, uint256 hederaAuctionId
    );
    event Awarded(
        bytes32 indexed ref,
        address indexed winner,
        uint256 clearingPrice,
        bytes32 reserveCommitment,
        BidEscrow.AwardSource source,
        bytes32 bidsDigest
    );
    event NoWinner(bytes32 indexed ref, uint8 outcome, BidEscrow.AwardSource source);
    event DeliveryConfirmed(bytes32 indexed ref, bytes32 hederaTxHash, address seller, uint256 paid);
    event AwardVoided(bytes32 indexed ref, address by, string reason);
    event AuctionCancelled(bytes32 indexed ref);
    event AuctionExpired(bytes32 indexed ref);
    event Withdrawn(bytes32 indexed ref, address indexed bidder, uint256 amount);

    function setUp() public {
        operator = makeAddr("operator");
        forwarder = makeAddr("forwarder");
        seller = makeAddr("seller");
        buyerA = makeAddr("buyerA");
        buyerB = makeAddr("buyerB");
        buyerC = makeAddr("buyerC");
        stranger = makeAddr("stranger");

        usdc = new MockUSDC();
        escrow = new BidEscrow(address(usdc), operator, forwarder);

        ref = keccak256(abi.encode(uint256(296), address(0xBEEF), HEDERA_ID));
        commitment = keccak256(abi.encode(RESERVE, bytes32("salt")));
        deadline = uint64(block.timestamp + 1 hours);

        usdc.mint(buyerA, 1_000_000_000000);
        usdc.mint(buyerB, 1_000_000_000000);
        usdc.mint(buyerC, 1_000_000_000000);
    }

    // ---------- 1 register ----------

    function test_01_register() public {
        vm.expectEmit(true, true, false, true);
        emit AuctionRegistered(ref, seller, deadline, commitment, HEDERA_ID);
        _register();

        BidEscrow.Auction memory a = escrow.getAuction(ref);
        assertEq(uint256(a.status), uint256(BidEscrow.Status.Bidding));
        assertEq(a.seller, seller);
        assertEq(a.deadline, deadline);
        assertEq(a.reserveCommitment, commitment);
        assertEq(a.hederaAuctionId, HEDERA_ID);
    }

    // ---------- 2 register twice / unknown ref ----------

    function test_02_registerTwiceAndUnknownRef() public {
        _register();
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(BidEscrow.BadStatus.selector, BidEscrow.Status.Bidding));
        escrow.registerAuction(ref, seller, deadline, commitment, HEDERA_ID);

        bytes32 unknown = keccak256("unknown");
        vm.prank(buyerA);
        vm.expectRevert(BidEscrow.UnknownRef.selector);
        escrow.placeBid(unknown, BID_A);

        vm.prank(operator);
        vm.expectRevert(BidEscrow.UnknownRef.selector);
        escrow.awardByOperator(unknown, buyerB, BID_B, commitment, 1, bytes32(0));
    }

    // ---------- 3 placeBid ----------

    function test_03_placeBid() public {
        _register();
        _approveAndBid(buyerA, BID_A);

        assertEq(usdc.balanceOf(address(escrow)), BID_A);
        assertEq(escrow.bids(ref, buyerA), BID_A);

        (address[] memory bidders, uint256[] memory amounts) = escrow.getBids(ref);
        assertEq(bidders.length, 1);
        assertEq(bidders[0], buyerA);
        assertEq(amounts[0], BID_A);
    }

    // ---------- 4 top-up ----------

    function test_04_topUp() public {
        _register();
        _approveAndBid(buyerA, BID_A);
        _approveAndBid(buyerA, 700_000000);

        assertEq(escrow.bids(ref, buyerA), BID_A + 700_000000);
        (address[] memory bidders,) = escrow.getBids(ref);
        assertEq(bidders.length, 1);
        assertEq(bidders[0], buyerA);
    }

    // ---------- 5 bid after deadline ----------

    function test_05_bidAfterDeadline() public {
        _register();
        vm.warp(deadline);
        _approve(buyerA, BID_A);
        vm.prank(buyerA);
        vm.expectRevert(BidEscrow.AfterDeadline.selector);
        escrow.placeBid(ref, BID_A);
    }

    // ---------- 6 bid zero ----------

    function test_06_bidZero() public {
        _register();
        vm.prank(buyerA);
        vm.expectRevert(BidEscrow.ZeroAmount.selector);
        escrow.placeBid(ref, 0);
    }

    // ---------- 7 awardByOperator happy ----------

    function test_07_awardByOperatorHappy() public {
        _seedTwoBids();
        vm.warp(deadline);

        bytes32 digest = escrow.bidsDigest(ref);
        vm.expectEmit(true, true, false, true);
        emit Awarded(ref, buyerB, BID_B, commitment, BidEscrow.AwardSource.Operator, digest);
        _awardOperator(buyerB, BID_B, 1, digest);

        BidEscrow.Auction memory a = escrow.getAuction(ref);
        assertEq(uint256(a.status), uint256(BidEscrow.Status.Awarded));
        assertEq(a.winner, buyerB);
        assertEq(a.clearingPrice, BID_B);
        assertEq(uint256(a.source), uint256(BidEscrow.AwardSource.Operator));
        assertEq(a.awardedAt, uint64(block.timestamp));
    }

    // ---------- 8 award before deadline ----------

    function test_08_awardBeforeDeadline() public {
        _seedTwoBids();
        vm.prank(operator);
        vm.expectRevert(BidEscrow.BeforeDeadline.selector);
        escrow.awardByOperator(ref, buyerB, BID_B, commitment, 1, bytes32(0));
    }

    // ---------- 9 wrong commitment ----------

    function test_09_awardWrongCommitment() public {
        _seedTwoBids();
        vm.warp(deadline);
        vm.prank(operator);
        vm.expectRevert(BidEscrow.CommitmentMismatch.selector);
        escrow.awardByOperator(ref, buyerB, BID_B, keccak256("wrong"), 1, bytes32(0));
    }

    // ---------- 10 clearingPrice > bid ----------

    function test_10_awardInsufficientBid() public {
        _seedTwoBids();
        vm.warp(deadline);
        vm.prank(operator);
        vm.expectRevert(BidEscrow.InsufficientBid.selector);
        escrow.awardByOperator(ref, buyerB, BID_B + 1, commitment, 1, bytes32(0));
    }

    // ---------- 11 award replay ----------

    function test_11_awardReplay() public {
        _seedTwoBids();
        vm.warp(deadline);
        _awardOperator(buyerB, BID_B, 1, bytes32(0));
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(BidEscrow.BadStatus.selector, BidEscrow.Status.Awarded));
        escrow.awardByOperator(ref, buyerB, BID_B, commitment, 1, bytes32(0));
    }

    // ---------- 12 confirmDelivery + winner excess once ----------

    function test_12_confirmDeliveryAndWinnerExcessOnce() public {
        _register();
        _approveAndBid(buyerA, BID_A);
        _approveAndBid(buyerB, BID_B + 800_000000);
        vm.warp(deadline);
        _awardOperator(buyerB, BID_B, 1, bytes32(0));

        uint256 sellerBefore = usdc.balanceOf(seller);
        bytes32 hederaTx = keccak256("hedera-settle");
        vm.expectEmit(true, false, false, true);
        emit DeliveryConfirmed(ref, hederaTx, seller, BID_B);
        vm.prank(operator);
        escrow.confirmDelivery(ref, hederaTx);

        assertEq(usdc.balanceOf(seller), sellerBefore + BID_B);
        BidEscrow.Auction memory a = escrow.getAuction(ref);
        assertEq(uint256(a.status), uint256(BidEscrow.Status.Settled));
        assertEq(a.hederaTxHash, hederaTx);

        uint256 excess = 800_000000;
        assertEq(escrow.refundable(ref, buyerB), excess);
        uint256 bBefore = usdc.balanceOf(buyerB);
        vm.prank(buyerB);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerB), bBefore + excess);

        vm.prank(buyerB);
        vm.expectRevert(BidEscrow.NothingToWithdraw.selector);
        escrow.withdraw(ref);
    }

    // ---------- 13 loser withdraw after Awarded ----------

    function test_13_loserWithdrawAfterAwarded() public {
        _seedTwoBids();
        vm.warp(deadline);
        _awardOperator(buyerB, BID_B, 1, bytes32(0));

        assertEq(escrow.refundable(ref, buyerA), BID_A);
        uint256 before = usdc.balanceOf(buyerA);
        vm.expectEmit(true, true, false, true);
        emit Withdrawn(ref, buyerA, BID_A);
        vm.prank(buyerA);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerA), before + BID_A);
        assertEq(escrow.bids(ref, buyerA), 0);
    }

    // ---------- 14 withdraw during Bidding ----------

    function test_14_withdrawDuringBidding() public {
        _seedTwoBids();
        vm.prank(buyerA);
        vm.expectRevert(BidEscrow.NothingToWithdraw.selector);
        escrow.withdraw(ref);
    }

    // ---------- 15 void by operator, everyone withdraws ----------

    function test_15_voidByOperatorThenWithdraw() public {
        _seedTwoBids();
        vm.warp(deadline);
        _awardOperator(buyerB, BID_B, 1, bytes32(0));

        vm.expectEmit(true, false, false, true);
        emit AwardVoided(ref, operator, "ats revert");
        vm.prank(operator);
        escrow.voidAward(ref, "ats revert");
        assertEq(uint256(escrow.getAuction(ref).status), uint256(BidEscrow.Status.Voided));

        uint256 aBefore = usdc.balanceOf(buyerA);
        uint256 bBefore = usdc.balanceOf(buyerB);
        vm.prank(buyerA);
        escrow.withdraw(ref);
        vm.prank(buyerB);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerA), aBefore + BID_A);
        assertEq(usdc.balanceOf(buyerB), bBefore + BID_B);
    }

    // ---------- 16 void by stranger around SETTLE_WINDOW ----------

    function test_16_voidByStrangerWindow() public {
        _seedTwoBids();
        vm.warp(deadline);
        _awardOperator(buyerB, BID_B, 1, bytes32(0));
        uint64 awardedAt = escrow.getAuction(ref).awardedAt;

        vm.prank(stranger);
        vm.expectRevert(BidEscrow.TooEarly.selector);
        escrow.voidAward(ref, "impatient");

        vm.warp(uint256(awardedAt) + escrow.SETTLE_WINDOW());
        vm.prank(stranger);
        vm.expectRevert(BidEscrow.TooEarly.selector);
        escrow.voidAward(ref, "still early");

        vm.warp(uint256(awardedAt) + escrow.SETTLE_WINDOW() + 1);
        vm.prank(stranger);
        escrow.voidAward(ref, "stale award");
        assertEq(uint256(escrow.getAuction(ref).status), uint256(BidEscrow.Status.Voided));
    }

    // ---------- 17 expire by stranger around AWARD_WINDOW ----------

    function test_17_expireByStrangerWindow() public {
        _seedTwoBids();

        vm.prank(stranger);
        vm.expectRevert(BidEscrow.TooEarly.selector);
        escrow.expireAuction(ref);

        vm.warp(uint256(deadline) + escrow.AWARD_WINDOW());
        vm.prank(stranger);
        vm.expectRevert(BidEscrow.TooEarly.selector);
        escrow.expireAuction(ref);

        vm.warp(uint256(deadline) + escrow.AWARD_WINDOW() + 1);
        vm.expectEmit(true, false, false, true);
        emit AuctionExpired(ref);
        vm.prank(stranger);
        escrow.expireAuction(ref);
        assertEq(uint256(escrow.getAuction(ref).status), uint256(BidEscrow.Status.Expired));

        uint256 before = usdc.balanceOf(buyerA);
        vm.prank(buyerA);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerA), before + BID_A);
    }

    // ---------- 18 cancelAuction ----------

    function test_18_cancelAuction() public {
        _seedTwoBids();
        vm.expectEmit(true, false, false, true);
        emit AuctionCancelled(ref);
        vm.prank(operator);
        escrow.cancelAuction(ref);
        assertEq(uint256(escrow.getAuction(ref).status), uint256(BidEscrow.Status.Cancelled));

        uint256 before = usdc.balanceOf(buyerB);
        vm.prank(buyerB);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerB), before + BID_B);
    }

    // ---------- 19 onReport from non-forwarder ----------

    function test_19_onReportUnauthorized() public {
        _seedTwoBids();
        vm.warp(deadline);
        bytes memory report = _encodeReport(buyerB, BID_B, 1, bytes32(0));
        vm.expectRevert(abi.encodeWithSelector(ReceiverTemplate.InvalidSender.selector, address(this), forwarder));
        escrow.onReport("", report);
    }

    // ---------- 20 onReport from forwarder, outcome 1 ----------

    function test_20_onReportAwardedCre() public {
        _seedTwoBids();
        vm.warp(deadline);
        bytes32 digest = escrow.bidsDigest(ref);
        bytes memory report = _encodeReport(buyerB, BID_B, 1, digest);

        vm.expectEmit(true, true, false, true);
        emit Awarded(ref, buyerB, BID_B, commitment, BidEscrow.AwardSource.CRE, digest);
        vm.prank(forwarder);
        escrow.onReport("", report);

        BidEscrow.Auction memory a = escrow.getAuction(ref);
        assertEq(uint256(a.status), uint256(BidEscrow.Status.Awarded));
        assertEq(uint256(a.source), uint256(BidEscrow.AwardSource.CRE));
        assertEq(a.winner, buyerB);
        assertEq(a.clearingPrice, BID_B);
    }

    // ---------- 21 onReport outcomes 2/3/4 ----------

    function test_21_onReportNoWinnerOutcomes() public {
        _assertNoWinnerOutcome(2);
        _assertNoWinnerOutcome(3);
        _assertNoWinnerOutcome(4);
    }

    // ---------- 22 confirmDelivery when not Awarded ----------

    function test_22_confirmDeliveryBadStatus() public {
        _seedTwoBids();
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(BidEscrow.BadStatus.selector, BidEscrow.Status.Bidding));
        escrow.confirmDelivery(ref, keccak256("tx"));

        vm.warp(deadline);
        _awardOperator(buyerB, BID_B, 1, bytes32(0));
        vm.prank(operator);
        escrow.confirmDelivery(ref, keccak256("tx"));

        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(BidEscrow.BadStatus.selector, BidEscrow.Status.Settled));
        escrow.confirmDelivery(ref, keccak256("tx2"));
    }

    // ---------- 23 bidsDigest off-chain match ----------

    function test_23_bidsDigestMatchesOffChain() public {
        _register();
        uint256 bidC = 1_000_000000;
        _approveAndBid(buyerA, BID_A);
        _approveAndBid(buyerB, BID_B);
        _approveAndBid(buyerC, bidC);

        bytes32 expected = keccak256(abi.encodePacked(buyerA, BID_A, buyerB, BID_B, buyerC, bidC));
        assertEq(escrow.bidsDigest(ref), expected);
    }

    // ---------- helpers ----------

    function _register() internal {
        vm.prank(operator);
        escrow.registerAuction(ref, seller, deadline, commitment, HEDERA_ID);
    }

    function _approve(address bidder, uint256 amount) internal {
        vm.prank(bidder);
        usdc.approve(address(escrow), amount);
    }

    function _approveAndBid(address bidder, uint256 amount) internal {
        _approve(bidder, amount);
        vm.prank(bidder);
        escrow.placeBid(ref, amount);
    }

    function _seedTwoBids() internal {
        _register();
        _approveAndBid(buyerA, BID_A);
        _approveAndBid(buyerB, BID_B);
    }

    function _awardOperator(address winner, uint256 price, uint8 outcome, bytes32 digest) internal {
        vm.prank(operator);
        escrow.awardByOperator(ref, winner, price, commitment, outcome, digest);
    }

    function _encodeReport(address winner, uint256 price, uint8 outcome, bytes32 digest)
        internal
        view
        returns (bytes memory)
    {
        return abi.encode(ref, winner, price, commitment, outcome, digest);
    }

    function _assertNoWinnerOutcome(uint8 outcome) internal {
        // Fresh escrow per outcome so state does not leak across 2/3/4.
        BidEscrow fresh = new BidEscrow(address(usdc), operator, forwarder);
        bytes32 r = keccak256(abi.encode(outcome, "no-winner"));
        vm.prank(operator);
        fresh.registerAuction(r, seller, deadline, commitment, HEDERA_ID);
        vm.startPrank(buyerA);
        usdc.approve(address(fresh), BID_A);
        fresh.placeBid(r, BID_A);
        vm.stopPrank();

        vm.warp(deadline);
        bytes memory report = abi.encode(r, address(0), uint256(0), commitment, outcome, bytes32(0));
        vm.expectEmit(true, false, false, true);
        emit NoWinner(r, outcome, BidEscrow.AwardSource.CRE);
        vm.prank(forwarder);
        fresh.onReport("", report);
        assertEq(uint256(fresh.getAuction(r).status), uint256(BidEscrow.Status.NoWinner));

        uint256 before = usdc.balanceOf(buyerA);
        vm.prank(buyerA);
        fresh.withdraw(r);
        assertEq(usdc.balanceOf(buyerA), before + BID_A);

        // Reset clock so later cases can register with the original deadline.
        vm.warp(deadline - 1 hours);
    }
}
