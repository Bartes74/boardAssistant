import hashlib

VECTOR_DIMENSION = 768


def fallback_embedding(text: str) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    for index in range(VECTOR_DIMENSION):
        byte = digest[index % len(digest)]
        normalized = (byte / 255) * 2 - 1
        values.append(round(normalized, 6))
    return values
