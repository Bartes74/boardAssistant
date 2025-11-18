import { Module } from "@nestjs/common";
import { SupabaseModule } from "../../supabase/supabase.module";
import { AuthModule } from "../auth/auth.module";
import { SourcesController } from "./sources.controller";
import { SourcesService } from "./sources.service";

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
