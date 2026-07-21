// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {OrderManager} from "../src/OrderManager.sol";

contract OrderManagerFuzzTest is Test {
    OrderManager internal manager;
    address internal collector = address(0x1234);
    address internal outsider = address(0x5678);

    function setUp() public {
        manager = new OrderManager();
        manager.addCollector(collector);
    }

    function testFuzz_CreateOrderStoresFields(
        string memory seed,
        uint256 clientCode,
        uint256 productCode,
        uint256 quantity,
        uint256 amount
    ) public {
        string memory orderCode = _orderCode(seed);
        clientCode = bound(clientCode, 1, type(uint32).max);
        productCode = bound(productCode, 1, type(uint32).max);
        quantity = bound(quantity, 1, 1_000_000);
        amount = bound(amount, 1, type(uint128).max);

        manager.createOrder(orderCode, clientCode, productCode, quantity, amount);

        bytes32 orderId = manager.getOrderId(orderCode);
        OrderManager.Order memory order = manager.getOrder(orderId);
        assertEq(uint256(order.status), uint256(OrderManager.OrderStatus.Generated));
        assertEq(order.clientCode, clientCode);
        assertEq(order.productCode, productCode);
        assertEq(order.quantity, quantity);
        assertEq(order.amount, amount);
        assertFalse(order.isPaid);
    }

    function testFuzz_CreateOrderRejectsZeroQuantity(
        string memory seed,
        uint256 clientCode,
        uint256 productCode,
        uint256 amount
    ) public {
        vm.expectRevert("Quantity must be positive");
        manager.createOrder(
            _orderCode(seed),
            bound(clientCode, 1, type(uint32).max),
            bound(productCode, 1, type(uint32).max),
            0,
            bound(amount, 1, type(uint128).max)
        );
    }

    function testFuzz_CreateOrderRejectsZeroAmount(
        string memory seed,
        uint256 clientCode,
        uint256 productCode,
        uint256 quantity
    ) public {
        vm.expectRevert("Amount must be positive");
        manager.createOrder(
            _orderCode(seed),
            bound(clientCode, 1, type(uint32).max),
            bound(productCode, 1, type(uint32).max),
            bound(quantity, 1, 1_000_000),
            0
        );
    }

    function testFuzz_OnlyOwnerCanAddCollector(address caller, address newCollector) public {
        vm.assume(caller != address(this));
        vm.assume(newCollector != address(0));

        vm.expectRevert("Only owner can call");
        vm.prank(caller);
        manager.addCollector(newCollector);
    }

    function testFuzz_OnlyOwnerCanRemoveCollector(address caller) public {
        vm.assume(caller != address(this));

        vm.expectRevert("Only owner can call");
        vm.prank(caller);
        manager.removeCollector(collector);
    }

    function testFuzz_OnlyOwnerOrCollectorCanTransition(address caller, string memory seed) public {
        vm.assume(caller != address(this) && caller != collector);
        string memory orderCode = _orderCode(seed);
        manager.createOrder(orderCode, 1, 1000, 1, 35);
        bytes32 orderId = manager.getOrderId(orderCode);

        vm.expectRevert("Only owner or collector");
        vm.prank(caller);
        manager.transitionToInProcess(orderId);
    }

    function testFuzz_CollectorCanTransition(string memory seed) public {
        string memory orderCode = _orderCode(seed);
        manager.createOrder(orderCode, 1, 1000, 1, 35);

        vm.prank(collector);
        manager.transitionToInProcess(manager.getOrderId(orderCode));

        assertEq(
            uint256(manager.getOrderStatus(manager.getOrderId(orderCode))), uint256(OrderManager.OrderStatus.InProcess)
        );
    }

    function testFuzz_OrderIdsRemainUniqueForDistinctCodes(string memory leftSeed, string memory rightSeed) public {
        string memory leftCode = _orderCode(leftSeed);
        string memory rightCode = _orderCode(rightSeed);
        vm.assume(keccak256(bytes(leftCode)) != keccak256(bytes(rightCode)));

        manager.createOrder(leftCode, 1, 1000, 1, 35);
        manager.createOrder(rightCode, 2, 1001, 2, 70);

        bytes32 leftId = manager.getOrderId(leftCode);
        bytes32 rightId = manager.getOrderId(rightCode);
        assertTrue(leftId != rightId);
        assertEq(manager.getOrder(leftId).clientCode, 1);
        assertEq(manager.getOrder(rightId).clientCode, 2);
    }

    function testFuzz_RecordPaymentRequiresExactAmount(string memory seed, uint256 paidAmount) public {
        string memory orderCode = _orderCode(seed);
        bytes32 orderId;
        uint256 orderAmount = 70;

        manager.createOrder(orderCode, 1, 1000, 1, orderAmount);
        orderId = manager.getOrderId(orderCode);
        paidAmount = bound(paidAmount, 1, type(uint128).max);
        vm.assume(paidAmount != orderAmount);

        vm.expectRevert("Amount must match order amount");
        manager.recordPayment(orderId, paidAmount);
    }

    function testFuzz_CancelledOrdersCannotBeModified(string memory seed, uint8 action, uint256 paymentAmount) public {
        string memory orderCode = _orderCode(seed);
        manager.createOrder(orderCode, 1, 1000, 1, 35);
        bytes32 orderId = manager.getOrderId(orderCode);
        manager.cancelOrder(orderId);

        if (action % 5 == 0) {
            vm.expectRevert("Must be Generated");
            manager.transitionToInProcess(orderId);
        } else if (action % 5 == 1) {
            vm.expectRevert("Must be InProcess");
            manager.transitionToDelivered(orderId);
        } else if (action % 5 == 2) {
            vm.expectRevert("Must be InProcess or Delivered");
            manager.transitionToInvoiced(orderId);
        } else if (action % 5 == 3) {
            vm.expectRevert("Can only cancel Generated or InProcess orders");
            manager.cancelOrder(orderId);
        } else {
            paymentAmount = bound(paymentAmount, 1, type(uint128).max);
            vm.expectRevert("Cancelled orders cannot be paid");
            manager.recordPayment(orderId, paymentAmount);
        }
    }

    function testFuzz_StatusTransitionMatrix(string memory seed, uint8 phase, uint8 action) public {
        string memory orderCode = _orderCode(seed);
        manager.createOrder(orderCode, 1, 1000, 1, 35);
        bytes32 orderId = manager.getOrderId(orderCode);
        _moveToPhase(orderId, phase % 5);

        uint8 selectedAction = action % 4;
        OrderManager.OrderStatus beforeStatus = manager.getOrder(orderId).status;

        if (beforeStatus == OrderManager.OrderStatus.Generated) {
            if (selectedAction == 0) {
                manager.transitionToInProcess(orderId);
                assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.InProcess));
                return;
            }
            if (selectedAction == 3) {
                manager.cancelOrder(orderId);
                assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Cancelled));
                return;
            }
        } else if (beforeStatus == OrderManager.OrderStatus.InProcess) {
            OrderManager.Order memory order = manager.getOrder(orderId);
            if (selectedAction == 1 && order.isPaid) {
                manager.transitionToDelivered(orderId);
                assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Delivered));
                return;
            }
            if (selectedAction == 2 && order.isPaid) {
                manager.transitionToInvoiced(orderId);
                assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Invoiced));
                return;
            }
            if (selectedAction == 3) {
                manager.cancelOrder(orderId);
                assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Cancelled));
                return;
            }
        } else if (beforeStatus == OrderManager.OrderStatus.Delivered && selectedAction == 2) {
            manager.transitionToInvoiced(orderId);
            assertEq(uint256(manager.getOrderStatus(orderId)), uint256(OrderManager.OrderStatus.Invoiced));
            return;
        }

        vm.expectRevert();
        if (selectedAction == 0) {
            manager.transitionToInProcess(orderId);
        } else if (selectedAction == 1) {
            manager.transitionToDelivered(orderId);
        } else if (selectedAction == 2) {
            manager.transitionToInvoiced(orderId);
        } else {
            manager.cancelOrder(orderId);
        }
    }

    function testFuzz_MaliciousCallerCannotBypassCollectorChecks(address caller, string memory seed) public {
        vm.assume(caller != address(this) && caller != collector && caller != outsider);
        string memory orderCode = _orderCode(seed);
        manager.createOrder(orderCode, 1, 1000, 1, 35);
        bytes32 orderId = manager.getOrderId(orderCode);

        vm.expectRevert("Only owner or collector");
        vm.prank(caller);
        manager.transitionToInProcess(orderId);
    }

    function _moveToPhase(bytes32 orderId, uint8 phase) internal {
        if (phase == 1) {
            manager.transitionToInProcess(orderId);
        } else if (phase == 2) {
            manager.transitionToInProcess(orderId);
            manager.recordPayment(orderId, 35);
        } else if (phase == 3) {
            manager.transitionToInProcess(orderId);
            manager.recordPayment(orderId, 35);
            manager.transitionToDelivered(orderId);
        } else if (phase == 4) {
            manager.cancelOrder(orderId);
        }
    }

    function _orderCode(string memory seed) internal pure returns (string memory) {
        bytes32 hash = keccak256(bytes(seed));
        return string.concat("PA-", vm.toString(uint256(hash)));
    }
}
