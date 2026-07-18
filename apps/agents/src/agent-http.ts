import { agentActivity } from "./agent-activity";

export interface AgentInfo {
  name: string;
  wallet: string;
  description: string;
}

export function startAgentServer(port: number, info: AgentInfo): void {
  Bun.serve({
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

      if (url.pathname === "/activity") {
        const count = Number(url.searchParams.get("count") ?? 50);
        return new Response(JSON.stringify(agentActivity.getRecent(count)), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/metrics") {
        return new Response(JSON.stringify(agentActivity.getMetrics()), {
          headers: { "Content-Type": "application/json" },
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
}
