import { afterEach, describe, expect, test } from "bun:test";
import { createAuthConfig, signAccessToken } from "@eclick-one/shared";
import { startAgentServer } from "./agent-http";

const auth = createAuthConfig({
  JWT_SECRET: "test-secret-that-must-be-at-least-32-characters-long!!",
});

const servers: Array<{ stop(force?: boolean): void }> = [];

afterEach(() => {
  while (servers.length) {
    servers.pop()?.stop(true);
  }
});

function startTestServer() {
  const port = 4100 + Math.floor(Math.random() * 2000);
  const server = startAgentServer(port, {
    name: "collector",
    wallet: "0x123",
    description: "Test agent",
  }, auth);
  servers.push(server);
  return { server, port };
}

async function accessToken(role: "admin" | "operator" | "viewer" | "agent" = "admin"): Promise<string> {
  return signAccessToken(
    { sub: "1", email: "agent-test@example.com", type: "access", role },
    auth,
  );
}

describe("agent HTTP auth", () => {
  test("keeps health endpoint public", async () => {
    const { port } = startTestServer();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
  });

  test("rejects protected endpoints without a token", async () => {
    const { port } = startTestServer();
    const response = await fetch(`http://127.0.0.1:${port}/info`);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  test("allows protected endpoints with a valid token", async () => {
    const { port } = startTestServer();
    const token = await accessToken();
    const response = await fetch(`http://127.0.0.1:${port}/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      name: "collector",
      wallet: "0x123",
    });
  });
});
