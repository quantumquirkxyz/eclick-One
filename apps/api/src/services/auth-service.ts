import type {
  AuthTokens,
  LoginRequest,
  NewUser,
  RefreshRequest,
  RegisterRequest,
  User,
  UserRepository,
} from "@eclick-one/domain";
import { issueTokens as sharedIssueTokens, type AuthConfig } from "@eclick-one/shared";
import { ConflictError, UnauthorizedError } from "../errors/app-error";

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly auth: AuthConfig,
    private readonly inMemoryBlacklist: Set<string> = new Set(),
  ) {}

  async register(input: RegisterRequest): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError("Email is already registered.");

    const passwordHash = await Bun.password.hash(input.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });

    const user = await this.users.createUser({
      email: input.email.trim().toLowerCase(),
      nombre: input.nombre.trim(),
      apellido: input.apellido.trim(),
      password: passwordHash,
    });

    return this.issueTokens(user);
  }

  async login(input: LoginRequest): Promise<AuthTokens> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user || !user.activo) throw new UnauthorizedError("Invalid credentials.");

    const valid = await Bun.password.verify(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid credentials.");

    return this.issueTokens(user);
  }

  async refresh(input: RefreshRequest): Promise<AuthTokens> {
    const token = input.refreshToken.trim();
    if (this.inMemoryBlacklist.has(token)) throw new UnauthorizedError("Refresh token has been revoked.");

    const tokenHash = await hashToken(token);
    const record = await this.users.findRefreshToken(tokenHash);
    if (!record || record.revoked || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedError("Invalid or expired refresh token.");
    }

    await this.users.revokeRefreshToken(tokenHash);
    const user = await this.users.findById(record.userId);
    if (!user || !user.activo) throw new UnauthorizedError("User not found or inactive.");

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = await hashToken(refreshToken.trim());
    this.inMemoryBlacklist.add(refreshToken.trim());
    await this.users.revokeRefreshToken(tokenHash);
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.users.findById(userId);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const tokens = await sharedIssueTokens(user.id, user.email, this.auth);
    const tokenHash = await hashToken(tokens.refreshToken);
    await this.users.saveRefreshToken(user.id, tokenHash, new Date(Date.now() + this.auth.refreshTokenTtlSeconds * 1000).toISOString());
    return tokens;
  }
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
