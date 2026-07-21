import { verifyToken, type AuthConfig } from "@eclick-one/shared";
import { agentActivity } from "./agent-activity";

export interface AgentInfo {
  name: string;
  wallet: string;
  description: string;
}

interface AgentHttpErrorBody {
  error: {
    code: string;
    message: string;
  };
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } } satisfies AgentHttpErrorBody,
    {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
}

async function authorizeAgentRequest(request: Request, auth: AuthConfig): Promise<Response | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or invalid authorization token.");
  }

  try {
    await verifyToken(header.slice("Bearer ".length).trim(), auth);
    return null;
  } catch {
    return errorResponse(401, "UNAUTHORIZED", "Invalid or expired token.");
  }
}

export function startAgentServer(port: number, info: AgentInfo, auth: AuthConfig) {
  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          agent: info.name,
          wallet: info.wallet,
          uptime: agentActivity.getMetrics().uptimeSeconds,
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const authError = await authorizeAgentRequest(request, auth);
      if (authError) {
        return authError;
      }

      if (url.pathname === "/activity") {
        const count = Number(url.searchParams.get("count") ?? 50);
        return new Response(JSON.stringify(agentActivity.getRecent(count)), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/metrics") {
        const metrics = agentActivity.getMetrics();
        const prometheusLines = [
          `# HELP agent_total_actions Total actions performed`,
          `# TYPE agent_total_actions counter`,
          `agent_total_actions{agent="${info.name}"} ${metrics.totalActions}`,
          `# HELP agent_total_errors Total errors encountered`,
          `# TYPE agent_total_errors counter`,
          `agent_total_errors{agent="${info.name}"} ${metrics.totalErrors}`,
          `# HELP agent_orders_processed Total orders processed`,
          `# TYPE agent_orders_processed counter`,
          `agent_orders_processed{agent="${info.name}"} ${metrics.ordersProcessed}`,
          `# HELP agent_uptime_seconds Agent uptime in seconds`,
          `# TYPE agent_uptime_seconds gauge`,
          `agent_uptime_seconds{agent="${info.name}"} ${metrics.uptimeSeconds}`,
        ];
        return new Response(prometheusLines.join("\n"), {
          headers: { "Content-Type": "text/plain; version=0.0.4" },
        });
      }

      if (url.pathname === "/info") {
        return new Response(JSON.stringify(info), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    },
  });
  agentActivity.log("info", `Agent HTTP server listening on :${port}`);
  return server;
}
