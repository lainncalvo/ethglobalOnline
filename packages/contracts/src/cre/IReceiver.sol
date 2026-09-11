// SPDX-License-Identifier: MIT
// Copied from smartcontractkit/cre-templates (vault-harvester). Keep the original header.
pragma solidity ^0.8.0;

import {IERC165} from "./IERC165.sol";

/// @title IReceiver - receives keystone reports
interface IReceiver is IERC165 {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
