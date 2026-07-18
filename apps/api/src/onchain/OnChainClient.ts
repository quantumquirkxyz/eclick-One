import { createPublicClient, createWalletClient, http, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { orderManagerAbi } from "../abi/OrderManager";
import { paymentLedgerAbi } from "../abi/PaymentLedger";

export interface OnChainConfig {
  rpcUrl: string;
  chainId: number;
  orderManagerAddress: Address;
  paymentLedgerAddress: Address;
  collectorPrivateKey: string;
}

function keccak256(input: string): Hash {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buffer = crypto.subtle ? undefined : undefined;
  let hash: string;
  if (typeof Bun !== "undefined") {
    const bytes = new Bun.CryptoHasher("sha256").update(data).digest();
    hash = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    hash = "";
  }
  return `0x${hash}` as Hash;
}

export class OnChainClient {
  private walletClient;
  private publicClient;
  private account;

  constructor(private config: OnChainConfig) {
    this.account = privateKeyToAccount(config.collectorPrivateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: foundry,
      transport: http(config.rpcUrl),
    });
    this.publicClient = createPublicClient({
      chain: foundry,
      transport: http(config.rpcUrl),
    });
  }

  private orderId(orderCode: string): Hash {
    const encoder = new TextEncoder();
    const data = encoder.encode(orderCode);
    const hash = new Bun.CryptoHasher("sha256").update(data).digest();
    return `0x${Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hash;
  }

  async createOrderOnChain(
    orderCode: string,
    clientCode: number,
    productCode: number,
    quantity: number,
    amount: number,
  ): Promise<Hash> {
    const orderId = this.orderId(orderCode);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "createOrder",
      args: [orderCode, BigInt(clientCode), BigInt(productCode), BigInt(quantity), BigInt(amount)],
      account: this.account,
    });
    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async recordPaymentOnChain(orderCode: string, amount: number): Promise<Hash> {
    const orderId = this.orderId(orderCode);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "recordPayment",
      args: [orderId, BigInt(amount)],
      account: this.account,
    });
    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async transitionToInProcess(orderCode: string): Promise<Hash> {
    const orderId = this.orderId(orderCode);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "transitionToInProcess",
      args: [orderId],
      account: this.account,
    });
    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async transitionToDelivered(orderCode: string): Promise<Hash> {
    const orderId = this.orderId(orderCode);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "transitionToDelivered",
      args: [orderId],
      account: this.account,
    });
    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async transitionToInvoiced(orderCode: string): Promise<Hash> {
    const orderId = this.orderId(orderCode);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "transitionToInvoiced",
      args: [orderId],
      account: this.account,
    });
    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async cancelOrderOnChain(orderCode: string): Promise<Hash> {
    const orderId = this.orderId(orderCode);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "cancelOrder",
      args: [orderId],
      account: this.account,
    });
    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async getOrderOnChain(orderCode: string) {
    const orderId = this.orderId(orderCode);
    const order = await this.publicClient.readContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "getOrder",
      args: [orderId],
    });
    return order;
  }

  async getOrderStatusOnChain(orderCode: string): Promise<number> {
    const orderId = this.orderId(orderCode);
    const status = await this.publicClient.readContract({
      address: this.config.orderManagerAddress,
      abi: orderManagerAbi,
      functionName: "getOrderStatus",
      args: [orderId],
    });
    return Number(status);
  }
}
