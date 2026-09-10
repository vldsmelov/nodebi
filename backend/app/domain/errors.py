class GraphOwnershipError(ValueError):
    """A graph save attempted to claim identifiers owned by another workflow."""


class WorkflowConflictError(ValueError):
    """The saved workflow changed since the client loaded it."""


class NodeExecutionError(ValueError):
    """An expected execution failure with a message safe to show to the user."""


class ApplicationError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status: int = 422,
        *,
        node_id: str | None = None,
        execution_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.node_id = node_id
        self.execution_id = execution_id
