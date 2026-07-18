// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PaymentLedger {
    struct Payment {
        bytes32 orderId;
        uint256 amount;
        uint256 timestamp;
        string cardType;
        string ref;
    }

    address public owner;
    Payment[] public payments;
    mapping(bytes32 => uint256[]) private orderPaymentIndices;

    event PaymentRecorded(
        uint256 indexed paymentId,
        bytes32 indexed orderId,
        uint256 amount,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordPayment(
        bytes32 orderId,
        uint256 amount,
        string calldata cardType,
        string calldata ref_
    ) external {
        payments.push(Payment({
            orderId: orderId,
            amount: amount,
            timestamp: block.timestamp,
            cardType: cardType,
            ref: ref_
        }));

        uint256 paymentId = payments.length - 1;
        orderPaymentIndices[orderId].push(paymentId);

        emit PaymentRecorded(paymentId, orderId, amount, block.timestamp);
    }

    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }

    function getPayment(uint256 index) external view returns (Payment memory) {
        require(index < payments.length, "Payment not found");
        return payments[index];
    }

    function getOrderPaymentCount(bytes32 orderId) external view returns (uint256) {
        return orderPaymentIndices[orderId].length;
    }

    function getOrderPayments(bytes32 orderId) external view returns (Payment[] memory) {
        uint256[] memory indices = orderPaymentIndices[orderId];
        Payment[] memory result = new Payment[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            result[i] = payments[indices[i]];
        }
        return result;
    }
}
