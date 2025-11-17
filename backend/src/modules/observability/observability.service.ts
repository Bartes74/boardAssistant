import { Injectable } from "@nestjs/common";
import client, { Histogram } from "prom-client";

@Injectable()
export class ObservabilityService {
  private readonly httpHistogram: Histogram<string>;

  constructor() {
    client.collectDefaultMetrics({ prefix: "core_service_" });
    this.httpHistogram = new client.Histogram({
      name: "core_service_http_request_duration_seconds",
      help: "Czas obsługi żądania HTTP",
      labelNames: ["method", "route", "status"],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    });
  }

  getRegistry() {
    return client.register;
  }

  getHttpHistogram() {
    return this.httpHistogram;
  }
}
