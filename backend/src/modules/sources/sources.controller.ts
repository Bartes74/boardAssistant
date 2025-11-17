import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { SourcesService } from "./sources.service";
import { IngestSourceDto } from "./dto/ingest-source.dto";

@Controller("sources")
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Post("ingest")
  ingest(@CurrentUser() user: AuthenticatedUser, @Body() payload: IngestSourceDto) {
    // RLS ensures tylko użytkownicy ADMIN będą mogli masowo ingestować (future).
    return this.sources.ingest(payload);
  }
}
