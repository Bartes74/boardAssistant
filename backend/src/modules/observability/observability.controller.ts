import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { PublicRoute } from "../auth/public-route.decorator";
import { ObservabilityService } from "./observability.service";

@Controller("observability")
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get("metrics")
  @PublicRoute()
  async metrics(@Res() res: Response) {
    res.setHeader("Content-Type", this.observability.getRegistry().contentType);
    res.send(await this.observability.getRegistry().metrics());
  }
}
