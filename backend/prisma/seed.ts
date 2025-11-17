import { PrismaClient, TopicStatus, UserRole, DocumentStatus } from "@prisma/client";
import { fallbackEmbeddingFromText } from "../src/utils/embedding";

const prisma = new PrismaClient();

const CEO_ID = "00000000-0000-0000-0000-0000000000ce";
const CFO_ID = "00000000-0000-0000-0000-0000000000cf";
const SOURCE_ID = "11111111-1111-1111-1111-111111111111";
const TOPIC_ID = "22222222-2222-2222-2222-222222222222";
const DOCUMENT_ID = "33333333-3333-3333-3333-333333333333";

async function main() {
  const ceo = await prisma.userProfile.upsert({
    where: { id: CEO_ID },
    update: {},
    create: {
      id: CEO_ID,
      role: UserRole.BOARD_MEMBER,
      email: "ceo@example.com",
      regions: ["PL", "EU"],
      industries: ["banking"],
      competitorsWatch: ["Bank A", "Bank B"],
      keywordsInclude: ["MREL", "ESG"],
      keywordsExclude: ["marketing"],
      detailLevel: "high",
      responseStyle: { length: "short", format: "bullets", language: "pl" },
      sourcePrefs: { internal_priority: true, exclude_social: true },
    },
  });

  const cfo = await prisma.userProfile.upsert({
    where: { id: CFO_ID },
    update: {},
    create: {
      id: CFO_ID,
      role: UserRole.BOARD_MEMBER,
      email: "cfo@example.com",
      regions: ["PL"],
      industries: ["fintech"],
      competitorsWatch: ["Fintech X"],
      keywordsInclude: ["IFRS", "cyber risk"],
      keywordsExclude: ["HR"],
      detailLevel: "medium",
      responseStyle: { length: "medium", format: "narrative", language: "pl" },
      sourcePrefs: { internal_priority: true },
    },
  });

  const sourceRss = await prisma.source.upsert({
    where: { id: SOURCE_ID },
    update: {},
    create: {
      id: SOURCE_ID,
      type: "rss",
      name: "Kanał finansowy",
      baseUrl: "https://example.com/rss",
      defaultLanguage: "pl",
    },
  });

  const topic = await prisma.topic.upsert({
    where: { id: TOPIC_ID },
    update: {},
    create: {
      id: TOPIC_ID,
      title: "Nowe regulacje ESG",
      description: "Aktualizacje dotyczące raportowania ESG w sektorze bankowym",
      topicStatus: TopicStatus.growing,
      tags: ["ESG", "Regulacje"],
    },
  });

  const document = await prisma.document.upsert({
    where: { canonicalUrl: "https://example.com/esg/weekly" },
    update: {},
    create: {
      id: DOCUMENT_ID,
      sourceId: sourceRss.id,
      canonicalUrl: "https://example.com/esg/weekly",
      title: "Tydzień ESG – nowe wymagania raportowe",
      author: "Zespół analiz",
      publishedAt: new Date(),
      summary: "Najważniejsze zmiany w raportowaniu ESG dla banków w UE.",
      status: DocumentStatus.new,
      docType: "news",
      topicId: topic.id,
      metadata: { language: "pl" },
    },
  });

  const chunkText =
    "Komisja Europejska ogłosiła nowe wytyczne dotyczące raportowania ESG dla instytucji finansowych.";

  await prisma.chunkEmbedding.deleteMany({ where: { docId: document.id } });
  await prisma.chunkEmbedding.create({
    data: {
      docId: document.id,
      chunkIndex: 0,
      text: chunkText,
      embedding: fallbackEmbeddingFromText(chunkText),
      metadata: { section: "summary" },
    },
  });

  await prisma.userTopicScore.upsert({
    where: { userId_topicId: { userId: ceo.id, topicId: topic.id } },
    update: {},
    create: {
      userId: ceo.id,
      topicId: topic.id,
      score: 1.5,
      lastSeenAt: new Date(),
      interactionsCount: 1,
    },
  });

  await prisma.userTopicScore.upsert({
    where: { userId_topicId: { userId: cfo.id, topicId: topic.id } },
    update: {},
    create: {
      userId: cfo.id,
      topicId: topic.id,
      score: 1.0,
      lastSeenAt: new Date(),
      interactionsCount: 1,
    },
  });

  console.log("Seed danych PoC zakończony");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
