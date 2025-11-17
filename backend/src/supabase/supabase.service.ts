import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseUploadOptions {
  bucket: string;
  path: string;
  data: Buffer | Blob | string;
  contentType?: string;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client?: SupabaseClient;
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const url = configService.get<string>("supabase.url") ?? "";
    const serviceRoleKey = configService.get<string>("supabase.serviceRoleKey") ?? "";

    if (url && serviceRoleKey) {
      this.client = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.configured = true;
    } else {
      this.configured = false;
      this.logger.warn("Supabase nie jest w pełni skonfigurowane – użyj ALLOW_MOCK_USER tylko w trybie dev");
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error("Supabase client nie jest dostępny – uzupełnij konfigurację");
    }
    return this.client;
  }

  async upload(options: SupabaseUploadOptions) {
    const client = this.getClient();
    const { error } = await client.storage
      .from(options.bucket)
      .upload(options.path, options.data, {
        contentType: options.contentType ?? "application/json",
        upsert: true,
      });
    if (error) {
      this.logger.error(`Błąd zapisu do Supabase Storage: ${error.message}`);
      throw error;
    }
  }
}
