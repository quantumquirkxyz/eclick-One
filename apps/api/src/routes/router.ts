import { AppError } from "../errors/app-error";
import type { Controller } from "../controllers/controller";
import { assertAcceptLanguage } from "../http/validation";
import { apiText, localeFromRequest, translateApiMessage, type ApiLocale } from "../i18n";
import { DomainRuleError } from "@eclick-one/domain";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type Middleware = (request: Request) => Promise<Response | undefined>;
type RouteMatch = { controller: Controller; params: Record<string, string>; middlewares: Middleware[] };

export class Router {
  private readonly routes: { method: Method; pattern: string; controller: Controller; middlewares: Middleware[] }[] = [];

  register(method: Method, path: string, controller: Controller, middlewares: Middleware[] = []): void {
    this.routes.push({ method, pattern: path, controller, middlewares });
  }

  async handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const match = this.matchRoute(request.method as Method, pathname);
    const locale = localeFromRequest(request);
    if (!match) {
      return jsonResponse(
        { error: { code: "NOT_FOUND", message: apiText(locale, "noRoute").replace("{method}", request.method).replace("{pathname}", pathname) } },
        404,
      );
    }

    for (const middleware of match.middlewares) {
      try {
        const response = await middleware(request);
        if (response) return response;
      } catch (error) {
        return errorResponse(error, locale);
      }
    }

    try {
      assertAcceptLanguage(request);
      const result = await match.controller(request, match.params);
      return jsonResponse(result.body, result.status ?? 200, result.headers);
    } catch (error) {
      return errorResponse(error, locale);
    }
  }

  private matchRoute(method: Method, pathname: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = matchPath(route.pattern, pathname);
      if (params) return { controller: route.controller, params, middlewares: route.middlewares };
    }
    return null;
  }
}

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  if (status === 204) {
    return new Response(null, {
      status,
      headers: responseHeaders,
    });
  }
  return Response.json(body, {
    status,
    headers: responseHeaders,
  });
}

function errorResponse(error: unknown, locale: ApiLocale = "en"): Response {
  if (error instanceof AppError) {
    return jsonResponse(
      {
        error: {
          code: error.code,
          message: translateApiMessage(error.message, locale),
          details: translateErrorDetails(error.details, locale),
        },
      },
      error.status,
    );
  }

  if (error instanceof DomainRuleError) {
    return jsonResponse(
      {
        error: {
          code: "BAD_REQUEST",
          message: translateApiMessage(error.message, locale),
        },
      },
      400,
    );
  }

  console.error("Unhandled API error", error);
  return jsonResponse(
    { error: { code: "INTERNAL_ERROR", message: apiText(locale, "internalError") } },
    500,
  );
}

function translateErrorDetails(details: unknown, locale: ApiLocale): unknown {
  if (locale === "en" || !details || typeof details !== "object" || !("fields" in details)) {
    return details;
  }
  const fields = (details as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return details;
  return {
    ...details,
    fields: fields.map((field) => {
      if (!field || typeof field !== "object" || !("message" in field) || typeof (field as { message?: unknown }).message !== "string") {
        return field;
      }
      return {
        ...field,
        message: translateApiMessage((field as { message: string }).message, locale),
      };
    }),
  };
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
