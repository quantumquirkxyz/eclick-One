import { AppError } from "../errors/app-error";
import type { Controller } from "../controllers/controller";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class Router {
  private readonly routes = new Map<string, Controller>();

  register(method: Method, path: string, controller: Controller): void {
    this.routes.set(`${method} ${path}`, controller);
  }

  async handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const controller = this.routes.get(`${request.method} ${pathname}`);
    if (!controller) {
      return jsonResponse(
        { error: { code: "NOT_FOUND", message: `No route for ${request.method} ${pathname}.` } },
        404,
      );
    }

    try {
      const result = await controller(request);
      return jsonResponse(result.body, result.status ?? 200);
    } catch (error) {
      return errorResponse(error);
    }
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      { error: { code: error.code, message: error.message, details: error.details } },
      error.status,
    );
  }

  // SQL/implementation details are logged server-side but never leaked to callers.
  console.error("Unhandled API error", error);
  return jsonResponse(
    { error: { code: "INTERNAL_ERROR", message: "The service could not complete the request." } },
    500,
  );
}
