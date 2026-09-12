// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {HederaBidEscrow} from "../src/hedera/HederaBidEscrow.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract HederaBidEscrowTest is Test {
    uint256 internal constant BID_A = 1_000000;
    uint256 internal constant BID_B = 2_000000;
    uint256 internal constant RESERVE = 1_000000;
    uint256 internal constant HEDERA_ID = 1;

    HederaBidEscrow internal escrow;
    MockUSDC internal usdc;

    address internal operator;
    address internal seller;
    address internal buyerA;
    address internal buyerB;

    bytes32 internal ref;
    bytes32 internal commitment;
    uint64 internal deadline;

    function setUp() public {
        operator = makeAddr("operator");
        seller = makeAddr("seller");
        buyerA = makeAddr("buyerA");
        buyerB = makeAddr("buyerB");

        usdc = new MockUSDC();
        escrow = new HederaBidEscrow(address(usdc), operator);

        ref = keccak256(abi.encode(uint256(296), address(0xBEEF), HEDERA_ID));
        commitment = keccak256(abi.encode(RESERVE, bytes32("salt")));
        deadline = uint64(block.timestamp + 1 hours);

        usdc.mint(buyerA, 1_000_000000);
        usdc.mint(buyerB, 1_000_000000);
    }

    function test_registerAndBid() public {
        _register();
        HederaBidEscrow.Auction memory listed = escrow.getAuction(ref);
        assertEq(uint256(listed.status), uint256(HederaBidEscrow.Status.Bidding));
        assertEq(listed.seller, seller);

        _approveAndBid(buyerA, BID_A);
        assertEq(usdc.balanceOf(address(escrow)), BID_A);
        assertEq(escrow.bids(ref, buyerA), BID_A);
    }

    function test_topUpKeepsSingleBidder() public {
        _register();
        _approveAndBid(buyerA, BID_A);
        _approveAndBid(buyerA, BID_A);
        (address[] memory bidders,) = escrow.getBids(ref);
        assertEq(bidders.length, 1);
        assertEq(escrow.bids(ref, buyerA), BID_A * 2);
    }

    function test_bidAfterDeadlineReverts() public {
        _register();
        vm.warp(deadline);
        _approve(buyerA, BID_A);
        vm.prank(buyerA);
        vm.expectRevert(HederaBidEscrow.AfterDeadline.selector);
        escrow.placeBid(ref, BID_A);
    }

    function test_awardConfirmAndWithdraw() public {
        _register();
        _approveAndBid(buyerA, BID_A);
        _approveAndBid(buyerB, BID_B);
        vm.warp(deadline);

        bytes32 digest = escrow.bidsDigest(ref);
        vm.prank(operator);
        escrow.awardByOperator(ref, buyerB, BID_B, commitment, 1, digest);

        HederaBidEscrow.Auction memory awarded = escrow.getAuction(ref);
        assertEq(uint256(awarded.status), uint256(HederaBidEscrow.Status.Awarded));
        assertEq(awarded.winner, buyerB);

        uint256 sellerBefore = usdc.balanceOf(seller);
        vm.prank(operator);
        escrow.confirmDelivery(ref, keccak256("hedera-settle"));
        assertEq(usdc.balanceOf(seller), sellerBefore + BID_B);

        uint256 aBefore = usdc.balanceOf(buyerA);
        vm.prank(buyerA);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerA), aBefore + BID_A);
    }

    function test_cancelLetsEveryoneWithdraw() public {
        _register();
        _approveAndBid(buyerA, BID_A);
        vm.prank(operator);
        escrow.cancelAuction(ref);

        uint256 before = usdc.balanceOf(buyerA);
        vm.prank(buyerA);
        escrow.withdraw(ref);
        assertEq(usdc.balanceOf(buyerA), before + BID_A);
    }

    function test_strangerCannotAward() public {
        _register();
        _approveAndBid(buyerB, BID_B);
        vm.warp(deadline);
        vm.prank(buyerA);
        vm.expectRevert(HederaBidEscrow.NotOperator.selector);
        escrow.awardByOperator(ref, buyerB, BID_B, commitment, 1, bytes32(0));
    }

    function test_associateUsdcDoesNotRevertOnMock() public {
        escrow.associateUsdc();
    }

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
}
