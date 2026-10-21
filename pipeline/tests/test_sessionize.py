from conftest import SESSION_URL_BASE
from normalize import build_sessions
from sources import sessionize


def by_id(sessions):
    return {s["id"]: s for s in sessions}


def test_unscheduled_sessions_are_skipped(sessionize_data):
    raws = sessionize.parse(sessionize_data, SESSION_URL_BASE)
    assert "1007" not in {r.id for r in raws}


def test_track_and_level_come_from_their_category_groups(sessionize_data):
    raws = {r.id: r for r in sessionize.parse(sessionize_data, SESSION_URL_BASE)}
    assert raws["1003"].track == "⚡ Lightning Talks"
    assert raws["1003"].level_hint == "Any Level"
    assert raws["1006"].level_hint == "Beginner"


def test_speakers_rooms_and_urls_are_resolved(sessionize_data):
    raws = {r.id: r for r in sessionize.parse(sessionize_data, SESSION_URL_BASE)}
    assert raws["1003"].speakers == ["Casey Placeholder"]  # fullName missing -> first + last
    assert raws["1006"].speakers == []  # unknown speaker id is dropped
    assert raws["1006"].room == ""  # unknown room id
    assert raws["1004"].room == "Salt Palace | Level 2 | 250 A-C"  # trailing space trimmed
    assert raws["1001"].url == SESSION_URL_BASE + "1001"


def test_end_to_end_shape_and_times(sessionize_data, tagger):
    sessions = by_id(build_sessions(sessionize.parse(sessionize_data, SESSION_URL_BASE), tagger))
    keynote = sessions["1001"]
    assert set(keynote) == {
        "id", "title", "start", "end", "day", "room", "track", "type",
        "level", "speakers", "summary", "url", "tags",
    }
    assert keynote["start"] == "2026-11-10T09:00:00-07:00"
    assert keynote["end"] == "2026-11-10T09:20:00-07:00"
    assert keynote["day"] == "2026-11-10"
    assert keynote["type"] == "keynote"


def test_colocated_vs_main_conference(sessionize_data, tagger):
    sessions = by_id(build_sessions(sessionize.parse(sessionize_data, SESSION_URL_BASE), tagger))
    assert sessions["1004"]["type"] == "colocated"
    assert sessions["1004"]["day"] == "2026-11-09"
    assert sessions["1004"]["summary"] == ""  # null description
    assert sessions["1002"]["type"] == "breakout"
    assert sessions["1003"]["type"] == "lightning"
    assert sessions["1003"]["track"] == "Lightning Talks"
    assert sessions["1005"]["type"] == "other"  # a BREAK inside the Project Lightning Talks track


def test_missing_and_multiple_speakers(sessionize_data, tagger):
    sessions = by_id(build_sessions(sessionize.parse(sessionize_data, SESSION_URL_BASE), tagger))
    assert sessions["1004"]["speakers"] == []
    assert sessions["1002"]["speakers"] == ["Avery Example", "Blake Sample"]


def test_duplicate_ids_keep_the_later_entry(sessionize_data, tagger, caplog):
    sessions = build_sessions(sessionize.parse(sessionize_data, SESSION_URL_BASE), tagger)
    assert [s["id"] for s in sessions].count("1002") == 1
    assert by_id(sessions)["1002"]["title"].endswith("(Updated)")
    assert "duplicate session id 1002" in caplog.text


def test_levels_and_tags(sessionize_data, tagger):
    sessions = by_id(build_sessions(sessionize.parse(sessionize_data, SESSION_URL_BASE), tagger))
    assert sessions["1002"]["level"] == "advanced"
    assert sessions["1003"]["level"] == "unknown"  # "Any Level"
    assert sessions["1002"]["tags"] == ["observability", "opentelemetry", "autoscaling", "ebpf"]
    assert sessions["1006"]["tags"] == ["platform-engineering", "beginner"]
    assert "gitops" in sessions["1003"]["tags"]


def test_output_is_sorted_by_start_time(sessionize_data, tagger):
    sessions = build_sessions(sessionize.parse(sessionize_data, SESSION_URL_BASE), tagger)
    starts = [s["start"] for s in sessions]
    assert starts == sorted(starts)
