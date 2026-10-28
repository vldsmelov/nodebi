"""Two adapters sharing a dataset contract; no worksheet knowledge leaks downstream."""

import csv
import io
from collections.abc import Iterator

import polars as pl

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.ingestion import ConnectorDefinition, ReadOptions, SourceResource
from app.domain.workbooks import WorksheetLayout
from app.infrastructure.excel import OpenPyxlWorkbookReader
from app.infrastructure.storage import StorageProvider

CONNECTORS = (
    ConnectorDefinition(
        type="excel",
        name="Excel",
        capabilities=["file", "resources", "schema", "batch_read"],
        extensions=[".xlsx", ".xlsm"],
    ),
    ConnectorDefinition(
        type="csv",
        name="CSV",
        capabilities=["file", "resources", "schema", "batch_read"],
        extensions=[".csv", ".tsv"],
    ),
    ConnectorDefinition(
        type="1c_odata",
        name="1C OData",
        status="planned",
        capabilities=["odata", "resources", "schema", "batch_read"],
    ),
    ConnectorDefinition(
        type="1c_http",
        name="1C HTTP",
        status="planned",
        capabilities=["http", "resources", "schema", "batch_read"],
    ),
)


class FileAdapter:
    def __init__(self, connector: str, storage: StorageProvider) -> None:
        self.definition = next(item for item in CONNECTORS if item.type == connector)
        if self.definition.status != "available":
            raise ValueError("This connector is planned, not available yet.")
        self.storage = storage

    def discover(self, storage_key: str, options: ReadOptions) -> list[SourceResource]:
        if self.definition.type == "excel":
            return [
                SourceResource(id=s.name, name=s.name, kind="worksheet", row_count=s.row_count)
                for s in OpenPyxlWorkbookReader(self.storage).inspect(storage_key).sheets
            ]
        dataset = self._read(storage_key, "table", options)
        return [SourceResource(id="table", name="Table", kind="table", row_count=dataset.row_count)]

    def schema(self, storage_key: str, resource_id: str, options: ReadOptions) -> DatasetSchema:
        return self._read(storage_key, resource_id, options).schema

    def read_batches(
        self, storage_key: str, resource_id: str, options: ReadOptions, batch_size: int = 10000
    ) -> Iterator[Dataset]:
        if batch_size < 1:
            raise ValueError("Batch size must be positive.")
        data = self._read(storage_key, resource_id, options)
        if not data.row_count:
            yield data
        for frame in data.frame.iter_slices(batch_size):
            yield Dataset(frame, data.schema, data.metadata)

    def _read(self, storage_key: str, resource_id: str, options: ReadOptions) -> Dataset:
        if self.definition.type == "excel":
            return OpenPyxlWorkbookReader(self.storage).load_sheet(
                storage_key,
                resource_id,
                WorksheetLayout(
                    header_row=options.header_row,
                    header_rows=options.header_rows,
                    skip_data_rows=options.skip_data_rows,
                    drop_tail_rows=options.drop_tail_rows,
                    cell_range=options.cell_range,
                ),
            )
        if options.cell_range is not None:
            raise ValueError("Cell ranges apply only to Excel sources.")
        if resource_id != "table":
            raise ValueError("CSV has one resource named table.")
        if options.header_rows != 1:
            raise ValueError("CSV supports one header row.")
        try:
            with (
                self.storage.open(storage_key) as stream,
                io.TextIOWrapper(stream, encoding=options.encoding, newline="") as text,
            ):
                reader = csv.reader(text, delimiter=options.delimiter, strict=True)
                for _ in range(options.header_row - 1):
                    next(reader, None)
                headers = next(reader, [])
                if not headers or len(headers) > 1024:
                    raise ValueError("CSV needs a header and at most 1024 columns.")
                for _ in range(options.skip_data_rows):
                    next(reader, None)
                rows: list[list[str | None]] = []
                for row in reader:
                    if len(row) != len(headers):
                        raise ValueError(
                            f"CSV record {reader.line_num} has a different number of columns."
                        )
                    if len(rows) >= 250000 or (len(rows) + 1) * len(headers) > 2000000:
                        raise ValueError("Table exceeds the 250000-row or 2000000-cell limit.")
                    rows.append([cell if cell != "" else None for cell in row])
        except (UnicodeError, csv.Error) as exc:
            raise ValueError("Cannot read CSV. Check encoding, delimiter and quoting.") from exc
        if options.drop_tail_rows:
            rows = rows[: -options.drop_tail_rows]
        columns = tuple(
            ColumnSchema(
                f"col_{i + 1}",
                f"col_{i + 1}",
                name.strip() or f"Column {i + 1}",
                LogicalType.STRING,
                True,
            )
            for i, name in enumerate(headers)
        )
        frame = pl.DataFrame(rows, schema={c.engine_name: pl.String for c in columns}, orient="row")
        return Dataset(frame, DatasetSchema(columns))
