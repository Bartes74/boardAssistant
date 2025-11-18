import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SourcesService } from "./sources.service";
import { IngestSourceDto } from "./dto/ingest-source.dto";

@Controller("sources")
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Post("ingest")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SECURITY_OFFICER)
  ingest(@CurrentUser() user: AuthenticatedUser, @Body() payload: IngestSourceDto) {
    return this.sources.ingest(user, payload);
  }
}
