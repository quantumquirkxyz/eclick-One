import { describe, expect, test } from "bun:test";
import { SessionService, type SessionConfig } from "./session-service";

const config: SessionConfig = {
  jwtSecret: "test-secret",
  accessTokenTtlSeconds: 60,
  refreshTokenTtlSeconds: 3600,
  rateLimitWindowSeconds: 60,
  rateLimitMaxAttempts: 5,
  secureCookies: false,
};

describe("SessionService", () => {
  test("revokes access tokens on logout", async () => {
    const service = new SessionService(config);
    const tokens = await service.login("operator@eclick.one", "password", "login:test");

    await expect(service.verifyAccessToken(tokens.accessToken)).resolves.toMatchObject({
      email: "operator@eclick.one",
      role: "operator",
    });

    await service.logout(tokens.refreshToken, tokens.accessToken);

    await expect(service.verifyAccessToken(tokens.accessToken)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  test("removes expired refresh sessions during cleanup", async () => {
    const service = new SessionService(config);
    const tokens = await service.login("operator@eclick.one", "password", "login:cleanup");

    service.cleanupExpiredSessions(Date.now() + config.refreshTokenTtlSeconds * 1000 + 1);

    await expect(service.refresh(tokens.refreshToken, tokens.csrfToken, tokens.csrfToken, "refresh:cleanup")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
