// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PaymentLedger} from "../src/PaymentLedger.sol";

contract PaymentLedgerTest is Test {
    PaymentLedger internal ledger;

    bytes32 internal constant ORDER_ID = keccak256("PA-SYN-0001");

    function setUp() public {
        ledger = new PaymentLedger();
    }

    function test_RecordPayment() public {
        ledger.recordPayment(ORDER_ID, 70, "DB", "REF-001");

        assertEq(ledger.getPaymentCount(), 1);
        PaymentLedger.Payment memory payment = ledger.getPayment(0);
        assertEq(payment.orderId, ORDER_ID);
        assertEq(payment.amount, 70);
        assertEq(payment.cardType, "DB");
        assertEq(payment.ref, "REF-001");
        assertGt(payment.timestamp, 0);
    }

    function test_RevertWhenOrderIdIsZero() public {
        vm.expectRevert("Order ID required");
        ledger.recordPayment(bytes32(0), 70, "DB", "REF-001");
    }

    function test_RevertWhenAmountIsZero() public {
        vm.expectRevert("Amount must be positive");
        ledger.recordPayment(ORDER_ID, 0, "DB", "REF-001");
    }

    function test_OrderPaymentsRemainAppendOnly() public {
        ledger.recordPayment(ORDER_ID, 70, "DB", "REF-001");
        ledger.recordPayment(ORDER_ID, 80, "CR", "REF-002");

        assertEq(ledger.getPaymentCount(), 2);
        assertEq(ledger.getOrderPaymentCount(ORDER_ID), 2);

        PaymentLedger.Payment memory first = ledger.getPayment(0);
        PaymentLedger.Payment memory second = ledger.getPayment(1);
        assertEq(first.amount, 70);
        assertEq(second.amount, 80);
    }
}
