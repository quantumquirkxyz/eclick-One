import { describe, expect, test } from "bun:test";
import { SessionManager, type AuthTokenPair } from "./session";

function tokens(accessToken: string, refreshToken: string, accessExpiresInMs: number, refreshExpiresInMs = 300_000): AuthTokenPair {
  return {
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + accessExpiresInMs).toISOString(),
    ...(refreshToken ? { refreshToken } : {}),
    refreshTokenExpiresAt: new Date(Date.now() + refreshExpiresInMs).toISOString(),
    tokenType: "Bearer",
    user: { id: "user_1", email: "operator@example.com", name: "Operator", role: "operator" },
  };
}

function expiredRefreshableSession(accessToken: string, refreshToken = "refresh-token"): AuthTokenPair {
  return tokens(accessToken, refreshToken, -60_000);
}

describe("SessionManager", () => {
  test("queues concurrent refreshes behind one network call", async () => {
    let calls = 0;
    const manager = new SessionManager(async () => {
      calls += 1;
      return tokens("next-access", "next-refresh", 60_000);
    });
    manager.setSession(expiredRefreshableSession("old-access"));

    const [first, second] = await Promise.all([manager.getAccessToken(), manager.getAccessToken()]);
    expect(first).toBe("next-access");
    expect(second).toBe("next-access");
    expect(calls).toBe(1);
  });

  test("clears session when refresh fails", async () => {
    const manager = new SessionManager(async () => {
      throw new Error("refresh failed");
    });
    manager.setSession(expiredRefreshableSession("old-access"));

    expect(await manager.getAccessToken()).toBeNull();
    expect(manager.getRefreshToken()).toBeNull();
  });
});
