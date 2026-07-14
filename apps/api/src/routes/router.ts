import { AppError } from "../errors/app-error";
import type { Controller } from "../controllers/controller";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type RouteMatch = { controller: Controller; params: Record<string, string> };

export class Router {
  private readonly routes: { method: Method; pattern: string; controller: Controller }[] = [];

  register(method: Method, path: string, controller: Controller): void {
    this.routes.push({ method, pattern: path, controller });
  }

  async handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const match = this.matchRoute(request.method as Method, pathname);
    if (!match) {
      return jsonResponse(
        { error: { code: "NOT_FOUND", message: `No route for ${request.method} ${pathname}.` } },
        404,
      );
    }

    try {
      const result = await match.controller(request, match.params);
      return jsonResponse(result.body, result.status ?? 200);
    } catch (error) {
      return errorResponse(error);
    }
  }

  private matchRoute(method: Method, pathname: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = matchPath(route.pattern, pathname);
      if (params) return { controller: route.controller, params };
    }
    return null;
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

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index]!;
    const pathSegment = pathSegments[index]!;
    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = pathSegment;
      continue;
    }
    if (patternSegment !== pathSegment) return null;
  }
  return params;
}
