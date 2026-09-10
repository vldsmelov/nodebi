import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.domain.errors import ApplicationError

logger = logging.getLogger("nodebi.api")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApplicationError)
    async def application_error(request: Request, exc: ApplicationError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={
                "detail": {
                    "code": exc.code,
                    "message": exc.message,
                    "node_id": exc.node_id,
                    "execution_id": exc.execution_id,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": {
                    "code": "INVALID_REQUEST",
                    "message": "Check the highlighted request fields.",
                    "issues": [
                        {
                            "code": "INVALID_FIELD",
                            "message": error["msg"],
                            "field": ".".join(map(str, error["loc"])),
                        }
                        for error in exc.errors()
                    ],
                }
            },
        )

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        correlation_id = str(uuid.uuid4())
        logger.exception(
            "Unexpected API failure", exc_info=exc, extra={"correlation_id": correlation_id}
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "code": "INTERNAL_ERROR",
                    "message": "The operation could not be completed. Try again.",
                    "correlation_id": correlation_id,
                }
            },
        )
