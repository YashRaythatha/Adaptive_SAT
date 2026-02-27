"""FastAPI application entrypoint."""
import logging
from fastapi import FastAPI
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.api_router import api_router
from app.api.error_handlers import http_exception_handler, unhandled_exception_handler
from app.api.middleware import request_id_and_logging_middleware

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")

app = FastAPI(title="Adaptive SAT API", version="0.1.0")
app.middleware("http")(request_id_and_logging_middleware)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
app.include_router(api_router)
