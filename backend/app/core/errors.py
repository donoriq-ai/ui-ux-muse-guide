from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


# Convenience constructors matching contract error codes
def not_found(resource: str) -> AppError:
    return AppError(404, "NOT_FOUND", f"{resource} not found")


def conflict(message: str) -> AppError:
    return AppError(409, "CONFLICT", message)


def forbidden(message: str = "Insufficient permissions") -> AppError:
    return AppError(403, "FORBIDDEN", message)


def validation_error(message: str) -> AppError:
    return AppError(400, "VALIDATION_ERROR", message)


def rule_eval_failed(message: str) -> AppError:
    return AppError(422, "RULE_EVAL_FAILED", message)
