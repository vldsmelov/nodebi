"""Cross-statistic exactness audit against integer cents and stdlib rational quartiles."""

import random
import statistics
from decimal import Decimal, localcontext
from fractions import Fraction

import polars as pl
import pytest

from tests.test_boxplot_stats import run as boxplot
from tests.test_heatmap import run as heatmap
from tests.test_histogram import run as histogram


@pytest.mark.parametrize("seed", [0, 7, 19])
@pytest.mark.parametrize("offset", [0, 900719925474099300, -900719925474099300])
def test_exact_monetary_statistics_preserve_cent_differences_and_population(seed, offset):
    generator = random.Random(seed)
    cents = [generator.randint(-2000, 2000) for _ in range(257)] + [-100000, 100000]
    generator.shuffle(cents)
    exact = [Fraction(offset + value, 100) for value in cents]
    amounts = [Decimal(offset + value).scaleb(-2) for value in cents]
    values = [*amounts, None, None]
    with localcontext() as context:
        context.prec = 6  # Runtime arithmetic must not depend on the caller's Decimal context.
        boxes = boxplot(values, dtype=pl.Decimal(38, 2), scale=2)
        bins = histogram(values, dtype=pl.Decimal(38, 2), bin_count=7)
        cells = heatmap([("All", "Values", value) for value in values], dtype=pl.Decimal(38, 2))

    q1, median, q3 = statistics.quantiles(exact, n=4, method="inclusive")
    low, high = q1 - Fraction(3, 2) * (q3 - q1), q3 + Fraction(3, 2) * (q3 - q1)
    inside = [value for value in exact if low <= value <= high]
    outside = sorted(value for value in exact if value < low or value > high)
    summary = boxes["dataset"].frame.to_dicts()[0]
    assert [Fraction(summary[name]) for name in ("q1", "median", "q3")] == [q1, median, q3]
    assert Fraction(summary["lower_whisker"]) == min(inside)
    assert Fraction(summary["upper_whisker"]) == max(inside)
    assert Fraction(summary["minimum"]) == min(exact)
    assert Fraction(summary["maximum"]) == max(exact)
    assert [Fraction(value) for value in boxes["outliers"].frame["value"]] == outside
    assert (summary["count"], summary["missing_count"]) == (len(cents), 2)

    minimum, maximum = min(exact), max(exact)
    bounds = [minimum + (maximum - minimum) * Fraction(index, 7) for index in range(8)]
    expected_counts = [
        sum(bounds[index] <= value < bounds[index + 1] for value in exact) for index in range(7)
    ]
    expected_counts[-1] += exact.count(maximum)
    frame = bins["dataset"].frame
    assert frame["count"].to_list() == expected_counts
    assert [Fraction(value) for value in frame["lower"]] == bounds[:-1]
    assert [Fraction(value) for value in frame["upper"]] == bounds[1:]
    assert bins["summary"].frame["missing_count"][0] == 2
    cell = cells.frame.to_dicts()[0]
    assert Fraction(cell["value"]) == sum(exact)
    assert (cell["row_count"], cell["valid_count"], cell["missing_count"]) == (
        len(values),
        len(cents),
        2,
    )
