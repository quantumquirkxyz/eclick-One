// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {OrderManager} from "../src/OrderManager.sol";
import {PaymentLedger} from "../src/PaymentLedger.sol";

contract OrderManagerHandler is Test {
    OrderManager internal manager;
    bytes32[] internal trackedOrderIds;
    mapping(bytes32 => bool) internal seenOrderIds;

    uint256 internal nonce;

    constructor(OrderManager _manager) {
        manager = _manager;
    }

    function createOrder(uint256 clientCode, uint256 productCode, uint256 quantity, uint256 amount) external {
        clientCode = bound(clientCode, 1, type(uint32).max);
        productCode = bound(productCode, 1, type(uint32).max);
        quantity = bound(quantity, 1, 1000);
        amount = bound(amount, 1, type(uint128).max);
        string memory orderCode = string.concat("INV-", vm.toString(++nonce));
        manager.createOrder(orderCode, clientCode, productCode, quantity, amount);
        bytes32 orderId = manager.getOrderId(orderCode);
        if (!seenOrderIds[orderId]) {
            trackedOrderIds.push(orderId);
            seenOrderIds[orderId] = true;
        }
    }

    function transitionToInProcess(uint256 index) external {
        bytes32 orderId = _orderIdAt(index);
        if (orderId != bytes32(0)) {
            try manager.transitionToInProcess(orderId) {} catch {}
        }
    }

    function recordPayment(uint256 index) external {
        bytes32 orderId = _orderIdAt(index);
        if (orderId != bytes32(0)) {
            try manager.getOrder(orderId) returns (OrderManager.Order memory order) {
                try manager.recordPayment(orderId, order.amount) {} catch {}
            } catch {}
        }
    }

    function transitionToDelivered(uint256 index) external {
        bytes32 orderId = _orderIdAt(index);
        if (orderId != bytes32(0)) {
            try manager.transitionToDelivered(orderId) {} catch {}
        }
    }

    function transitionToInvoiced(uint256 index) external {
        bytes32 orderId = _orderIdAt(index);
        if (orderId != bytes32(0)) {
            try manager.transitionToInvoiced(orderId) {} catch {}
        }
    }

    function cancelOrder(uint256 index) external {
        bytes32 orderId = _orderIdAt(index);
        if (orderId != bytes32(0)) {
            try manager.cancelOrder(orderId) {} catch {}
        }
    }

    function trackedLength() external view returns (uint256) {
        return trackedOrderIds.length;
    }

    function trackedOrderId(uint256 index) external view returns (bytes32) {
        return trackedOrderIds[index];
    }

    function _orderIdAt(uint256 index) internal view returns (bytes32) {
        if (trackedOrderIds.length == 0) {
            return bytes32(0);
        }
        return trackedOrderIds[index % trackedOrderIds.length];
    }
}

contract PaymentLedgerHandler is Test {
    PaymentLedger internal ledger;
    bytes32[] internal trackedOrderIds;
    mapping(bytes32 => bool) internal seenOrderIds;

    constructor(PaymentLedger _ledger) {
        ledger = _ledger;
    }

    function recordPayment(bytes32 orderId, uint256 amount) external {
        vm.assume(orderId != bytes32(0));
        amount = bound(amount, 1, type(uint128).max);
        ledger.recordPayment(orderId, amount, "DB", "INV");
        if (!seenOrderIds[orderId]) {
            trackedOrderIds.push(orderId);
            seenOrderIds[orderId] = true;
        }
    }

    function trackedLength() external view returns (uint256) {
        return trackedOrderIds.length;
    }

    function trackedOrderId(uint256 index) external view returns (bytes32) {
        return trackedOrderIds[index];
    }
}

contract ContractInvariants is StdInvariant, Test {
    OrderManager internal manager;
    PaymentLedger internal ledger;
    OrderManagerHandler internal orderHandler;
    PaymentLedgerHandler internal paymentHandler;

    function setUp() public {
        manager = new OrderManager();
        ledger = new PaymentLedger();
        orderHandler = new OrderManagerHandler(manager);
        paymentHandler = new PaymentLedgerHandler(ledger);

        targetContract(address(orderHandler));
        targetContract(address(paymentHandler));
    }

    function invariant_OrderStatusesStayReachableAndPaidOrdersTrackTimestamps() public view {
        uint256 tracked = orderHandler.trackedLength();
        for (uint256 i = 0; i < tracked; i++) {
            bytes32 orderId = orderHandler.trackedOrderId(i);
            OrderManager.Order memory order = manager.getOrder(orderId);
            assertTrue(order.exists);
            assertTrue(uint256(order.status) >= uint256(OrderManager.OrderStatus.Generated));
            assertTrue(uint256(order.status) <= uint256(OrderManager.OrderStatus.Invoiced));
            if (order.status == OrderManager.OrderStatus.Delivered || order.status == OrderManager.OrderStatus.Invoiced)
            {
                assertTrue(order.isPaid);
            }
            if (order.isPaid) {
                assertGt(order.paidAt, 0);
                assertGe(order.paidAt, order.createdAt);
                assertGt(order.amount, 0);
            }
        }
    }

    function invariant_PaymentLedgerEntriesStayAppendOnlyAndValid() public view {
        uint256 paymentCount = ledger.getPaymentCount();
        for (uint256 i = 0; i < paymentCount; i++) {
            PaymentLedger.Payment memory payment = ledger.getPayment(i);
            assertTrue(payment.orderId != bytes32(0));
            assertGt(payment.amount, 0);
            assertGt(payment.timestamp, 0);
        }

        uint256 tracked = paymentHandler.trackedLength();
        uint256 totalPartitionedPayments = 0;
        for (uint256 i = 0; i < tracked; i++) {
            totalPartitionedPayments += ledger.getOrderPaymentCount(paymentHandler.trackedOrderId(i));
        }
        assertEq(totalPartitionedPayments, paymentCount);
    }
}
