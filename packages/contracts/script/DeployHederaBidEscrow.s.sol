// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {HederaBidEscrow} from "../src/hedera/HederaBidEscrow.sol";

/// @notice Deploys HederaBidEscrow on Hedera testnet (chain 296).
/// @dev Env: HEDERA_USDC_ADDRESS (HTS 0.0.429274 EVM), OPERATOR_ADDRESS, DEPLOYER_PRIVATE_KEY.
///      Does not deploy ExitAuction. Write the address to addresses.json in a separate commit.
contract DeployHederaBidEscrow is Script {
    function run() external {
        address usdc = vm.envAddress("HEDERA_USDC_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        HederaBidEscrow escrow = new HederaBidEscrow(usdc, operator);
        vm.stopBroadcast();

        console.log("HederaBidEscrow", address(escrow));
        console.log("usdc", usdc);
        console.log("operator", operator);
        console.log("chainid", block.chainid);
    }
}
