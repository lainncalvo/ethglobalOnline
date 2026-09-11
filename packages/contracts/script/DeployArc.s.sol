// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {BidEscrow} from "../src/arc/BidEscrow.sol";

/// @notice Deploy BidEscrow to Arc testnet (chain 5042002).
/// Arc hangs txs below a 20 gwei base fee — always broadcast with
/// `--priority-gas-price 1gwei --with-gas-price 30gwei` (maxFeePerGas ≥ 30 gwei).
///
///   forge script script/DeployArc.s.sol --rpc-url arc --broadcast \
///     --priority-gas-price 1gwei --with-gas-price 30gwei
///
/// Env: ARC_USDC_ADDRESS, OPERATOR_ADDRESS, CRE_FORWARDER_ADDRESS, DEPLOYER_PRIVATE_KEY.
/// Do not deploy unless the operator is funded with USDC. Never print the key.
contract DeployArc is Script {
    uint256 internal constant MIN_FEE = 30 gwei;

    function run() external {
        address usdc = vm.envAddress("ARC_USDC_ADDRESS");
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        address forwarder = vm.envAddress("CRE_FORWARDER_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.txGasPrice(MIN_FEE);
        vm.startBroadcast(deployerKey);
        BidEscrow escrow = new BidEscrow(usdc, operator, forwarder);
        vm.stopBroadcast();

        console2.log("BidEscrow deployed");
        console2.logAddress(address(escrow));
        console2.log("USDC");
        console2.logAddress(usdc);
        console2.log("operator");
        console2.logAddress(operator);
        console2.log("forwarder");
        console2.logAddress(forwarder);
    }
}
