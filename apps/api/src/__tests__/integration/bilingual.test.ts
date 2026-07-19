import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("bilingual responses", () => {
  const app = createApp();

  test("returns English error for English accept-language", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/abc/preference", {
        headers: { "accept-language": "en" },
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toBe("codigo_cliente must be an integer.");
  });

  test("returns Spanish error for Spanish accept-language", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/abc/preference", {
        headers: { "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toBe("codigo_cliente debe ser un entero.");
  });

  test("returns Spanish dashboard notice", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/dashboard", {
        headers: { "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notice).toContain("sinteticos");
  });

  test("returns English dashboard notice by default", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notice).toContain("Synthetic");
  });

  test("returns Spanish reports headers", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/reports", {
        headers: { "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    const orderStatusSection = body.sections.find((s: any) => s.key === "order-status");
    expect(orderStatusSection.title).toBe("Pedidos por estado");
  });

  test("returns English reports headers by default", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports"));
    expect(response.status).toBe(200);
    const body = await response.json();
    const orderStatusSection = body.sections.find((s: any) => s.key === "order-status");
    expect(orderStatusSection.title).toBe("Orders by status");
  });
});
