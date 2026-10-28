import pytest

from app.domain.formulas import FormulaValidationError, remap_expression


@pytest.mark.parametrize("quote", ["'", '"', "'''", '"""'])
@pytest.mark.parametrize("prefix", ["", "r"])
def test_restore_only_remaps_references_outside_string_literals(quote, prefix):
    old = "01234567-89ab-cdef-0123-456789abcdef"
    new = "fedcba98-7654-3210-fedc-ba9876543210"
    before, after = old.replace("-", ""), new.replace("-", "")
    literal = f"{prefix}{quote}calc_{before}{quote}"
    expression = f"if_else([category] == {literal}, [calc_{before}], None)"
    assert remap_expression(expression, {old: new}) == (
        f"if_else([category] == {literal}, [calc_{after}], None)"
    )


def test_restore_preserves_escaped_and_multiline_literals():
    expression = "if_else([code] == 'ab\\'ab', [calc_ab],\n if_else(True, 1, '''ab\nab'''))"
    assert remap_expression(expression, {"ab": "cd"}) == expression.replace(
        "[calc_ab]", "[calc_cd]"
    )


def test_invalid_token_stream_is_explicit():
    with pytest.raises(FormulaValidationError, match="invalid formula"):
        remap_expression("if_else(", {})


def test_unicode_line_separator_inside_a_literal_does_not_shift_following_tokens():
    expression = "if_else([code] == 'ab\u2028ab',\n [calc_ab], 'ab')"
    assert remap_expression(expression, {"ab": "cd"}) == expression.replace(
        "[calc_ab]", "[calc_cd]"
    )


@pytest.mark.parametrize(
    "field", ["0bba71d6c25e584c8944890584db200b", "0xnothex", "0oinvalid", "01leading"]
)
def test_source_field_ids_are_not_parsed_as_python_numeric_literals(field):
    expression = f"if_else([text] == '[{field}]', [{field}], None)"
    assert remap_expression(expression, {field: "new_id"}) == (
        f"if_else([text] == '[{field}]', [new_id], None)"
    )
