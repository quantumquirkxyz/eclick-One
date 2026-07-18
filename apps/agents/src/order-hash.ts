import type { Hash } from "viem";

export function orderIdFromCode(orderCode: string): Hash {
  const hash = new Bun.CryptoHasher("sha256").update(orderCode).digest();
  return `0x${Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hash;
}
