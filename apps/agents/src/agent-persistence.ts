import { agentActivity } from "./agent-activity";

const BLOCK_POSITION_FILE = ".agent-block-position.json";
const CONFIG_RELOAD_FILE = ".agent-config-reloaded";

export interface BlockPosition {
  collector: string;
  compliance: string;
  lastUpdated: string;
}

// Using 'any' to bypass TypeScript's strict typing of Bun's experimental APIs
// These work at runtime but Bun's type definitions are incomplete
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BunRuntime: any = Bun;

export class AgentPersistence {
  private static instance: AgentPersistence;
  private blockPosition: BlockPosition;

  private constructor() {
    this.blockPosition = this.loadBlockPosition();
  }

  static getInstance(): AgentPersistence {
    if (!AgentPersistence.instance) {
      AgentPersistence.instance = new AgentPersistence();
    }
    return AgentPersistence.instance;
  }

  loadBlockPosition(): BlockPosition {
    try {
      const data = BunRuntime.file(BLOCK_POSITION_FILE).textSync();
      const parsed = JSON.parse(data) as BlockPosition;
      return {
        collector: parsed.collector ?? "0",
        compliance: parsed.compliance ?? "0",
        lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
      };
    } catch {
      return { collector: "0", compliance: "0", lastUpdated: new Date().toISOString() };
    }
  }

  saveBlockPosition(agent: "collector" | "compliance", block: bigint): void {
    this.blockPosition[agent] = block.toString();
    this.blockPosition.lastUpdated = new Date().toISOString();
    try {
      BunRuntime.write(BLOCK_POSITION_FILE, JSON.stringify(this.blockPosition));
    } catch (error) {
      agentActivity.log("error", "Failed to save block position", { error: String(error) });
    }
  }

  getLastBlock(agent: "collector" | "compliance"): bigint {
    return BigInt(this.blockPosition[agent] ?? "0");
  }

  async reloadConfig(): Promise<void> {
    agentActivity.log("info", "Configuration reload requested via SIGHUP");
    try {
      BunRuntime.write(CONFIG_RELOAD_FILE, new Date().toISOString());
      agentActivity.log("info", "Configuration reload file updated");
    } catch (error) {
      agentActivity.log("error", "Failed to update config reload marker", { error: String(error) });
    }
  }
}