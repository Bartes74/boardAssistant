import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ObservabilityService } from "./observability.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = process.hrtime.bigint();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const ended = process.hrtime.bigint();
        const durationSeconds = Number(ended - started) / 1_000_000_000;
        const histogram = this.observability.getHttpHistogram();
        histogram.observe(
          {
            method: request.method,
            route: request.route?.path ?? request.url,
            status: request.res?.statusCode ?? 0,
          },
          durationSeconds
        );
      })
    );
  }
}
