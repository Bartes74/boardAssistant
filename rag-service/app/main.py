from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.api.router import router
from app.core.config import get_settings
from app.core.database import engine

settings = get_settings()

REQUEST_COUNTER = Counter(
    "rag_service_requests_total",
    "Liczba obsłużonych żądań",
    ["method", "path", "status"],
)
REQUEST_DURATION = Histogram(
    "rag_service_request_duration_seconds",
    "Czas trwania żądań",
    ["method", "path"],
    buckets=(0.05, 0.1, 0.2, 0.5, 1, 2, 5),
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = perf_counter()
    response: Response = await call_next(request)
    duration = perf_counter() - start

    path = request.url.path
    REQUEST_COUNTER.labels(request.method, path, response.status_code).inc()
    REQUEST_DURATION.labels(request.method, path).observe(duration)
    return response


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(router)
