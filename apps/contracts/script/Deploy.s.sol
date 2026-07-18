// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {OrderManager} from "../src/OrderManager.sol";
import {PaymentLedger} from "../src/PaymentLedger.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        OrderManager orderManager = new OrderManager();
        PaymentLedger paymentLedger = new PaymentLedger();

        vm.stopBroadcast();

        console.log("OrderManager deployed at:", address(orderManager));
        console.log("PaymentLedger deployed at:", address(paymentLedger));
    }
}
