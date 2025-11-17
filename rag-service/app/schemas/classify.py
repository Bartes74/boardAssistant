from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    document_id: str = Field(..., alias="doc_id")
    text: str
    candidate_topics: list[str] | None = None


class ClassifyResponse(BaseModel):
    topic_id: str
    confidence: float
    created: bool = False
