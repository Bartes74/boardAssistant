from app.core.embedding import fallback_embedding


def test_fallback_embedding_is_deterministic():
    text = "Przykładowy tekst"
    vec1 = fallback_embedding(text)
    vec2 = fallback_embedding(text)

    assert vec1 == vec2
    assert len(vec1) == 768
