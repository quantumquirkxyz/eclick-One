import type { NewUser, RefreshTokenRecord, User, UserRepository } from "@eclick-one/domain";
import type { InStatement, ResultSet } from "@libsql/client";
import type { TursoClient } from "../client/turso-client";

type SqlRow = Record<string, unknown>;

export class TursoUserRepository implements UserRepository {
  constructor(private readonly client: TursoClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.client.execute({
      sql: `SELECT id_usuario, email, nombre, apellido, password_hash, role, activo, fecha_registro
        FROM USUARIO
        WHERE email = ?
        LIMIT 1`,
      args: [email.trim().toLowerCase()],
    });
    return mapUser(result.rows[0]);
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.client.execute({
      sql: `SELECT id_usuario, email, nombre, apellido, password_hash, role, activo, fecha_registro
        FROM USUARIO
        WHERE id_usuario = ?
        LIMIT 1`,
      args: [id],
    });
    return mapUser(result.rows[0]);
  }

  async createUser(input: NewUser): Promise<User> {
    const email = input.email.trim().toLowerCase();
    await this.client.execute({
      sql: `INSERT INTO USUARIO (email, nombre, apellido, password_hash, role, activo)
        VALUES (?, ?, ?, ?, ?, 1)`,
      args: [email, input.nombre.trim(), input.apellido.trim(), input.password, input.role ?? "operator"],
    });
    const user = await this.findByEmail(email);
    if (!user) throw new Error("User insert completed without a readable result.");
    return user;
  }

  async saveRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<RefreshTokenRecord> {
    await this.client.execute({
      sql: `INSERT INTO TOKEN_REFRESH (id_usuario, token_hash, expires_at, revoked)
        VALUES (?, ?, ?, 0)`,
      args: [userId, tokenHash, expiresAt],
    });
    const record = await this.findRefreshToken(tokenHash);
    if (!record) throw new Error("Refresh token insert completed without a readable result.");
    return record;
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const result = await this.client.execute({
      sql: `SELECT id_token_refresh, id_usuario, token_hash, expires_at, revoked
        FROM TOKEN_REFRESH
        WHERE token_hash = ?
        LIMIT 1`,
      args: [tokenHash],
    });
    return mapRefreshToken(result.rows[0]);
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.client.execute({
      sql: "UPDATE TOKEN_REFRESH SET revoked = 1 WHERE token_hash = ?",
      args: [tokenHash],
    });
  }
}

function mapUser(row: SqlRow | undefined): User | null {
  if (!row) return null;
  return {
    id: numberValue(row, "id_usuario"),
    email: stringValue(row, "email"),
    nombre: stringValue(row, "nombre"),
    apellido: stringValue(row, "apellido"),
    passwordHash: stringValue(row, "password_hash"),
    role: stringValue(row, "role") as User["role"],
    activo: booleanValue(row, "activo"),
    createdAt: stringValue(row, "fecha_registro"),
  };
}

function mapRefreshToken(row: SqlRow | undefined): RefreshTokenRecord | null {
  if (!row) return null;
  return {
    id: numberValue(row, "id_token_refresh"),
    userId: numberValue(row, "id_usuario"),
    tokenHash: stringValue(row, "token_hash"),
    expiresAt: stringValue(row, "expires_at"),
    revoked: booleanValue(row, "revoked"),
  };
}

function stringValue(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
  return value;
}

function numberValue(row: SqlRow, key: string): number {
  const value = row[key];
  if (typeof value !== "number" || Number.isNaN(value)) throw new Error(`Expected ${key} to be a number.`);
  return value;
}

function booleanValue(row: SqlRow, key: string): boolean {
  const value = row[key];
  if (typeof value === "number") return value === 1;
  if (typeof value === "boolean") return value;
  throw new Error(`Expected ${key} to be a boolean-compatible value.`);
}
