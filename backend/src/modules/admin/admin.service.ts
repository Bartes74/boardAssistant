import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { SupabaseService } from "../../supabase/supabase.service";
import { validatePassword } from "../../utils/password-validator";
import { CreateAdminUserDto } from "./dto/create-admin-user.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";

export interface AdminUser {
  id: string;
  email: string | null;
  role: UserRole;
  createdAt: string | null;
  lastSignInAt: string | null;
}

@Injectable()
export class AdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listUsers(params?: { page?: number; perPage?: number }): Promise<{
    users: AdminUser[];
    pagination: { total: number; page: number; perPage: number; hasMore: boolean };
  }> {
    const client = this.supabaseService.getClient();
    const page = params?.page ?? 1;
    const perPage = Math.min(params?.perPage ?? 50, 1000); // Max 1000 per Supabase limit

    const { data, error } = await client.auth.admin.listUsers({
      perPage,
      page,
    });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const users = (data?.users ?? []).map((user) => this.mapUser(user));
    const total = data?.total ?? users.length;
    const hasMore = page * perPage < total;

    return {
      users,
      pagination: {
        total,
        page,
        perPage,
        hasMore,
      },
    };
  }

  async createUser(dto: CreateAdminUserDto): Promise<AdminUser> {
    const passwordValidation = validatePassword(dto.password);
    if (!passwordValidation.valid) {
      throw new BadRequestException(
        `Niepoprawne hasło: ${passwordValidation.errors.join(", ")}`
      );
    }

    const client = this.supabaseService.getClient();

    const { data, error } = await client.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      app_metadata: { role: dto.role },
    });

    if (error?.status === 422) {
      throw new BadRequestException("Użytkownik o takim adresie e-mail już istnieje");
    }

    if (error || !data.user) {
      throw new InternalServerErrorException(error?.message ?? "Nie udało się utworzyć użytkownika");
    }

    return this.mapUser(data.user);
  }

  async updateUser(userId: string, dto: UpdateAdminUserDto): Promise<AdminUser> {
    const client = this.supabaseService.getClient();

    const payload: Parameters<typeof client.auth.admin.updateUserById>[1] = {};

    if (dto.role) {
      payload.app_metadata = { role: dto.role };
    }

    if (dto.password) {
      const passwordValidation = validatePassword(dto.password);
      if (!passwordValidation.valid) {
        throw new BadRequestException(
          `Niepoprawne hasło: ${passwordValidation.errors.join(", ")}`
        );
      }
      payload.password = dto.password;
    }

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException("Brak danych do aktualizacji");
    }

    const { data, error } = await client.auth.admin.updateUserById(userId, payload);

    if (error || !data.user) {
      if (error?.status === 404) {
        throw new NotFoundException("Nie znaleziono użytkownika");
      }
      throw new InternalServerErrorException(error?.message ?? "Nie udało się zaktualizować użytkownika");
    }

    return this.mapUser(data.user);
  }

  async deleteUser(userId: string): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) {
      if (error.status === 404) {
        throw new NotFoundException("Nie znaleziono użytkownika");
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  private mapUser(user: User): AdminUser {
    const appRole = typeof user.app_metadata?.role === "string" ? user.app_metadata.role : undefined;
    return {
      id: user.id,
      email: user.email ?? null,
      role: this.parseRole(appRole),
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    };
  }

  private parseRole(role?: string | null): UserRole {
    if (!role) {
      return UserRole.BOARD_MEMBER;
    }
    const normalized = role.toUpperCase();
    if (normalized in UserRole) {
      return UserRole[normalized as keyof typeof UserRole];
    }
    return UserRole.BOARD_MEMBER;
  }
}


