export type Environment = Record<string, string | undefined>;

export function requiredEnv(env: Environment, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function integerEnv(
  env: Environment,
  key: string,
  fallback: number,
  limits: { min: number; max: number },
): number {
  if (fallback < limits.min || fallback > limits.max) {
    throw new Error(`${key} fallback value ${fallback} is outside the allowed range.`);
  }
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
    throw new Error(`${key} must be an integer between ${limits.min} and ${limits.max}.`);
  }
  return value;
}

export function booleanEnv(env: Environment, key: string, fallback: boolean): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${key} must be either true or false.`);
}

export function commaSeparatedEnv(env: Environment, key: string, fallback: string[]): string[] {
  const values = env[key]
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values?.length ? values : fallback;
}
