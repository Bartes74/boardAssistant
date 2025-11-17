import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { SupabaseModule } from "../../supabase/supabase.module";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { UserContextInterceptor } from "./user-context.interceptor";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [SupabaseModule],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UserContextInterceptor,
    },
    RolesGuard,
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
