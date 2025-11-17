import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_healthz():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_embed_endpoint_returns_vectors():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/embed", json={"texts": ["Ala ma kota"]})
    assert response.status_code == 200
    body = response.json()
    assert len(body["embeddings"]) == 1
    assert len(body["embeddings"][0]) == 768
