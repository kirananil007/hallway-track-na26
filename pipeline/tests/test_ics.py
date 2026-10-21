from normalize import build_sessions
from sources import ics


def parsed(messy_ics, tagger):
    return {s["id"]: s for s in build_sessions(ics.parse(messy_ics), tagger)}


def test_utc_times_become_mst(messy_ics, tagger):
    s = parsed(messy_ics, tagger)["ics-001@example.invalid"]
    assert s["start"] == "2026-11-10T10:00:00-07:00"
    assert s["end"] == "2026-11-10T10:30:00-07:00"


def test_tzid_times_are_kept(messy_ics, tagger):
    s = parsed(messy_ics, tagger)["ics-002@example.invalid"]
    assert s["start"] == "2026-11-11T14:00:00-07:00"


def test_floating_times_are_treated_as_venue_local(messy_ics, tagger):
    s = parsed(messy_ics, tagger)["ics-003@example.invalid"]
    assert s["start"] == "2026-11-12T10:00:00-07:00"
    assert s["day"] == "2026-11-12"


def test_speakers_are_parsed_from_the_description(messy_ics):
    raws = {r.id: r for r in ics.parse(messy_ics)}
    # The later duplicate of ics-001 uses "; " between names.
    assert raws["ics-001@example.invalid"].speakers == ["Jane Example", "John Sample"]
    assert raws["ics-003@example.invalid"].speakers == ["Solo Presenter"]
    assert raws["ics-002@example.invalid"].speakers == []


def test_speakers_with_companies_and_commas():
    names, rest = ics._pop_speakers("Speakers: Jane Example (Example Corp), John Sample (Sample Inc)\nBody")
    assert names == ["Jane Example", "John Sample"]
    assert rest.strip() == "Body"


def test_level_from_line_bracket_or_title(messy_ics, tagger):
    sessions = parsed(messy_ics, tagger)
    assert sessions["ics-001@example.invalid"]["level"] == "advanced"
    assert sessions["ics-003@example.invalid"]["level"] == "intermediate"
    networking = sessions["ics-002@example.invalid"]
    assert networking["level"] == "beginner"
    assert networking["title"] == "Kubernetes Networking 101"


def test_summary_has_no_html_or_parsed_lines(messy_ics, tagger):
    sessions = parsed(messy_ics, tagger)
    assert sessions["ics-002@example.invalid"]["summary"] == (
        "No speaker listed yet. Learn how Services & CNI plugins fit together."
    )
    security = sessions["ics-001@example.invalid"]["summary"]
    assert "Speakers" not in security and "Audience Level" not in security
    assert security == "A practical look at signing, SBOMs and policy."  # folded line rejoined


def test_duplicate_uid_keeps_the_later_entry(messy_ics, tagger):
    sessions = parsed(messy_ics, tagger)
    assert len(sessions) == 3
    assert sessions["ics-001@example.invalid"]["room"] == "Salt Palace | Level 2 | 255 EF"


def test_category_becomes_track_and_tags(messy_ics, tagger):
    s = parsed(messy_ics, tagger)["ics-001@example.invalid"]
    assert s["track"] == "Security"
    assert "security" in s["tags"]
