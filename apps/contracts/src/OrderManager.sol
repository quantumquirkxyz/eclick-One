// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract OrderManager {
    enum OrderStatus { None, Generated, InProcess, Delivered, Cancelled, Invoiced }

    struct Order {
        OrderStatus status;
        uint256 clientCode;
        uint256 productCode;
        uint256 quantity;
        uint256 amount;
        bool isPaid;
        uint256 createdAt;
        uint256 paidAt;
        bool exists;
    }

    bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(bytes32 => Order) public orders;
    address public owner;
    mapping(address => bool) public collectors;

    event OrderCreated(
        bytes32 indexed orderId,
        string orderCode,
        uint256 clientCode,
        uint256 productCode,
        uint256 quantity,
        uint256 amount
    );
    event OrderStatusTransitioned(
        bytes32 indexed orderId,
        OrderStatus from,
        OrderStatus to,
        address triggeredBy
    );
    event PaymentRecorded(bytes32 indexed orderId, uint256 amount);
    event CollectorAdded(address indexed collector);
    event CollectorRemoved(address indexed collector);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyCollector() {
        require(collectors[msg.sender], "Only collector can call");
        _;
    }

    modifier onlyOwnerOrCollector() {
        require(msg.sender == owner || collectors[msg.sender], "Only owner or collector");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addCollector(address collector) external onlyOwner {
        require(collector != address(0), "Invalid address");
        collectors[collector] = true;
        emit CollectorAdded(collector);
    }

    function removeCollector(address collector) external onlyOwner {
        require(collectors[collector], "Not a collector");
        collectors[collector] = false;
        emit CollectorRemoved(collector);
    }

    function createOrder(
        string calldata orderCode,
        uint256 clientCode,
        uint256 productCode,
        uint256 quantity,
        uint256 amount
    ) external {
        bytes32 orderId = keccak256(bytes(orderCode));
        require(!orders[orderId].exists, "Order already exists");

        orders[orderId] = Order({
            status: OrderStatus.Generated,
            clientCode: clientCode,
            productCode: productCode,
            quantity: quantity,
            amount: amount,
            isPaid: false,
            createdAt: block.timestamp,
            paidAt: 0,
            exists: true
        });

        emit OrderCreated(orderId, orderCode, clientCode, productCode, quantity, amount);
    }

    function transitionToInProcess(bytes32 orderId) external onlyOwnerOrCollector {
        Order storage order = orders[orderId];
        require(order.exists, "Order not found");
        require(order.status == OrderStatus.Generated, "Must be Generated");

        OrderStatus from = order.status;
        order.status = OrderStatus.InProcess;
        emit OrderStatusTransitioned(orderId, from, OrderStatus.InProcess, msg.sender);
    }

    function transitionToDelivered(bytes32 orderId) external onlyOwnerOrCollector {
        Order storage order = orders[orderId];
        require(order.exists, "Order not found");

        if (order.status == OrderStatus.InProcess) {
            require(order.isPaid, "Order must be paid before delivery");
        } else {
            revert("Must be InProcess");
        }

        OrderStatus from = order.status;
        order.status = OrderStatus.Delivered;
        emit OrderStatusTransitioned(orderId, from, OrderStatus.Delivered, msg.sender);
    }

    function transitionToInvoiced(bytes32 orderId) external onlyOwnerOrCollector {
        Order storage order = orders[orderId];
        require(order.exists, "Order not found");

        if (order.status == OrderStatus.InProcess) {
            require(order.isPaid, "Order must be paid before invoicing");
        } else if (order.status == OrderStatus.Delivered) {
            require(order.isPaid, "Order must be paid before invoicing");
        } else {
            revert("Must be InProcess or Delivered");
        }

        OrderStatus from = order.status;
        order.status = OrderStatus.Invoiced;
        emit OrderStatusTransitioned(orderId, from, OrderStatus.Invoiced, msg.sender);
    }

    function cancelOrder(bytes32 orderId) external onlyOwnerOrCollector {
        Order storage order = orders[orderId];
        require(order.exists, "Order not found");
        require(
            order.status == OrderStatus.Generated || order.status == OrderStatus.InProcess,
            "Can only cancel Generated or InProcess orders"
        );

        OrderStatus from = order.status;
        order.status = OrderStatus.Cancelled;
        emit OrderStatusTransitioned(orderId, from, OrderStatus.Cancelled, msg.sender);
    }

    function recordPayment(bytes32 orderId, uint256 amount) external {
        Order storage order = orders[orderId];
        require(order.exists, "Order not found");
        require(!order.isPaid, "Already paid");
        require(amount == order.amount, "Amount must match order amount");

        order.isPaid = true;
        order.paidAt = block.timestamp;

        emit PaymentRecorded(orderId, amount);
    }

    function getOrderStatus(bytes32 orderId) external view returns (OrderStatus) {
        require(orders[orderId].exists, "Order not found");
        return orders[orderId].status;
    }

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        require(orders[orderId].exists, "Order not found");
        return orders[orderId];
    }

    function getOrderId(string calldata orderCode) external pure returns (bytes32) {
        return keccak256(bytes(orderCode));
    }
}
