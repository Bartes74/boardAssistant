import { AxiosError } from "axios";
import { ConfigService } from "@nestjs/config";
import { Injectable, Logger } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import axios from "axios";

@Injectable()
export class RagServiceHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RagServiceHealthIndicator.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = `${this.config.get<string>("ragService.baseUrl")}/healthz`;
    try {
      await axios.get(url, { timeout: 2000 });
      return this.getStatus(key, true, { url });
    } catch (error) {
      const message = error instanceof AxiosError ? error.message : String(error);
      this.logger.warn(`rag-service health check failed: ${message}`);
      return this.getStatus(key, false, { url, error: message });
    }
  }
}
