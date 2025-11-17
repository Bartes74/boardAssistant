import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { RagServiceHealthIndicator } from "./rag-service.health";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RagServiceHealthIndicator],
})
export class HealthModule {}
