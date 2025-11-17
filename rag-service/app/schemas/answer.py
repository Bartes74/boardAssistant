from datetime import date
from typing import Any

from pydantic import BaseModel, Field


class UserProfilePayload(BaseModel):
    id: str = Field(..., alias="user_id")
    role: str | None = None
    regions: list[str] | None = None
    industries: list[str] | None = None
    keywords_include: list[str] | None = None
    keywords_exclude: list[str] | None = None
    response_style: dict[str, Any] | None = None


class AnswerRequest(BaseModel):
    user_profile: UserProfilePayload
    question: str = Field(..., min_length=4)
    from_date: date | None = None
    to_date: date | None = None
    language: str | None = None


class TopicSnippet(BaseModel):
    id: str | None = None
    title: str | None = None
    status: str | None = None
    summary: str | None = None
    score: float | None = None


class ArticleSnippet(BaseModel):
    id: str
    title: str
    url: str | None = None
    summary: str | None = None
    published_at: date | None = None


class ActionRecommendation(BaseModel):
    title: str
    description: str


class AnswerResponse(BaseModel):
    query_id: str
    tldr: str
    events: list[str]
    articles: list[ArticleSnippet]
    actions: list[ActionRecommendation]
    topics: list[TopicSnippet]
    confidence: float = Field(ge=0, le=1)
