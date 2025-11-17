from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.answer import AnswerRequest, AnswerResponse
from app.schemas.classify import ClassifyRequest, ClassifyResponse
from app.schemas.embed import EmbedRequest, EmbedResponse
from app.services.assistant import build_answer, embed_texts, fetch_documents

router = APIRouter()


@router.get("/healthz", status_code=status.HTTP_200_OK)
async def healthz():
    return {"status": "ok"}


@router.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    embeddings = embed_texts(request.texts)
    return EmbedResponse(embeddings=embeddings)


@router.post("/answer", response_model=AnswerResponse)
async def answer(
    payload: AnswerRequest,
    session: AsyncSession = Depends(get_session),
):
    rows = await fetch_documents(session, payload)
    query_id = f"rag-{len(rows)}-{payload.user_profile.id}"
    return build_answer(query_id, payload, rows)


@router.post("/classify-topic", response_model=ClassifyResponse)
async def classify_topic(payload: ClassifyRequest):
    # PoC: zwracamy istniejący temat jeśli przesłano candidate_topics, w przeciwnym wypadku nowy.
    topic_id = payload.candidate_topics[0] if payload.candidate_topics else f"topic-{payload.document_id}"
    created = not payload.candidate_topics
    confidence = 0.7 if created else 0.85
    return ClassifyResponse(topic_id=topic_id, confidence=confidence, created=created)
