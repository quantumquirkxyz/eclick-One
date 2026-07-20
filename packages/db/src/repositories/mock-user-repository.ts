import type {
  NewUser,
  RefreshTokenRecord,
  User,
  UserRepository,
} from "@eclick-one/domain";

export class MockUserRepository implements UserRepository {
  private readonly users: User[] = [];
  private readonly refreshTokens: RefreshTokenRecord[] = [];
  private nextUserId = 1;
  private nextRefreshTokenId = 1;

  async findByEmail(email: string): Promise<User | null> {
    return structuredClone(this.users.find((user) => user.email === email) ?? null);
  }

  async findById(id: number): Promise<User | null> {
    return structuredClone(this.users.find((user) => user.id === id) ?? null);
  }

  async createUser(input: NewUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      email: input.email.trim().toLowerCase(),
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      passwordHash: input.password,
      role: input.role ?? "operator",
      activo: true,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return structuredClone(user);
  }

  async saveRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: this.nextRefreshTokenId++,
      userId,
      tokenHash,
      expiresAt,
      revoked: false,
    };
    this.refreshTokens.push(record);
    return structuredClone(record);
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return structuredClone(this.refreshTokens.find((rt) => rt.tokenHash === tokenHash) ?? null);
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const record = this.refreshTokens.find((rt) => rt.tokenHash === tokenHash);
    if (record) record.revoked = true;
  }
}
