export function withCors(
  handler: (request: Request) => Promise<Response>,
  allowedOrigins: readonly string[],
): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = request.headers.get("Origin");
    const permittedOrigin = origin && allowedOrigins.includes(origin) ? origin : null;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: permittedOrigin ? 204 : 403,
        ...(permittedOrigin ? { headers: corsHeaders(permittedOrigin) } : {}),
      });
    }

    const response = await handler(request);
    if (permittedOrigin) {
      for (const [key, value] of Object.entries(corsHeaders(permittedOrigin))) {
        response.headers.set(key, value);
      }
    }
    return response;
  };
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Request-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
