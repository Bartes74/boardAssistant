import { randomUUID } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { DocumentStatus, Prisma } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseService } from "../../supabase/supabase.service";
import { fallbackEmbeddingFromText } from "../../utils/embedding";
import { IngestSourceDto } from "./dto/ingest-source.dto";

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);
  private readonly storageBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    configService: ConfigService
  ) {
    this.storageBucket = configService.get<string>("supabase.storageBucket") ?? "documents";
  }

  async ingest(payload: IngestSourceDto) {
    const sourceId = this.ensureUuid(payload.source_id);

    const source = await this.prisma.source.upsert({
      where: { id: sourceId },
      create: {
        id: sourceId,
        name: payload.documents[0]?.metadata?.source_name ?? `Źródło ${sourceId}`,
        type: "other",
      },
      update: { updatedAt: new Date() },
    });

    const results = [];

    for (const doc of payload.documents) {
      const topicId = doc.topic_id ? this.ensureUuid(doc.topic_id) : null;

      const existing = doc.canonical_url
        ? await this.prisma.document.findUnique({ where: { canonicalUrl: doc.canonical_url } })
        : null;

      const status = this.resolveStatus(existing, doc.status);
      const data: Prisma.DocumentUpsertArgs["create"] = {
        sourceId: source.id,
        canonicalUrl: doc.canonical_url,
        title: doc.title,
        author: doc.author,
        publishedAt: doc.published_at ? new Date(doc.published_at) : null,
        summary: doc.summary,
        status,
        docType: doc.doc_type ?? "news",
        topicId,
        metadata: doc.chunks[0]?.metadata ?? {},
      };

      const document = await this.prisma.document.upsert({
        where: doc.canonical_url ? { canonicalUrl: doc.canonical_url } : { id: existing?.id ?? randomUUID() },
        create: data,
        update: {
          ...data,
          updatedAt: new Date(),
        },
      });

      await this.prisma.chunkEmbedding.deleteMany({ where: { docId: document.id } });

      await this.prisma.chunkEmbedding.createMany({
        data: doc.chunks.map((chunk, index) => ({
          docId: document.id,
          chunkIndex: index,
          text: chunk.text,
          embedding: chunk.embedding ?? fallbackEmbeddingFromText(chunk.text),
          metadata: chunk.metadata ?? {},
        })),
      });

      await this.persistRawDocument(document.id, doc);

      results.push({ documentId: document.id, status });
    }

    this.logger.log(`Zainjestowano ${results.length} dokumentów z ${payload.source_id}`);
    return { status: "ok", processed: results };
  }

  private resolveStatus(existing: Prisma.DocumentGetPayload<{ select: { status: true } }> | null, status?: string) {
    if (status && Object.values(DocumentStatus).includes(status as DocumentStatus)) {
      return status as DocumentStatus;
    }
    if (!existing) {
      return DocumentStatus.new;
    }
    return DocumentStatus.updated;
  }

  private ensureUuid(value?: string | null): string {
    if (value && UUID_REGEX.test(value)) {
      return value;
    }
    return randomUUID();
  }

  private async persistRawDocument(documentId: string, doc: IngestSourceDto["documents"][number]) {
    if (!this.supabase.isConfigured()) {
      return;
    }

    try {
      const payload = JSON.stringify({
        ...doc,
        stored_at: new Date().toISOString(),
      });
      await this.supabase.upload({
        bucket: this.storageBucket,
        path: `ingest/${documentId}.json`,
        data: payload,
        contentType: "application/json",
      });
    } catch (error) {
      this.logger.warn(`Nie udało się zapisać dokumentu ${documentId} w Supabase Storage: ${error}`);
    }
  }
}
