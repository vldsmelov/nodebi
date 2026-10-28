"""Independent cent/rational oracles across contribution and retention nodes."""

import random
from decimal import Decimal, localcontext
from fractions import Fraction
from itertools import accumulate

import polars as pl
import pytest

from tests.test_funnel import execute as funnel
from tests.test_pareto import execute as pareto
from tests.test_waterfall import run as waterfall


def money(cents: int) -> Decimal:
    sign = "-" if cents < 0 else ""
    whole, remainder = divmod(abs(cents), 100)
    return Decimal(f"{sign}{whole}.{remainder:02d}")


def percent(ratio: Fraction) -> Fraction:
    """Round percent to 12 places using only integer arithmetic and half-even ties."""
    numerator = ratio.numerator * 100 * 10**12
    quotient, remainder = divmod(numerator, ratio.denominator)
    if remainder * 2 > ratio.denominator or (remainder * 2 == ratio.denominator and quotient % 2):
        quotient += 1
    return Fraction(quotient, 10**12)


@pytest.mark.parametrize("seed", [0, 7, 19])
@pytest.mark.parametrize("offset", [0, 900719925474099300])
def test_ranked_contributions_balances_and_retention_share_one_exact_population(seed, offset):
    generator = random.Random(seed)
    cents = [offset + generator.randrange(1, 10000) for _ in range(28)] + [0, 1, 1]
    incoming = [(f"C{i:02d}", amount) for i, amount in enumerate(cents)]
    generator.shuffle(incoming)
    ordered = sorted(incoming, key=lambda row: (-row[1], row[0]))
    amounts = [amount for _, amount in ordered]
    running = list(accumulate(amounts))
    total = sum(amounts)
    remaining = [total, *(total - value for value in running)]
    # The same population is accumulated, then cancelled, with explicit checkpoints.
    waterfall_input = [("Opening", money(0), "initial")]
    expected_balances = [0]
    balance = 0
    for index, contribution in enumerate([*amounts, *(-value for value in reversed(amounts))]):
        balance += contribution
        waterfall_input.append((f"Change {index}", money(contribution), "change"))
        expected_balances.append(balance)
        if index % 7 == 0:
            waterfall_input.append((f"Checkpoint {index}", None, "subtotal"))
            expected_balances.append(balance)
    waterfall_input.append(("Closing", money(0), "total"))
    expected_balances.append(0)

    with localcontext() as context:
        context.prec = 3
        ranked = pareto([(key, money(value)) for key, value in incoming], pl.Decimal(38, 2))
        retained = funnel(
            [(f"Stage {index}", index, money(value)) for index, value in enumerate(remaining)],
            pl.Decimal(38, 2),
        )
        balances = waterfall(waterfall_input, dtype=pl.Decimal(38, 2))

    rows = ranked["dataset"].frame.to_dicts()
    assert [row["category"] for row in rows] == [key for key, _ in ordered]
    assert [row["rank"] for row in rows] == list(range(1, len(rows) + 1))
    for row, amount, cumulative in zip(rows, amounts, running, strict=True):
        assert Fraction(row["value"]) == Fraction(amount, 100)
        assert Fraction(row["cumulative_value"]) == Fraction(cumulative, 100)
        assert Fraction(row["share_exact"]) == Fraction(amount, total)
        assert Fraction(row["cumulative_exact"]) == Fraction(cumulative, total)
        assert Fraction(row["share_percent"]) == percent(Fraction(amount, total))
        assert Fraction(row["cumulative_percent"]) == percent(Fraction(cumulative, total))
    assert ranked["summary"].frame["input_count"][0] == len(amounts)
    assert Fraction(ranked["summary"].frame["total_value"][0]) == Fraction(total, 100)
    assert [Fraction(value) for value in balances.frame["balance"]] == [
        Fraction(value, 100) for value in expected_balances
    ]

    stages = retained["dataset"].frame.to_dicts()
    assert len(stages) == len(remaining)
    for index, (stage, value) in enumerate(zip(stages, remaining, strict=True)):
        assert Fraction(stage["value"]) == Fraction(value, 100)
        assert Fraction(stage["initial_exact"]) == Fraction(value, total)
        assert Fraction(stage["initial_percent"]) == percent(Fraction(value, total))
        if index == 0:
            assert stage["loss"] is None and stage["previous_exact"] is None
            continue
        assert Fraction(stage["loss"]) == Fraction(amounts[index - 1], 100)
        previous = remaining[index - 1]
        if previous:
            assert Fraction(stage["previous_exact"]) == Fraction(value, previous)
            assert Fraction(stage["previous_percent"]) == percent(Fraction(value, previous))
        else:
            assert stage["previous_exact"] is None and stage["previous_percent"] is None
    assert retained["summary"].frame["overall_percent"][0] == 0
