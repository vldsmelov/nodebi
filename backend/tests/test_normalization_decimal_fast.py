"""Native normalization must retain the scalar converter's exact contract."""

from decimal import Decimal
from random import Random

import polars as pl
import pytest

from app.domain.datasets import ColumnSchema, Dataset, DatasetSchema, LogicalType
from app.domain.ingestion import ImportField, ImportProfile
from app.services import normalization


def source(values: list[str | None]) -> Dataset:
    return Dataset(
        pl.DataFrame({"raw": pl.Series(values, dtype=pl.String)}),
        DatasetSchema((ColumnSchema("input", "raw", "Original", LogicalType.STRING, True),)),
    )


def profile(**overrides: object) -> ImportProfile:
    field = ImportField.model_validate(
        {
            "field_id": "amount",
            "source_field": "input",
            "name": "Amount",
            "logical_type": "decimal",
            "precision": 38,
            "scale": 2,
            "currency": "RUB",
            **overrides,
        }
    )
    return ImportProfile(resource_id="table", name="Exact", grain="one order", fields=[field])


def test_clean_decimal_column_does_not_materialize_python_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def forbidden(*args: object) -> None:
        raise AssertionError("Clean decimal strings must not use the per-row Python converter.")

    monkeypatch.setattr(normalization, "convert_input_value", forbidden)
    result, preview = normalization.normalize(
        source(["9007199254740993.11", "-0.00", None]), profile()
    )
    assert result.frame["amount"].to_list() == [Decimal("9007199254740993.11"), Decimal(0), None]
    assert preview.can_apply and preview.issue_count == 0


@pytest.mark.parametrize("precision,scale", [(1, 0), (2, 2), (5, 2), (38, 0), (38, 2), (38, 38)])
@pytest.mark.parametrize("separator", [".", ","])
def test_precision_boundaries_and_random_values_match_scalar(
    monkeypatch: pytest.MonkeyPatch, precision: int, scale: int, separator: str
) -> None:
    rng = Random(20261012)
    coefficients = [0, 1, -(10**precision - 1), 10**precision - 1]
    coefficients += [rng.randrange(-(10**precision - 1), 10**precision) for _ in range(200)]
    values: list[str | None] = []
    for coefficient in coefficients:
        digits = str(abs(coefficient)).zfill(scale + 1)
        text = ("-" if coefficient < 0 else "") + (
            f"{digits[:-scale]}.{digits[-scale:]}" if scale else digits
        )
        values.append(text.replace(".", separator))
    values += [None, "-0", "0" + separator + "0" * (scale + 3)]
    settings = profile(precision=precision, scale=scale, decimal_separator=separator)
    data = source(values)
    assert normalization._fast_decimal_series(data.frame["raw"], settings.fields[0]) is not None
    actual, preview = normalization.normalize(data, settings, limit=7)
    monkeypatch.setattr(normalization, "_fast_decimal_series", lambda *_: None)
    expected, reference = normalization.normalize(data, settings, limit=7)
    assert actual.frame.equals(expected.frame)
    assert actual.schema == expected.schema and actual.metadata == expected.metadata
    assert preview == reference
    assert preview.can_apply and preview.checked_rows == len(values)


@pytest.mark.parametrize("policy", ["reject", "null"])
@pytest.mark.parametrize("separator", [".", ","])
def test_fallback_preserves_full_data_errors_and_unusual_decimal_syntax(
    monkeypatch: pytest.MonkeyPatch, policy: str, separator: str
) -> None:
    values = ["1.20".replace(".", separator)] * 105 + [
        "001.20",
        "+2",
        " 3 ",
        "4e-1",
        "1_0",
        "١٢",
        "1.001",
        "1000",
        "NaN",
        "Infinity",
        "bad",
        "",
        None,
        "1\n",
        "1,23",
        "0." + "0" * 200,
    ]
    settings = profile(
        precision=5,
        scale=2,
        nullable=policy == "null",
        error_policy=policy,
        decimal_separator=separator,
    )
    data = source(values)
    actual, preview = normalization.normalize(data, settings, limit=2)
    monkeypatch.setattr(normalization, "_fast_decimal_series", lambda *_: None)
    expected, reference = normalization.normalize(data, settings, limit=2)
    assert actual.frame.equals(expected.frame) and preview == reference
    assert preview.issue_count > 0 and all(
        issue.row and issue.row > 105 for issue in preview.issues
    )
    assert preview.can_apply == (policy == "null")


def test_full_column_validation_never_truncates_nonzero_fraction() -> None:
    result, preview = normalization.normalize(
        source(["1.00"] * 200 + ["1.001"] * 105), profile(), limit=2
    )
    assert not preview.can_apply and preview.checked_rows == 305
    assert preview.issue_count == 105 and len(preview.issues) == 100
    assert preview.issues[0].row == 201 and preview.issues[-1].row == 300
    assert result.frame["amount"].null_count() == 105


@pytest.mark.parametrize("values", [[], [None, None], ["0.00", "0.00"]])
def test_empty_null_and_duplicate_key_behavior(
    monkeypatch: pytest.MonkeyPatch, values: list[str | None]
) -> None:
    settings = profile()
    settings.key_fields = ["amount"]
    actual, preview = normalization.normalize(source(values), settings)
    monkeypatch.setattr(normalization, "_fast_decimal_series", lambda *_: None)
    expected, reference = normalization.normalize(source(values), settings)
    assert actual.frame.equals(expected.frame) and preview == reference
