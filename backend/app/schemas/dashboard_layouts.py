import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.dashboards import DashboardRead, DashboardSave, WidgetPayload


class DashboardLayoutRead(BaseModel):
    id: uuid.UUID
    name: str
    is_default: bool
    widgets: list[WidgetPayload]


class DashboardLayoutSave(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    dashboard: DashboardSave


class DashboardLayoutSaved(BaseModel):
    dashboard: DashboardRead
    template: DashboardLayoutRead
