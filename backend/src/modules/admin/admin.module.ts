import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../../supabase/supabase.module";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}


