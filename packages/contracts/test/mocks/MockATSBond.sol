// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IATSBond} from "../../src/interfaces/IATSBond.sol";

/// @notice Minimal ATS bond stand-in for ExitAuction unit tests.
contract MockATSBond is IATSBond {
    error AccountIsBlocked(address account);
    error InvalidKycStatus();
    error HoldNotFound();

    struct Hold {
        uint256 amount;
        uint256 expirationTimestamp;
        address escrow;
        address destination;
        bytes data;
        bytes operatorData;
        uint8 thirdPartyType;
        bool exists;
        bool released;
        bool executed;
    }

    struct Execution {
        bytes32 partition;
        address tokenHolder;
        uint256 holdId;
        address to;
        uint256 amount;
    }

    mapping(bytes32 => mapping(address => mapping(uint256 => Hold))) internal _holds;
    mapping(address => bool) public allowedRecipients;

    /// When set, `executeHoldByPartition` reverts with this selector.
    bytes4 public revertWith;
    /// When true, `releaseHoldByPartition` reverts.
    bool public releaseShouldRevert;

    Execution public lastExecution;
    bool public executed;

    event HoldByPartitionExecuted(
        address indexed tokenHolder, bytes32 partition, uint256 holdId, address to, uint256 amount
    );

    function setHold(
        bytes32 partition,
        address holder,
        uint256 holdId,
        uint256 amount,
        uint256 expirationTimestamp,
        address escrow,
        address destination
    ) external {
        _holds[partition][holder][holdId] = Hold({
            amount: amount,
            expirationTimestamp: expirationTimestamp,
            escrow: escrow,
            destination: destination,
            data: "",
            operatorData: "",
            thirdPartyType: 0,
            exists: true,
            released: false,
            executed: false
        });
    }

    function setAllowed(address to, bool ok) external {
        allowedRecipients[to] = ok;
    }

    function setRevertWith(bytes4 selector) external {
        revertWith = selector;
    }

    function setReleaseShouldRevert(bool should) external {
        releaseShouldRevert = should;
    }

    function isReleased(bytes32 partition, address holder, uint256 holdId) external view returns (bool) {
        return _holds[partition][holder][holdId].released;
    }

    function executeHoldByPartition(HoldIdentifier calldata hid, address to, uint256 amount)
        external
        override
        returns (bool success_, bytes32 partition_)
    {
        Hold storage h = _holds[hid.partition][hid.tokenHolder][hid.holdId];
        if (!h.exists) revert HoldNotFound();

        if (revertWith == AccountIsBlocked.selector) {
            revert AccountIsBlocked(to);
        }
        if (revertWith != bytes4(0)) {
            bytes4 sel = revertWith;
            assembly {
                mstore(0x00, sel)
                revert(0x00, 0x04)
            }
        }
        if (!allowedRecipients[to]) {
            revert AccountIsBlocked(to);
        }

        h.executed = true;
        lastExecution = Execution({
            partition: hid.partition,
            tokenHolder: hid.tokenHolder,
            holdId: hid.holdId,
            to: to,
            amount: amount
        });
        executed = true;
        emit HoldByPartitionExecuted(hid.tokenHolder, hid.partition, hid.holdId, to, amount);
        return (true, hid.partition);
    }

    function releaseHoldByPartition(HoldIdentifier calldata hid, uint256) external override returns (bool success_) {
        if (releaseShouldRevert) revert HoldNotFound();
        Hold storage h = _holds[hid.partition][hid.tokenHolder][hid.holdId];
        if (!h.exists) revert HoldNotFound();
        h.released = true;
        return true;
    }

    function getHoldForByPartition(HoldIdentifier calldata hid)
        external
        view
        override
        returns (
            uint256 amount_,
            uint256 expirationTimestamp_,
            address escrow_,
            address destination_,
            bytes memory data_,
            bytes memory operatorData_,
            uint8 thirdPartyType_
        )
    {
        Hold storage h = _holds[hid.partition][hid.tokenHolder][hid.holdId];
        if (!h.exists) revert HoldNotFound();
        return (h.amount, h.expirationTimestamp, h.escrow, h.destination, h.data, h.operatorData, h.thirdPartyType);
    }

    function canTransferByPartition(address, address to, bytes32, uint256, bytes calldata, bytes calldata)
        external
        view
        override
        returns (bool, bytes1, bytes32)
    {
        if (allowedRecipients[to]) {
            return (true, 0x00, bytes32(0));
        }
        return (false, 0x51, bytes32(InvalidKycStatus.selector));
    }
}
