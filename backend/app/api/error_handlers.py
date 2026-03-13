"""Centralized error handling with consistent error codes."""
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# Standard error codes for client handling
ERROR_CODES = {
    "BASELINE_EXAM_REQUIRED": status.HTTP_403_FORBIDDEN,
    "MODULE_TIME_EXPIRED": status.HTTP_409_CONFLICT,
    "SESSION_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "QUESTION_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "USER_NOT_FOUND": status.HTTP_404_NOT_FOUND,
    "INVALID_INPUT": status.HTTP_400_BAD_REQUEST,
}


async def http_exception_handler(request: Request, exc) -> JSONResponse:
    """Ensure JSON responses include code when detail is a known code."""
    detail = getattr(exc, "detail", str(exc))
    if isinstance(detail, str) and detail in ERROR_CODES:
        status_code = ERROR_CODES[detail]
        return JSONResponse(
            status_code=status_code,
            content={"code": detail, "message": detail},
        )
    if isinstance(detail, dict) and detail.get("code") in ERROR_CODES:
        return JSONResponse(status_code=exc.status_code, content=detail)
    status_code = getattr(exc, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
    return JSONResponse(
        status_code=status_code,
        content={"message": detail} if isinstance(detail, str) else detail,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log and return 500 with generic message."""
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled exception request_id=%s: %s", request_id, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."},
    )
