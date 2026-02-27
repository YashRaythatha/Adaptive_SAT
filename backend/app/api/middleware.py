"""Middleware: request_id, structured logging."""
import logging
import uuid
from fastapi import Request

logger = logging.getLogger(__name__)


async def request_id_and_logging_middleware(request: Request, call_next):
    """Add request_id to state and log request/response."""
    request_id = str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    response = await call_next(request)
    logger.info(
        "request_id=%s method=%s path=%s status=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
    )
    response.headers["X-Request-ID"] = request_id
    return response
