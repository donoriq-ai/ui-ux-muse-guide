import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.errors import AppError, app_error_handler

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TissueQA API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL", "message": "An unexpected error occurred", "details": {}}},
    )


# ── Routes ────────────────────────────────────────────────────────────────────
from app.routes import auth, donors, documents, audit, users, settings as settings_router  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(donors.router, prefix="/donors", tags=["donors"])
app.include_router(documents.router, prefix="/donors", tags=["documents"])
app.include_router(audit.router, prefix="/audit", tags=["audit"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(settings_router.router, prefix="/tenants", tags=["settings"])


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "extractor": "reducto",
        "evaluator": "anthropic",
        "ruleset_version": settings.ruleset_version,
    }
