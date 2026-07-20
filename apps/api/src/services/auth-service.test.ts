import { describe, expect, test } from "bun:test";
import { MockUserRepository } from "@eclick-one/db";
import { AuthService } from "./auth-service";

function createService(): AuthService {
  return new AuthService(new MockUserRepository(), {
    jwtSecret: "test-secret",
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
  });
}

describe("auth service", () => {
  test("registers a new user and returns tokens", async () => {
    const service = createService();
    const tokens = await service.register({
      email: "user@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "secure-password-123",
    });

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.expiresIn).toBe(900);
  });

  test("rejects duplicate email registration", async () => {
    const service = createService();
    await service.register({
      email: "user@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "secure-password-123",
    });

    await expect(
      service.register({
        email: "user@example.com",
        nombre: "Ana",
        apellido: "Morales",
        password: "secure-password-123",
      }),
    ).rejects.toThrow("Email is already registered.");
  });

  test("logs in with valid credentials", async () => {
    const service = createService();
    await service.register({
      email: "user@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "secure-password-123",
    });

    const tokens = await service.login({
      email: "user@example.com",
      password: "secure-password-123",
    });

    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  test("rejects login with invalid password", async () => {
    const service = createService();
    await service.register({
      email: "user@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "secure-password-123",
    });

    await expect(
      service.login({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid credentials.");
  });

  test("refreshes tokens with a valid refresh token", async () => {
    const service = createService();
    const tokens = await service.register({
      email: "user@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "secure-password-123",
    });

    const refreshed = await service.refresh({
      refreshToken: tokens.refreshToken,
    });

    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).toBeTruthy();
  });

  test("revokes refresh token on logout", async () => {
    const service = createService();
    const tokens = await service.register({
      email: "user@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "secure-password-123",
    });

    await service.logout(tokens.refreshToken);

    await expect(
      service.refresh({
        refreshToken: tokens.refreshToken,
      }),
    ).rejects.toThrow("Refresh token has been revoked.");
  });
});
