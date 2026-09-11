// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ExitAuction} from "../src/hedera/ExitAuction.sol";

/// @notice Deploys ExitAuction on Hedera testnet (chain 296).
/// @dev Reads OPERATOR_ADDRESS and DEPLOYER_PRIVATE_KEY from env. Prints the
///      deployed address; write it to packages/shared/src/addresses.json in a
///      separate commit. Fallback if Hashio rejects estimation:
///      --legacy --slow --gas-estimate-multiplier 150
contract DeployHedera is Script {
    function run() external {
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        ExitAuction exitAuction = new ExitAuction(operator);
        vm.stopBroadcast();

        console.log("ExitAuction", address(exitAuction));
        console.log("operator", operator);
        console.log("owner", exitAuction.owner());
        console.log("chainid", block.chainid);
    }
}
