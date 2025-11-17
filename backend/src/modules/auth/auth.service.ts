import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import { SupabaseService } from "../../supabase/supabase.service";
import { AuthenticatedUser } from "./auth.types";

interface SupabaseAuthConfig {
  allowMockUser: boolean;
}

@Injectable()
export class AuthService {
  private readonly config: SupabaseAuthConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService
  ) {
    this.config = {
      allowMockUser: configService.get<boolean>('auth.allowMockUser', false),
    };
  }

  async validateBearerToken(token?: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException("Brak tokena autoryzacyjnego");
    }

    const cleaned = token.replace(/^Bearer\s+/i, "").trim();
    if (!cleaned) {
      throw new UnauthorizedException("Niepoprawny token");
    }

    if (!this.supabaseService.isConfigured()) {
      throw new UnauthorizedException("Supabase nie jest skonfigurowane");
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client.auth.getUser(cleaned);
    if (error || !data?.user) {
      throw new UnauthorizedException("Nie udało się uwierzytelnić w Supabase");
    }

    const metadataRole = (data.user.app_metadata?.role as string | undefined) ?? undefined;
    const role = this.parseRole(metadataRole);

    return {
      userId: data.user.id,
      role,
      email: data.user.email ?? undefined,
      token: cleaned,
    };
  }

  async validateHeaders(headers: Record<string, string | string[] | undefined>): Promise<AuthenticatedUser> {
    const tokenHeader = headers["authorization"];
    const forcedUser = headers["x-mock-user"];

    if (forcedUser && typeof forcedUser === "string") {
      if (!this.config.allowMockUser) {
        throw new UnauthorizedException("Nagłówek x-mock-user jest wyłączony w tej konfiguracji");
      }

      const [userId, roleRaw, email] = forcedUser.split("|");
      if (!userId) {
        throw new UnauthorizedException("Nagłówek x-mock-user jest niepoprawny");
      }
      return { userId, role: this.parseRole(roleRaw), email };
    }

    if (typeof tokenHeader === "string") {
      return this.validateBearerToken(tokenHeader);
    }

    throw new UnauthorizedException("Brak danych uwierzytelniających");
  }

  private parseRole(roleValue?: string | null): UserRole {
    if (!roleValue) {
      return UserRole.BOARD_MEMBER;
    }

    const normalized = roleValue.toUpperCase();
    const value = normalized as keyof typeof UserRole;
    return UserRole[value] ?? UserRole.BOARD_MEMBER;
  }
}
