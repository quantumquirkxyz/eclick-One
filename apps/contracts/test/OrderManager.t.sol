// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {OrderManager} from "../src/OrderManager.sol";

contract OrderManagerTest is Test {
    OrderManager public manager;
    address public owner;
    address public collector;
    address public user;

    string constant ORDER_CODE = "PA-SYN-0001";
    bytes32 orderId;

    function setUp() public {
        owner = address(this);
        collector = address(0x1234);
        user = address(0x5678);

        manager = new OrderManager();
        manager.addCollector(collector);

        orderId = keccak256(bytes(ORDER_CODE));
    }

    function test_CreateOrder() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);

        OrderManager.Order memory order = manager.getOrder(orderId);
        assertEq(uint256(order.status), uint256(OrderManager.OrderStatus.Generated));
        assertEq(order.clientCode, 1);
        assertEq(order.productCode, 1000);
        assertEq(order.quantity, 2);
        assertEq(order.amount, 70);
        assertFalse(order.isPaid);
    }

    function test_DuplicateOrder() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        vm.expectRevert("Order already exists");
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
    }

    function test_TransitionGeneratedToInProcess() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.InProcess));
    }

    function test_TransitionInProcessToDeliveredAfterPayment() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);
        manager.recordPayment(orderId, 70);
        manager.transitionToDelivered(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Delivered));
    }

    function test_CannotDeliverBeforePayment() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);

        vm.expectRevert("Order must be paid before delivery");
        manager.transitionToDelivered(orderId);
    }

    function test_CancelGenerated() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.cancelOrder(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Cancelled));
    }

    function test_CancelInProcess() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);
        manager.cancelOrder(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Cancelled));
    }

    function test_CannotCancelDelivered() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);
        manager.recordPayment(orderId, 70);
        manager.transitionToDelivered(orderId);

        vm.expectRevert("Can only cancel Generated or InProcess orders");
        manager.cancelOrder(orderId);
    }

    function test_CollectorCanTransition() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);

        vm.prank(collector);
        manager.transitionToInProcess(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.InProcess));
    }

    function test_UserCannotTransition() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);

        vm.prank(user);
        vm.expectRevert("Only owner or collector");
        manager.transitionToInProcess(orderId);
    }

    function test_PaymentWrongAmount() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);

        vm.expectRevert("Amount must match order amount");
        manager.recordPayment(orderId, 50);
    }

    function test_DuplicatePayment() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.recordPayment(orderId, 70);

        vm.expectRevert("Already paid");
        manager.recordPayment(orderId, 70);
    }

    function test_TransitionToInvoicedAfterDelivered() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);
        manager.recordPayment(orderId, 70);
        manager.transitionToDelivered(orderId);
        manager.transitionToInvoiced(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Invoiced));
    }

    function test_TransitionToInvoicedFromInProcess() public {
        manager.createOrder(ORDER_CODE, 1, 1000, 2, 70);
        manager.transitionToInProcess(orderId);
        manager.recordPayment(orderId, 70);
        manager.transitionToInvoiced(orderId);

        assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Invoiced));
    }

    function test_AddRemoveCollector() public {
        address newCollector = address(0x9999);
        manager.addCollector(newCollector);
        assertTrue(manager.collectors(newCollector));

        manager.removeCollector(newCollector);
        assertFalse(manager.collectors(newCollector));
    }

    function test_OnlyOwnerCanAddCollector() public {
        vm.prank(user);
        vm.expectRevert("Only owner can call");
        manager.addCollector(user);
    }
}
