import uuid
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.domain.parameters import ParameterDefinition, ParameterValue


class ParameterOptions(BaseModel):
    workflow_id: uuid.UUID
    node_id: uuid.UUID
    column_id: str = Field(min_length=1, max_length=200)


class DashboardParameter(ParameterDefinition):
    required: bool = False
    options: ParameterOptions | None = None


class ParameterBinding(BaseModel):
    workflow_id: uuid.UUID
    workflow_parameter: str = Field(min_length=1, max_length=64)
    dashboard_parameter: str = Field(min_length=1, max_length=64)


class NavigationValue(BaseModel):
    source: Literal["field", "parameter", "constant"]
    name: str = Field(default="", max_length=200)
    value: ParameterValue = None

    @model_validator(mode="after")
    def reference_required(self) -> Self:
        if self.source != "constant" and not self.name:
            raise ValueError("Select a field or parameter for the navigation value.")
        return self


class NavigationAction(BaseModel):
    dashboard_id: uuid.UUID
    values: dict[str, NavigationValue] = Field(default_factory=dict, max_length=64)


class DashboardLink(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    action: NavigationAction


class DashboardConfiguration(BaseModel):
    parameters: list[DashboardParameter] = Field(default_factory=list, max_length=64)
    bindings: list[ParameterBinding] = Field(default_factory=list, max_length=256)
    links: list[DashboardLink] = Field(default_factory=list, max_length=32)

    @model_validator(mode="after")
    def unique_names_and_bindings(self) -> Self:
        if len({item.name for item in self.parameters}) != len(self.parameters):
            raise ValueError("Dashboard parameter names must be unique.")
        if len({(item.workflow_id, item.workflow_parameter) for item in self.bindings}) != len(
            self.bindings
        ):
            raise ValueError("Each workflow parameter must have only one dashboard binding.")
        return self
