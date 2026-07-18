export const ORDER_MANAGER_ABI = [
  { type: "event", name: "PaymentRecorded", inputs: [
    { name: "orderId", type: "bytes32", indexed: true, internalType: "bytes32" },
    { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
  ], anonymous: false },
  { type: "event", name: "OrderCreated", inputs: [
    { name: "orderId", type: "bytes32", indexed: true, internalType: "bytes32" },
    { name: "orderCode", type: "string", indexed: false, internalType: "string" },
    { name: "clientCode", type: "uint256", indexed: false, internalType: "uint256" },
    { name: "productCode", type: "uint256", indexed: false, internalType: "uint256" },
    { name: "quantity", type: "uint256", indexed: false, internalType: "uint256" },
    { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
  ], anonymous: false },
  { type: "event", name: "OrderStatusTransitioned", inputs: [
    { name: "orderId", type: "bytes32", indexed: true, internalType: "bytes32" },
    { name: "from", type: "uint8", indexed: false, internalType: "enum OrderManager.OrderStatus" },
    { name: "to", type: "uint8", indexed: false, internalType: "enum OrderManager.OrderStatus" },
    { name: "triggeredBy", type: "address", indexed: false, internalType: "address" },
  ], anonymous: false },
  { type: "function", name: "getOrder", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }], outputs: [
    { name: "status", type: "uint8", internalType: "enum OrderManager.OrderStatus" },
    { name: "clientCode", type: "uint256", internalType: "uint256" },
    { name: "productCode", type: "uint256", internalType: "uint256" },
    { name: "quantity", type: "uint256", internalType: "uint256" },
    { name: "amount", type: "uint256", internalType: "uint256" },
    { name: "isPaid", type: "bool", internalType: "bool" },
    { name: "createdAt", type: "uint256", internalType: "uint256" },
    { name: "paidAt", type: "uint256", internalType: "uint256" },
    { name: "exists", type: "bool", internalType: "bool" },
  ], stateMutability: "view" },
  { type: "function", name: "transitionToDelivered", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transitionToInProcess", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transitionToInvoiced", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancelOrder", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getOrderStatus", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }], outputs: [{ name: "", type: "uint8", internalType: "enum OrderManager.OrderStatus" }], stateMutability: "view" },
  { type: "function", name: "recordPayment", inputs: [{ name: "orderId", type: "bytes32", internalType: "bytes32" }, { name: "amount", type: "uint256", internalType: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export enum OrderStatus {
  None,
  Generated,
  InProcess,
  Delivered,
  Cancelled,
  Invoiced,
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.None]: "None",
  [OrderStatus.Generated]: "generado",
  [OrderStatus.InProcess]: "proceso",
  [OrderStatus.Delivered]: "entregado",
  [OrderStatus.Cancelled]: "cancelado",
  [OrderStatus.Invoiced]: "facturado",
};
