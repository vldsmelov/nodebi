"""Small fixtures test the measurement harness, not a performance target."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from scripts.benchmark_process import measure, process_peak_memory

pytestmark = pytest.mark.skipif(sys.platform not in {"win32", "linux"}, reason="OS memory API")


def test_process_memory_is_positive() -> None:
    sample = process_peak_memory()
    assert float(str(sample["peak_resident_mib"])) > 0
    assert sample["memory_provider"]


def test_unknown_workload_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown workload"):
        measure("unknown", 3, 3)


def test_cases_use_separate_processes_without_python_tracing() -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "scripts.benchmark_process", "--rows", "12"],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
        check=True,
        timeout=60,
    )
    records = [json.loads(line) for line in completed.stdout.splitlines()]
    assert records[0]["kind"] == "environment"
    cases = records[1:]
    assert len(cases) == 4
    assert len({case["pid"] for case in cases}) == 4
    assert all(case["pid"] != os.getpid() for case in cases)
    assert {(case["workload"], case["columns"]) for case in cases} == {
        (workload, width) for workload in ("normalization", "exact_formula") for width in (3, 100)
    }
    for case in cases:
        assert case["rows"] == 12 and case["correctness"] == "passed"
        assert case["python_peak_mib"] is None
        assert case["peak_resident_mib"] > 0
        assert case["cold_seconds"] >= 0 and case["repeat_seconds"] >= 0


@pytest.mark.parametrize("rows", ["0", "100001"])
def test_out_of_scope_sizes_are_rejected(rows: str) -> None:
    completed = subprocess.run(
        [sys.executable, "-m", "scripts.benchmark_process", "--rows", rows],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert completed.returncode == 2
    assert "Rows must be between" in completed.stderr
