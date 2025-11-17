from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.core.database import get_session
from app.core.embedding import fallback_embedding


async def main() -> None:
    async with get_session() as session:
        result = await session.execute(
            text("SELECT \"id\", \"title\", \"summary\" FROM \"Document\" ORDER BY \"created_at\" DESC LIMIT 3")
        )
        documents = result.mappings().all()
        for doc in documents:
            embedding = fallback_embedding(doc.get("summary") or doc.get("title") or "")
            print(f"Doc {doc['id']} → deterministic embedding[{len(embedding)}]")


if __name__ == "__main__":
    asyncio.run(main())
