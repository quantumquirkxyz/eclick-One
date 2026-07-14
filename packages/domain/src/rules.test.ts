import { describe, expect, test } from "bun:test";
import {
  DomainRuleError,
  amountForQuantity,
  assertClientCanGenerateOrder,
  assertOrderDateAllowed,
  assertProvinceOrderCode,
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

  test("enforces the inclusive order date lower bound and rejects future dates", () => {
    expect(() => assertOrderDateAllowed("2024-12-29T00:00:00.000Z")).not.toThrow();
    expect(() => assertOrderDateAllowed("2024-12-28T23:59:59.999Z")).toThrow();
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(() => assertOrderDateAllowed(future)).toThrow();
  });

  test("calculates delivery exactly 48 hours later", () => {
    expect(calculateDeliveryDate("2024-12-01T12:00:00.000Z")).toBe(
      "2024-12-03T12:00:00.000Z",
    );
  });

  test("requires paz y salvo before generating an order", () => {
    expect(() => assertClientCanGenerateOrder(false)).toThrow();
    expect(() => assertClientCanGenerateOrder(true)).not.toThrow();
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

  test("asserts province code format with exactly two uppercase letters", () => {
    expect(() => assertProvinceOrderCode("PA-SYN-0001", "PA")).not.toThrow();
    expect(() => assertProvinceOrderCode("PA-SYN-0001", "PA.")).toThrow(DomainRuleError);
    expect(() => assertProvinceOrderCode("PA-SYN-0001", "pan")).toThrow(DomainRuleError);
  });

  test("preference returns null when fewer than three requests exist", () => {
    expect(selectProductPreference([
      { codigo_producto: 1000, cantidad: 1 },
      { codigo_producto: 1000, cantidad: 1 },
    ])).toBeNull();
  });

  test("preference uses frequency, then quantity", () => {
    expect(
      selectProductPreference([
        { codigo_producto: 1000, cantidad: 1 },
        { codigo_producto: 1000, cantidad: 1 },
        { codigo_producto: 1000, cantidad: 1 },
        { codigo_producto: 1001, cantidad: 4 },
        { codigo_producto: 1001, cantidad: 4 },
        { codigo_producto: 1001, cantidad: 4 },
      ]),
    ).toEqual({ codigo_producto: 1001, cant_solicitudes: 3, cantidad_total: 12 });
  });
});
