import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

interface GetAuditLogsParams {
  limit: number;
  offset: number;
  action?: string;
  actorId?: string;
}

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(params: GetAuditLogsParams) {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) {
      where.action = { contains: params.action, mode: "insensitive" };
    }

    if (params.actorId) {
      where.actorId = params.actorId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: "desc" },
        include: {
          // Możemy dodać relacje jeśli będą potrzebne
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total,
      },
    };
  }

  async getAuditStats() {
    const [total, byAction, byRole, recent] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ["action"],
        _count: true,
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ["actorRole"],
        _count: true,
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // ostatnie 24h
          },
        },
      }),
    ]);

    return {
      total,
      last24h: recent,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      byRole: byRole.map((item) => ({
        role: item.actorRole,
        count: item._count,
      })),
    };
  }
}

