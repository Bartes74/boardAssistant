import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ObservabilityController } from "./observability.controller";
import { ObservabilityService } from "./observability.service";
import { HttpMetricsInterceptor } from "./http-metrics.interceptor";

@Module({
  controllers: [ObservabilityController],
  providers: [
    ObservabilityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
