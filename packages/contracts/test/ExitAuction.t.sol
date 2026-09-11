// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ExitAuction} from "../src/hedera/ExitAuction.sol";
import {MockATSBond} from "./mocks/MockATSBond.sol";

contract ExitAuctionTest is Test {
    ExitAuction internal auction;
    MockATSBond internal bond;

    address internal operator = address(0xA11CE);
    address internal seller = address(0x5E11E4);
    address internal buyerA = address(0xA);
    address internal buyerC = address(0xC);
    address internal stranger = address(0xB0B);

    bytes32 internal constant PARTITION = bytes32(uint256(1));
    uint256 internal constant AMOUNT = 10;
    uint64 internal constant MIN_DURATION = 2 minutes;
    uint64 internal constant SETTLE_GRACE = 72 hours;
    bytes32 internal constant RESERVE = keccak256(abi.encode(uint256(14_000_000_000), bytes32("salt")));

    event AuctionSettled(uint256 indexed id, bytes32 indexed ref, address indexed winner, uint256 amount);
    event AuctionCancelled(uint256 indexed id, bytes32 indexed ref, address by, bool holdReleased);

    function setUp() public {
        bond = new MockATSBond();
        auction = new ExitAuction(operator);
        bond.setAllowed(buyerA, true);
    }

    function _seedHold(uint256 holdId, address escrow, address destination, uint256 amount, uint256 expiration)
        internal
    {
        bond.setHold(PARTITION, seller, holdId, amount, expiration, escrow, destination);
    }

    function _validDeadline() internal view returns (uint64) {
        return uint64(block.timestamp + MIN_DURATION + 1);
    }

    function _validExpiration(uint64 deadline) internal pure returns (uint256) {
        return uint256(deadline) + SETTLE_GRACE + 1 hours;
    }

    function _list(uint256 holdId) internal returns (uint256 id, bytes32 ref, uint64 deadline) {
        deadline = _validDeadline();
        _seedHold(holdId, address(auction), address(0), AMOUNT, _validExpiration(deadline));
        vm.prank(seller);
        (id, ref) = auction.createAuction(address(bond), PARTITION, holdId, AMOUNT, deadline, RESERVE);
    }

    // 1
    function test_happyPath_createWarpSettle() public {
        (uint256 id, bytes32 ref, uint64 deadline) = _list(1);
        vm.warp(deadline);
        vm.expectEmit(true, true, true, true);
        emit AuctionSettled(id, ref, buyerA, AMOUNT);
        vm.prank(operator);
        auction.settle(id, buyerA);

        ExitAuction.Auction memory a = auction.getAuction(id);
        assertEq(uint256(a.status), uint256(ExitAuction.Status.Settled));
        assertEq(a.winner, buyerA);
        assertTrue(bond.executed());
        (,, uint256 holdId, address to, uint256 amt) = bond.lastExecution();
        assertEq(holdId, 1);
        assertEq(to, buyerA);
        assertEq(amt, AMOUNT);
    }

    // 2
    function test_create_holdEscrowNotThis() public {
        uint64 deadline = _validDeadline();
        _seedHold(1, address(0xE5C), address(0), AMOUNT, _validExpiration(deadline));
        vm.prank(seller);
        vm.expectRevert(ExitAuction.HoldNotForThisEscrow.selector);
        auction.createAuction(address(bond), PARTITION, 1, AMOUNT, deadline, RESERVE);
    }

    // 3
    function test_create_holdHasFixedDestination() public {
        uint64 deadline = _validDeadline();
        _seedHold(1, address(auction), buyerA, AMOUNT, _validExpiration(deadline));
        vm.prank(seller);
        vm.expectRevert(ExitAuction.HoldHasFixedDestination.selector);
        auction.createAuction(address(bond), PARTITION, 1, AMOUNT, deadline, RESERVE);
    }

    // 4
    function test_create_amountMismatch() public {
        uint64 deadline = _validDeadline();
        _seedHold(1, address(auction), address(0), AMOUNT, _validExpiration(deadline));
        vm.prank(seller);
        vm.expectRevert(ExitAuction.HoldAmountMismatch.selector);
        auction.createAuction(address(bond), PARTITION, 1, AMOUNT + 1, deadline, RESERVE);
    }

    // 5
    function test_create_holdExpiresTooEarly() public {
        uint64 deadline = _validDeadline();
        uint256 expiration = uint256(deadline) + SETTLE_GRACE - 1;
        _seedHold(1, address(auction), address(0), AMOUNT, expiration);
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(ExitAuction.HoldExpiresTooEarly.selector, expiration, uint256(deadline) + SETTLE_GRACE)
        );
        auction.createAuction(address(bond), PARTITION, 1, AMOUNT, deadline, RESERVE);
    }

    // 6
    function test_create_sameHoldTwice() public {
        _list(1);
        uint64 deadline = _validDeadline();
        vm.prank(seller);
        vm.expectRevert(ExitAuction.AlreadyListed.selector);
        auction.createAuction(address(bond), PARTITION, 1, AMOUNT, deadline, RESERVE);
    }

    // 7
    function test_create_deadlineTooSoon() public {
        uint64 deadline = uint64(block.timestamp + MIN_DURATION - 1);
        _seedHold(1, address(auction), address(0), AMOUNT, _validExpiration(deadline));
        vm.prank(seller);
        vm.expectRevert(ExitAuction.DeadlineTooSoon.selector);
        auction.createAuction(address(bond), PARTITION, 1, AMOUNT, deadline, RESERVE);
    }

    // 8
    function test_settle_beforeDeadline() public {
        (uint256 id,, uint64 deadline) = _list(1);
        vm.warp(deadline - 1);
        vm.prank(operator);
        vm.expectRevert(ExitAuction.BeforeDeadline.selector);
        auction.settle(id, buyerA);
    }

    // 9
    function test_settle_notOperator() public {
        (uint256 id,, uint64 deadline) = _list(1);
        vm.warp(deadline);
        vm.prank(stranger);
        vm.expectRevert(ExitAuction.NotOperator.selector);
        auction.settle(id, buyerA);
    }

    // 10
    function test_settle_accountIsBlockedBubbles() public {
        (uint256 id,, uint64 deadline) = _list(1);
        bond.setRevertWith(MockATSBond.AccountIsBlocked.selector);
        vm.warp(deadline);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(MockATSBond.AccountIsBlocked.selector, buyerC));
        auction.settle(id, buyerC);

        ExitAuction.Auction memory a = auction.getAuction(id);
        assertEq(uint256(a.status), uint256(ExitAuction.Status.Open));
        assertEq(a.winner, address(0));
        assertFalse(bond.executed());
    }

    // 11
    function test_settle_twice() public {
        (uint256 id,, uint64 deadline) = _list(1);
        vm.warp(deadline);
        vm.prank(operator);
        auction.settle(id, buyerA);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(ExitAuction.BadStatus.selector, ExitAuction.Status.Settled));
        auction.settle(id, buyerA);
    }

    // 12
    function test_cancel_sellerBeforeDeadline() public {
        (uint256 id, bytes32 ref,) = _list(1);
        vm.expectEmit(true, true, false, true);
        emit AuctionCancelled(id, ref, seller, true);
        vm.prank(seller);
        auction.cancel(id);

        ExitAuction.Auction memory a = auction.getAuction(id);
        assertEq(uint256(a.status), uint256(ExitAuction.Status.Cancelled));
        assertTrue(bond.isReleased(PARTITION, seller, 1));
    }

    // 13
    function test_cancel_sellerAfterDeadline() public {
        (uint256 id,, uint64 deadline) = _list(1);
        vm.warp(deadline);
        vm.prank(seller);
        vm.expectRevert(ExitAuction.AfterDeadline.selector);
        auction.cancel(id);
    }

    // 14
    function test_cancel_operatorAfterDeadline() public {
        (uint256 id,, uint64 deadline) = _list(1);
        vm.warp(deadline + 1);
        vm.prank(operator);
        auction.cancel(id);
        assertEq(uint256(auction.getAuction(id).status), uint256(ExitAuction.Status.Cancelled));
    }

    // 15
    function test_cancel_releaseRevertsStillCancelled() public {
        (uint256 id, bytes32 ref,) = _list(1);
        bond.setReleaseShouldRevert(true);
        vm.expectEmit(true, true, false, true);
        emit AuctionCancelled(id, ref, seller, false);
        vm.prank(seller);
        auction.cancel(id);
        assertEq(uint256(auction.getAuction(id).status), uint256(ExitAuction.Status.Cancelled));
        assertFalse(bond.isReleased(PARTITION, seller, 1));
    }

    // 16
    function test_cancel_thirdParty() public {
        (uint256 id,,) = _list(1);
        vm.prank(stranger);
        vm.expectRevert(ExitAuction.NotOperator.selector);
        auction.cancel(id);
    }

    // 17
    function test_previewSettle_passthrough() public {
        (uint256 id,,) = _list(1);
        (bool okA, bytes1 codeA, bytes32 reasonA) = auction.previewSettle(id, buyerA);
        assertTrue(okA);
        assertEq(codeA, bytes1(0x00));
        assertEq(reasonA, bytes32(0));

        (bool okC, bytes1 codeC, bytes32 reasonC) = auction.previewSettle(id, buyerC);
        assertFalse(okC);
        assertEq(codeC, bytes1(0x51));
        assertEq(reasonC, bytes32(MockATSBond.InvalidKycStatus.selector));
    }

    // 18
    function test_computeRef_hederaChainId() public {
        vm.chainId(296);
        auction = new ExitAuction(operator);
        bond = new MockATSBond();
        bond.setAllowed(buyerA, true);
        (uint256 id, bytes32 ref,) = _list(1);
        bytes32 expected = keccak256(abi.encode(uint256(296), address(auction), id));
        assertEq(ref, expected);
        assertEq(auction.computeRef(id), expected);
        assertEq(auction.getAuction(id).ref, expected);
        assertEq(auction.idByRef(ref), id);
    }
}
