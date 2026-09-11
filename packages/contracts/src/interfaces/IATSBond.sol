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
