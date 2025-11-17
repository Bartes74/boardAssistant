from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_items=1, description="List of texts to embed")


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str = "fallback"
