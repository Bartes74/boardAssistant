from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.embedding import fallback_embedding
from app.schemas.answer import (
    ActionRecommendation,
    AnswerRequest,
    AnswerResponse,
    ArticleSnippet,
    TopicSnippet,
)


async def fetch_documents(session: AsyncSession, request: AnswerRequest) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"user_id": request.user_profile.id}
    filters: list[str] = ["uts.\"user_id\" = :user_id"]

    if request.from_date:
        params["from_date"] = request.from_date
        filters.append('d."published_at" >= :from_date')
    if request.to_date:
        params["to_date"] = request.to_date + timedelta(days=1)
        filters.append('d."published_at" <= :to_date')

    base_query = """
        SELECT d."id" as doc_id,
               d."title",
               d."summary",
               d."canonical_url",
               d."published_at",
               d."doc_type",
               t."id" as topic_id,
               t."title" as topic_title,
               t."topic_status",
               uts."score" as user_score
        FROM "UserTopicScore" uts
        JOIN "Document" d ON d."topic_id" = uts."topic_id"
        LEFT JOIN "Topic" t ON d."topic_id" = t."id"
    """

    if filters:
        base_query += " WHERE " + " AND ".join(filters)

    base_query += " ORDER BY uts.\"score\" DESC, d.""published_at"" DESC NULLS LAST LIMIT 20"

    result = await session.execute(text(base_query), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


def build_topics(rows: list[dict[str, Any]]) -> list[TopicSnippet]:
    topics: dict[str, TopicSnippet] = {}
    for row in rows:
        topic_id = row.get("topic_id")
        if not topic_id:
            continue
        topic = topics.get(topic_id)
        if topic is None:
            topic = TopicSnippet(
                id=topic_id,
                title=row.get("topic_title"),
                status=row.get("topic_status"),
                summary=row.get("summary"),
                score=float(row.get("user_score") or 0.5),
            )
            topics[topic_id] = topic
    return list(topics.values())


def build_articles(rows: list[dict[str, Any]]) -> list[ArticleSnippet]:
    articles: list[ArticleSnippet] = []
    for row in rows[:6]:
        articles.append(
            ArticleSnippet(
                id=row["doc_id"],
                title=row["title"],
                url=row.get("canonical_url"),
                summary=row.get("summary"),
                published_at=(row.get("published_at") or datetime.utcnow()).date(),
            )
        )
    return articles


def build_actions(topics: list[TopicSnippet]) -> list[ActionRecommendation]:
    actions: list[ActionRecommendation] = []
    for topic in topics[:3]:
        actions.append(
            ActionRecommendation(
                title=f"Sprawdź dalsze kroki dla tematu: {topic.title}",
                description="Zaplanuj spotkanie z właścicielem tematu i określ dalsze działania.",
            )
        )
    if not actions:
        actions.append(
            ActionRecommendation(
                title="Brak konkretnych zaleceń",
                description="Brak wystarczającego kontekstu do wygenerowania rekomendacji.",
            )
        )
    return actions


def synthesize_tldr(question: str, topics: list[TopicSnippet], articles: list[ArticleSnippet]) -> str:
    topic_titles = ", ".join(filter(None, (topic.title for topic in topics))) or "brak nowych tematów"
    article_titles = ", ".join(article.title for article in articles[:3]) or "brak artykułów"
    return (
        f"Odpowiadając na pytanie '{question}', kluczowe zagadnienia to: {topic_titles}. "
        f"Najważniejsze materiały do przejrzenia: {article_titles}."
    )


def add_events(articles: list[ArticleSnippet]) -> list[str]:
    events: list[str] = []
    for article in articles:
        events.append(f"{article.published_at.isoformat()} – {article.title}")
    return events


def build_answer(query_id: str, request: AnswerRequest, rows: list[dict[str, Any]]) -> AnswerResponse:
    topics = build_topics(rows)
    articles = build_articles(rows)
    events = add_events(articles)
    actions = build_actions(topics)
    confidence = 0.5 + min(len(articles), 5) * 0.08
    return AnswerResponse(
        query_id=query_id,
        tldr=synthesize_tldr(request.question, topics, articles),
        events=events,
        articles=articles,
        actions=actions,
        topics=topics,
        confidence=min(confidence, 0.95),
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    return [fallback_embedding(text) for text in texts]
