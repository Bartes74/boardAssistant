import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { QueryTopicsDto } from "./dto/query-topics.dto";

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTopics(user: AuthenticatedUser, query: QueryTopicsDto) {
    const where: Prisma.TopicWhereInput = {};
    if (query.status) {
      where.topicStatus = query.status;
    }
    if (query.search) {
      where.title = { contains: query.search, mode: "insensitive" };
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [topics, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          { lastEventAt: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          userTopicScores: {
            where: { userId: user.userId },
          },
        },
      }),
      this.prisma.topic.count({ where }),
    ]);

    return {
      topics: topics.map((topic) => ({
        ...topic,
        userScore: topic.userTopicScores[0]?.score ?? 0,
        pinned: topic.userTopicScores[0]?.pinned ?? false,
        hidden: topic.userTopicScores[0]?.hidden ?? false,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getTopic(user: AuthenticatedUser, topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        documents: {
          take: 10,
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            title: true,
            publishedAt: true,
            summary: true,
            status: true,
            docType: true,
          },
        },
        userTopicScores: {
          where: { userId: user.userId },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException("Temat nie istnieje");
    }

    return {
      ...topic,
      userScore: topic.userTopicScores[0]?.score ?? 0,
      pinned: topic.userTopicScores[0]?.pinned ?? false,
      hidden: topic.userTopicScores[0]?.hidden ?? false,
    };
  }
}
