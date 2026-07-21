// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PaymentLedger} from "../src/PaymentLedger.sol";

contract PaymentLedgerFuzzTest is Test {
    PaymentLedger internal ledger;

    function setUp() public {
        ledger = new PaymentLedger();
    }

    function testFuzz_RecordPaymentAppends(bytes32 orderId, uint256 amount, string memory cardType, string memory ref_)
        public
    {
        vm.assume(orderId != bytes32(0));
        amount = bound(amount, 1, type(uint128).max);

        ledger.recordPayment(orderId, amount, cardType, ref_);

        assertEq(ledger.getPaymentCount(), 1);
        PaymentLedger.Payment memory payment = ledger.getPayment(0);
        assertEq(payment.orderId, orderId);
        assertEq(payment.amount, amount);
        assertEq(payment.cardType, cardType);
        assertEq(payment.ref, ref_);
    }

    function testFuzz_RecordPaymentRejectsZeroOrderId(uint256 amount, string memory cardType, string memory ref_)
        public
    {
        amount = bound(amount, 1, type(uint128).max);
        vm.expectRevert("Order ID required");
        ledger.recordPayment(bytes32(0), amount, cardType, ref_);
    }

    function testFuzz_RecordPaymentRejectsZeroAmount(bytes32 orderId, string memory cardType, string memory ref_)
        public
    {
        vm.assume(orderId != bytes32(0));
        vm.expectRevert("Amount must be positive");
        ledger.recordPayment(orderId, 0, cardType, ref_);
    }

    function testFuzz_PaymentIdsRemainSequential(
        bytes32 leftOrderId,
        bytes32 rightOrderId,
        uint256 leftAmount,
        uint256 rightAmount
    ) public {
        vm.assume(leftOrderId != bytes32(0));
        vm.assume(rightOrderId != bytes32(0));
        leftAmount = bound(leftAmount, 1, type(uint128).max);
        rightAmount = bound(rightAmount, 1, type(uint128).max);

        ledger.recordPayment(leftOrderId, leftAmount, "DB", "LEFT");
        ledger.recordPayment(rightOrderId, rightAmount, "CR", "RIGHT");

        PaymentLedger.Payment memory first = ledger.getPayment(0);
        PaymentLedger.Payment memory second = ledger.getPayment(1);
        assertEq(ledger.getPaymentCount(), 2);
        assertEq(first.orderId, leftOrderId);
        assertEq(second.orderId, rightOrderId);
    }

    function testFuzz_OrderPaymentPartitionsStayConsistent(
        bytes32 orderA,
        bytes32 orderB,
        uint256 amountA,
        uint256 amountB
    ) public {
        vm.assume(orderA != bytes32(0));
        vm.assume(orderB != bytes32(0));
        vm.assume(orderA != orderB);
        amountA = bound(amountA, 1, type(uint128).max);
        amountB = bound(amountB, 1, type(uint128).max);

        ledger.recordPayment(orderA, amountA, "DB", "A1");
        ledger.recordPayment(orderB, amountB, "CR", "B1");
        ledger.recordPayment(orderA, amountA + 1, "DB", "A2");

        assertEq(ledger.getOrderPaymentCount(orderA), 2);
        assertEq(ledger.getOrderPaymentCount(orderB), 1);

        PaymentLedger.Payment[] memory paymentsA = ledger.getOrderPayments(orderA);
        PaymentLedger.Payment[] memory paymentsB = ledger.getOrderPayments(orderB);
        assertEq(paymentsA[0].orderId, orderA);
        assertEq(paymentsA[1].orderId, orderA);
        assertEq(paymentsB[0].orderId, orderB);
    }
}
