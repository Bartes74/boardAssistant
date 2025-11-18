import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { QueryAssistantDto } from "./dto/query-assistant.dto";
import { AssistantFeedbackDto } from "./dto/assistant-feedback.dto";
import { Prisma } from "@prisma/client";

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.client = axios.create({
      baseURL: config.get<string>("ragService.baseUrl"),
      timeout: config.get<number>("ragService.timeoutMs"),
    });
  }

  async query(user: AuthenticatedUser, dto: QueryAssistantDto) {
    const profile = await this.prisma.userProfile.upsert({
      where: { id: user.userId },
      update: {
        role: user.role,
        email: user.email,
      },
      create: {
        id: user.userId,
        role: user.role,
        email: user.email,
        regions: [],
        industries: [],
        competitorsWatch: [],
        keywordsInclude: [],
        keywordsExclude: [],
        detailLevel: "medium",
        responseStyle: {
          length: "short",
          format: "bullets",
          language: "pl",
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const payload = {
      user_profile: profile ?? { id: user.userId, role: user.role },
      question: dto.question,
      from_date: dto.from_date,
      to_date: dto.to_date,
      language: dto.language ?? profile?.language ?? "pl",
    };

    try {
      const { data } = await this.client.post("/answer", payload);
      
      // Walidacja odpowiedzi z RAG service
      if (!data || typeof data !== "object") {
        throw new Error("Nieprawidłowa odpowiedź z RAG service");
      }

      const topicIds: string[] = Array.isArray(data?.topics)
        ? data.topics
            .map((topic: { id?: string }) => topic.id)
            .filter((value: unknown): value is string => typeof value === "string" && UUID_REGEX.test(value))
        : [];

      const queryLog = await this.prisma.userQueryLog.create({
        data: {
          userId: user.userId,
          question: dto.question,
          responseSummary: data?.tldr ?? null,
          topicIds,
          fromDate: dto.from_date ? new Date(dto.from_date) : null,
          toDate: dto.to_date ? new Date(dto.to_date) : null,
          metadata: {
            language: payload.language,
            raw_topics: data?.topics ?? [],
          },
        },
      }).catch((error) => {
        this.logger.warn(`Nie udało się zapisać logu zapytania: ${error}`);
        // Kontynuuj mimo błędu zapisu logu
        return null;
      });

      // Aktualizuj scoring tematów (nie blokuj odpowiedzi przy błędzie)
      await Promise.all(
        topicIds.map((topicId) =>
          this.prisma.userTopicScore.upsert({
            where: {
              userId_topicId: { userId: user.userId, topicId },
            },
            update: {
              score: { increment: 0.5 },
              lastSeenAt: new Date(),
              interactionsCount: { increment: 1 },
            },
            create: {
              userId: user.userId,
              topicId,
              score: 1.0,
              lastSeenAt: new Date(),
              interactionsCount: 1,
            },
          }).catch((error) => {
            this.logger.warn(`Nie udało się zaktualizować scoringu tematu ${topicId}: ${error}`);
            return null;
          })
        )
      );

      return { 
        ...data, 
        query_id: queryLog?.id ?? `temp-${Date.now()}`,
        // Upewnij się, że wszystkie wymagane pola są obecne
        tldr: data.tldr ?? "Brak podsumowania",
        events: Array.isArray(data.events) ? data.events : [],
        articles: Array.isArray(data.articles) ? data.articles : [],
        actions: Array.isArray(data.actions) ? data.actions : [],
        topics: Array.isArray(data.topics) ? data.topics : [],
        confidence: typeof data.confidence === "number" ? data.confidence : 0,
      };
    } catch (error) {
      this.logger.error(`Błąd połączenia z rag-service: ${error}`);
      
      // Jeśli to błąd sieciowy lub timeout, rzuć wyjątek
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
          throw new Error(`RAG service nie jest dostępny: ${error.message}`);
        }
        if (error.response && error.response.status >= 500) {
          const status = error.response.status;
          const statusText = error.response.statusText || "Unknown error";
          throw new Error(`Błąd serwera RAG: ${status} ${statusText}`);
        }
      }
      
      // Dla innych błędów zwróć fallback
      return {
        query_id: `fallback-${Date.now()}`,
        tldr: "Brak odpowiedzi z usługi wiedzy. Sprawdź konfigurację RAG service.",
        events: [],
        articles: [],
        actions: [],
        topics: [],
        confidence: 0,
      };
    }
  }

  async feedback(user: AuthenticatedUser, dto: AssistantFeedbackDto) {
    await this.prisma.userQueryLog.update({
      where: { id: dto.queryId },
      data: {
        metadata: {
          markAsUseful: dto.markAsUseful ?? null,
          importantTopics: dto.importantTopics ?? [],
          completedArticles: dto.completedArticles ?? [],
        },
      },
    }).catch((error) => this.logger.warn(`Nie udało się zaktualizować logu: ${error}`));

    const topicIds = (dto.importantTopics ?? []).filter((value): value is string => Boolean(value) && UUID_REGEX.test(value));

    await Promise.all(
      topicIds.map((topicId) =>
        this.prisma.userTopicScore.upsert({
          where: { userId_topicId: { userId: user.userId, topicId } },
          create: {
            userId: user.userId,
            topicId,
            score: dto.markAsUseful ? 2.0 : 0.5,
            lastSeenAt: new Date(),
            interactionsCount: 1,
            pinned: dto.markAsUseful ?? false,
          },
          update: {
            score: { increment: dto.markAsUseful ? 1.5 : 0.5 },
            lastSeenAt: new Date(),
            interactionsCount: { increment: 1 },
            pinned: dto.markAsUseful ? true : undefined,
          },
        })
      )
    );

    return { status: "ok" };
  }
}
