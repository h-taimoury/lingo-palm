from typing import Any

from django.core.exceptions import ValidationError


def validate_string_list(value: Any) -> None:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ValidationError("This value must be a JSON list of strings.")


def validate_examples(value: Any) -> None:
    if not isinstance(value, list):
        raise ValidationError("Examples must be a JSON list.")

    for item in value:
        if not isinstance(item, dict):
            raise ValidationError("Each example must be a JSON object.")
        if set(item) - {"text", "usage"}:
            raise ValidationError("Examples may contain only 'text' and 'usage'.")
        text = item.get("text")
        usage = item.get("usage")
        if not isinstance(text, str) or not text.strip():
            raise ValidationError("Each example requires non-empty text.")
        if usage is not None and not isinstance(usage, str):
            raise ValidationError("Example usage must be a string or null.")


def validate_pronunciation(value: Any) -> None:
    if value is None:
        return
    if not isinstance(value, dict):
        raise ValidationError("Pronunciation must be a JSON object or null.")
    if set(value) - {"text", "br_audio", "am_audio"}:
        raise ValidationError(
            "Pronunciation may contain only 'text', 'br_audio', and 'am_audio'."
        )
    for key in ("text", "br_audio", "am_audio"):
        item = value.get(key)
        if item is not None and not isinstance(item, str):
            raise ValidationError(f"Pronunciation '{key}' must be a string or null.")
