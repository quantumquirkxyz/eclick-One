export const orderManagerAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "COLLECTOR_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addCollector",
    "inputs": [
      {
        "name": "collector",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelOrder",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "collectors",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createOrder",
    "inputs": [
      {
        "name": "orderCode",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "clientCode",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "productCode",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "quantity",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getOrder",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct OrderManager.Order",
        "components": [
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum OrderManager.OrderStatus"
          },
          {
            "name": "clientCode",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "productCode",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "quantity",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "isPaid",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "paidAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "exists",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOrderId",
    "inputs": [
      {
        "name": "orderCode",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getOrderStatus",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum OrderManager.OrderStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "orders",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum OrderManager.OrderStatus"
      },
      {
        "name": "clientCode",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "productCode",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "quantity",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "isPaid",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "createdAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "paidAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "exists",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recordPayment",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeCollector",
    "inputs": [
      {
        "name": "collector",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transitionToDelivered",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transitionToInProcess",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transitionToInvoiced",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "CollectorAdded",
    "inputs": [
      {
        "name": "collector",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CollectorRemoved",
    "inputs": [
      {
        "name": "collector",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OrderCreated",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "orderCode",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "clientCode",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "productCode",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "quantity",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OrderStatusTransitioned",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "from",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum OrderManager.OrderStatus"
      },
      {
        "name": "to",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum OrderManager.OrderStatus"
      },
      {
        "name": "triggeredBy",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PaymentRecorded",
    "inputs": [
      {
        "name": "orderId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
] as const;
