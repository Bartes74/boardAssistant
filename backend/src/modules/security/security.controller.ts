import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedUser } from "../auth/auth.types";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SecurityService } from "./security.service";

@Controller("security")
@UseGuards(RolesGuard)
@Roles(UserRole.SECURITY_OFFICER, UserRole.ADMIN)
export class SecurityController {
  constructor(private readonly security: SecurityService) {}

  @Get("audit-logs")
  getAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("action") action?: string,
    @Query("actorId") actorId?: string
  ) {
    return this.security.getAuditLogs({
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      action,
      actorId,
    });
  }

  @Get("audit-logs/stats")
  getAuditStats(@CurrentUser() user: AuthenticatedUser) {
    return this.security.getAuditStats();
  }
}

