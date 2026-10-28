import csv
import io
from decimal import Decimal

import pytest

from scripts.benchmark_http import fixture, run


@pytest.mark.parametrize("rows,width", [(0, 3), (100001, 3), (1, 2), (1, 21)])
def test_fixture_rejects_out_of_scope_sizes(rows, width):
    with pytest.raises(ValueError, match="import limits"):
        fixture(rows, width)


def test_fixture_preserves_codes_and_varies_exact_signed_amounts():
    content, expected = fixture(3000, 20)
    records = list(csv.DictReader(io.StringIO(content.decode())))
    assert len(records) == 3000
    assert len(records[0]) == 20
    assert records[0]["code"] == "000000000000"
    assert records[0]["amount"] == "-1000.00"
    assert records[2999]["amount"] == "109.63"
    assert sum(expected.values()) == Decimal("-1335555.00")
    changed_content, changed = fixture(3000, 20, first_row_delta=1)
    changed_rows = list(csv.DictReader(io.StringIO(changed_content.decode())))
    assert changed_rows[0]["amount"] == "-999.99"
    assert changed_rows[1:] == records[1:]
    assert changed["Group 0"] - expected["Group 0"] == Decimal("0.01")
    assert {key: value for key, value in changed.items() if key != "Group 0"} == {
        key: value for key, value in expected.items() if key != "Group 0"
    }


def test_disposable_http_pipeline_and_restart():
    result = run(30, 20)
    assert result["correctness"] == "passed"
    assert result["storage_bytes"] > result["csv_bytes"]
    assert len(result["seconds"]) == 7
    assert all(value > 0 for value in result["seconds"].values())
    evidence = result["cache_evidence"]
    assert evidence["cold"]["cache_hits"] == 0
    assert evidence["warm"]["cache_hits"] == evidence["warm"]["executed_nodes"] == 2
    assert evidence["updated_warm"]["cache_hits"] == 2
    assert {"staged_keeps_original", "updated", "rollback"} <= evidence.keys()
