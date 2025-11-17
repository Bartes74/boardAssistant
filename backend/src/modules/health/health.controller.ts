import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { PrismaService } from "../../prisma/prisma.service";
import { PublicRoute } from "../auth/public-route.decorator";
import { RagServiceHealthIndicator } from "./rag-service.health";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly ragIndicator: RagServiceHealthIndicator,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @PublicRoute()
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: "up" } };
      },
      async () => this.ragIndicator.isHealthy("rag-service"),
    ]);
  }
}
