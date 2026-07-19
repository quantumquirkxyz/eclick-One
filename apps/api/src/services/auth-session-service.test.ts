import { describe, expect, test } from "bun:test";
import { AuthSessionService } from "./auth-session-service";

const config = {
  accessTokenTtlSeconds: 60,
  refreshTokenTtlSeconds: 300,
  authRateLimitAttempts: 2,
  authRateLimitWindowSeconds: 60,
  jwtSecret: "test-auth-secret-with-at-least-thirty-two-characters",
};

describe("AuthSessionService", () => {
  test("keeps only the rotated refresh session active", async () => {
    const service = new AuthSessionService(config);
    const first = await service.register({
      email: "operator@example.com",
      password: "password123",
      name: "Operator",
      ipAddress: "127.0.0.1",
    });
    expect(service.activeRefreshSessionCount()).toBe(1);

    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(service.activeRefreshSessionCount()).toBe(1);

    await expect(service.refresh(first.refreshToken)).rejects.toThrow("Refresh token has been revoked.");
  });

  test("rate limits repeated invalid login attempts by IP", async () => {
    const service = new AuthSessionService(config);
    await expect(service.login({ email: "bad", password: "short", ipAddress: "10.0.0.1" })).rejects.toThrow(
      "Invalid email or password.",
    );
    await expect(service.login({ email: "bad", password: "short", ipAddress: "10.0.0.1" })).rejects.toThrow(
      "Invalid email or password.",
    );
    await expect(service.login({ email: "bad", password: "short", ipAddress: "10.0.0.1" })).rejects.toThrow(
      "Too many authentication attempts.",
    );
  });
});
