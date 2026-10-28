import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict


class FileExchangeStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_id: uuid.UUID
    request_id: uuid.UUID
    reuse_existing: bool = False


class FileExchangeRead(BaseModel):
    source_id: uuid.UUID
    source_name: str
    connector: Literal["excel", "csv"]
    filename: str
    base_token: str
    template_available: bool
    template_reason: str | None = None
