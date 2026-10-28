"""Fresh-process normalization/formula measurements, including native resident memory.

Run from backend: python -m scripts.benchmark_process
Each JSON line is an environment record or a completed, correctness-checked case.
No database, network, source files or application servers are used.
"""

import argparse
import ctypes
import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path


def process_peak_memory() -> dict[str, object]:
    """Lifetime high-water marks, not a sum of independently sampled allocations."""
    if sys.platform == "win32":
        from ctypes import wintypes

        class Counters(ctypes.Structure):
            _fields_ = [
                ("cb", wintypes.DWORD),
                ("PageFaultCount", wintypes.DWORD),
                *[
                    (name, ctypes.c_size_t)
                    for name in (
                        "PeakWorkingSetSize",
                        "WorkingSetSize",
                        "QuotaPeakPagedPoolUsage",
                        "QuotaPagedPoolUsage",
                        "QuotaPeakNonPagedPoolUsage",
                        "QuotaNonPagedPoolUsage",
                        "PagefileUsage",
                        "PeakPagefileUsage",
                    )
                ],
            ]

        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.GetCurrentProcess.restype = wintypes.HANDLE
        psapi = ctypes.WinDLL("psapi", use_last_error=True)
        read = psapi.GetProcessMemoryInfo
        read.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        read.restype = wintypes.BOOL
        counters = Counters()
        counters.cb = ctypes.sizeof(counters)
        if not read(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
            raise ctypes.WinError(ctypes.get_last_error())
        return {
            "peak_resident_mib": round(int(counters.PeakWorkingSetSize) / 1024**2, 2),
            "peak_commit_mib": round(int(counters.PeakPagefileUsage) / 1024**2, 2),
            "memory_provider": "Windows GetProcessMemoryInfo",
        }
    if sys.platform == "linux":
        import resource

        return {
            "peak_resident_mib": round(
                resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 2
            ),
            "peak_commit_mib": None,
            "memory_provider": "Linux getrusage(RUSAGE_SELF)",
        }
    raise RuntimeError("Process memory measurement supports Windows and Linux only.")


def measure(workload: str, rows: int, width: int) -> dict[str, object]:
    import polars as pl

    from scripts.benchmark_exact_formulas import run as formulas
    from scripts.benchmark_ingestion import run as normalization

    start = time.perf_counter()
    if workload == "normalization":
        result = normalization(rows, width, trace_memory=False)
    elif workload == "exact_formula":
        result = formulas(rows, width, conditional=True, trace_memory=False)
    else:
        raise ValueError(f"Unknown workload: {workload}")
    return {
        "kind": "measurement",
        "workload": workload,
        "pid": os.getpid(),
        "polars_version": pl.__version__,
        **result,
        **process_peak_memory(),
        "case_seconds": round(time.perf_counter() - start, 3),
        "correctness": "passed",
        "memory_scope": "Whole child lifetime: imports, source and both uncached runs; "
        "includes native allocations; Python tracing disabled. Not API/browser or file parsing.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=100000)
    parser.add_argument("--widths", type=int, nargs="+", choices=(3, 100), default=[3, 100])
    parser.add_argument(
        "--workload", choices=("all", "normalization", "exact_formula"), default="all"
    )
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not 1 <= args.rows <= 100000:
        parser.error("Rows must be between 1 and 100000.")
    if args.worker:
        if args.workload == "all" or len(args.widths) != 1:
            parser.error("A worker measures exactly one case.")
        print(json.dumps(measure(args.workload, args.rows, args.widths[0])), flush=True)
        return
    print(
        json.dumps(
            {
                "kind": "environment",
                "python": platform.python_version(),
                "platform": platform.platform(),
                "logical_cpus": os.cpu_count(),
                "note": "Fresh child per case. Peaks are not incremental allocation totals.",
            }
        ),
        flush=True,
    )
    workloads = ("normalization", "exact_formula") if args.workload == "all" else (args.workload,)
    for workload in workloads:
        for width in args.widths:
            completed = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "scripts.benchmark_process",
                    "--worker",
                    "--workload",
                    workload,
                    "--rows",
                    str(args.rows),
                    "--widths",
                    str(width),
                ],
                cwd=Path(__file__).resolve().parents[1],
                capture_output=True,
                text=True,
                check=True,
                timeout=900,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            print(json.dumps(json.loads(completed.stdout)), flush=True)


if __name__ == "__main__":
    main()
