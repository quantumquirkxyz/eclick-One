import { describe, expect, test } from "bun:test";
import {
  DomainRuleError,
  amountForQuantity,
  assertClientCanGenerateOrder,
  assertOrderDateAllowed,
  calculateDeliveryDate,
  canRemainInProcess,
  isIncludedInMonthlyOrders,
  selectProductPreference,
} from "./rules";

describe("domain business rules", () => {
  test("maps quantities to the fixed amount bands", () => {
    expect([1, 2, 3, 20].map(amountForQuantity)).toEqual([50, 70, 90, 90]);
    expect(() => amountForQuantity(0)).toThrow(DomainRuleError);
  });

  test("enforces the inclusive order deadline", () => {
    expect(() => assertOrderDateAllowed("2024-12-29T23:59:59.999Z")).not.toThrow();
    expect(() => assertOrderDateAllowed("2024-12-30T00:00:00.000Z")).toThrow();
  });

  test("calculates delivery exactly 48 hours later", () => {
    expect(calculateDeliveryDate("2024-12-01T12:00:00.000Z")).toBe(
      "2024-12-03T12:00:00.000Z",
    );
  });

  test("requires positive client balance", () => {
    expect(() => assertClientCanGenerateOrder(0)).toThrow();
    expect(() => assertClientCanGenerateOrder(0.01)).not.toThrow();
  });

  test("monthly reporting excludes day 31", () => {
    expect(isIncludedInMonthlyOrders("2024-01-30T12:00:00Z")).toBe(true);
    expect(isIncludedInMonthlyOrders("2024-01-31T12:00:00Z")).toBe(false);
  });

  test("monthly policy can exempt the 48-hour in-process limit", () => {
    const base = {
      enteredInProcessAt: "2024-01-01T00:00:00Z",
      evaluatedAt: "2024-01-04T00:00:00Z",
    };
    expect(canRemainInProcess({ ...base, monthlyRuleApplies: false })).toBe(false);
    expect(canRemainInProcess({ ...base, monthlyRuleApplies: true })).toBe(true);
  });

  test("preference uses frequency, then quantity", () => {
    expect(
      selectProductPreference([
        { productCode: 1000, quantity: 1 },
        { productCode: 1000, quantity: 1 },
        { productCode: 1000, quantity: 1 },
        { productCode: 1001, quantity: 4 },
        { productCode: 1001, quantity: 4 },
        { productCode: 1001, quantity: 4 },
      ]),
    ).toEqual({ productCode: 1001, requestCount: 3, totalQuantity: 12 });
  });
});
