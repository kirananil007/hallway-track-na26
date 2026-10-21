import pytest

from normalize import SUMMARY_MAX, clean_track, detect_level, detect_type, summarize


@pytest.mark.parametrize(
    "track, title, expected",
    [
        ("Keynote Sessions", "Welcome Back", "keynote"),
        ("", "Keynote: Something Big", "keynote"),
        ("CNCF-hosted Co-located Events", "ArgoCon Hosted by CNCF - Full Day Event", "colocated"),
        ("Sponsor-hosted Co-located Events", "Some Sponsor Day", "colocated"),
        ("Lightning Talks", "Five Minutes on Wasm", "lightning"),
        ("Project Lightning Talks", "Project Update", "lightning"),
        ("Project Lightning Talks", "BREAK", "other"),
        ("Breaks", "Lunch", "other"),
        ("Registration", "Registration + Badge Pick-Up", "other"),
        ("Solutions Showcase", "Expo Hall Open", "other"),
        ("Observability", "Breakout Session About Traces", "breakout"),
        ("Tutorials", "Hands-on With Gateway API", "breakout"),
    ],
)
def test_detect_type(track, title, expected):
    assert detect_type(track, title) == expected


@pytest.mark.parametrize(
    "hint, expected",
    [
        ("Beginner", "beginner"),
        (" beginner ", "beginner"),
        ("Intermediate", "intermediate"),
        ("Advanced", "advanced"),
        ("Any Level", "unknown"),
        ("", "unknown"),
    ],
)
def test_detect_level(hint, expected):
    assert detect_level(hint) == expected


def test_clean_track_strips_leading_emoji():
    assert clean_track("⚡ Lightning Talks") == "Lightning Talks"
    assert clean_track("🚨 Contribfest") == "Contribfest"
    assert clean_track("AI Inference + Agentic") == "AI Inference + Agentic"


def test_short_summary_is_unchanged():
    assert summarize("  Short   and sweet. ") == "Short and sweet."


def test_empty_summary():
    assert summarize(None) == ""
    assert summarize("") == ""


def test_long_summary_is_cut_at_a_word_boundary():
    text = ("word " * 100).strip()
    result = summarize(text)
    assert result.endswith("…")
    assert len(result) <= SUMMARY_MAX + 1
    assert result[:-1].split()[-1] == "word"  # no half-cut words


def test_summary_exactly_at_the_limit_is_kept_whole():
    text = "x" * SUMMARY_MAX
    assert summarize(text) == text


def test_summary_strips_html_and_entities():
    assert summarize("<p>Fast &amp; <b>safe</b></p>") == "Fast & safe"
