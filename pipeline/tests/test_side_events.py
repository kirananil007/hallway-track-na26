import copy
import json
from datetime import date

import pytest

import build_side_events as b

SCHEMA = json.loads(b.SCHEMA_FILE.read_text(encoding="utf-8"))
TAGS = {"observability", "beginner", "security"}
TODAY = date(2026, 10, 21)

VALID_YAML = """
events:
  - id: otel-meetup
    title: OTel meetup
    host: Some Group
    start: 2026-11-10T18:30
    end: 2026-11-10T21:00
    venue: A Venue
    url: https://example.com/rsvp
    tags: [observability]
    cost: free
    requires_registration: true
    submitted_by: some-user
    last_verified: 2026-10-20
"""


def valid():
    return b.load_events(VALID_YAML)


def errors_for(data):
    return b.validate(data, SCHEMA, TAGS, TODAY)


def with_change(**fields):
    data = valid()
    data["events"][0].update(fields)
    return data


def test_valid_file_passes_and_keeps_times_as_text():
    data = valid()
    assert errors_for(data) == []
    assert data["events"][0]["start"] == "2026-11-10T18:30"  # not turned into a datetime


def test_output_uses_mst_and_event_day():
    [event] = b.to_json(valid()["events"])
    assert event["start"] == "2026-11-10T18:30:00-07:00"
    assert event["end"] == "2026-11-10T21:00:00-07:00"
    assert event["day"] == "2026-11-10"
    assert event["address"] == "" and event["example"] is False


@pytest.mark.parametrize(
    "fields, message",
    [
        ({"start": "2026-11-20T18:30", "end": "2026-11-20T19:30"}, "dates must be between"),
        ({"end": "2026-11-10T18:00"}, "'end' must be after 'start'"),
        ({"url": "http://example.com/rsvp"}, "field 'url'"),
        ({"tags": ["kubernetes"]}, "unknown tags"),
        ({"last_verified": "2026-12-01"}, "in the future"),
        ({"last_verified": "2026-02-30"}, "not a real date"),
        ({"submitted_by": "@some-user"}, "field 'submitted_by'"),
        ({"cost": "cheap"}, "field 'cost'"),
        ({"start": "Nov 10 6:30pm"}, "field 'start'"),
        ({"id": "Has Spaces"}, "field 'id'"),
        ({"surprise": "field"}, "Additional properties"),
    ],
)
def test_each_rule_reports_a_clear_error(fields, message):
    errors = errors_for(with_change(**fields))
    assert any(message in e for e in errors), errors
    assert all(e.startswith('entry 1 ("OTel meetup")') for e in errors)


def test_missing_required_field():
    data = valid()
    del data["events"][0]["venue"]
    assert any("'venue' is a required property" in e for e in errors_for(data))


def test_duplicates_are_rejected():
    data = valid()
    twin = copy.deepcopy(data["events"][0])
    data["events"].append(twin)
    errors = errors_for(data)
    assert any("id 'otel-meetup' is already used by entry 1" in e for e in errors)
    assert any("duplicate of entry 1" in e for e in errors)


def test_explicit_mst_offset_is_accepted():
    assert errors_for(with_change(start="2026-11-10T18:30:00-07:00")) == []


def test_main_reports_broken_yaml(tmp_path, capsys):
    bad = tmp_path / "events.yaml"
    bad.write_text("events:\n  - id: [unclosed\n")
    assert b.main(["--check", "--events", str(bad)]) == 1
    assert "not valid YAML" in capsys.readouterr().out


def test_main_writes_json(tmp_path):
    src = tmp_path / "events.yaml"
    src.write_text(VALID_YAML.replace("observability", "security"))
    out = tmp_path / "side_events.json"
    assert b.main(["--events", str(src), "--out", str(out)]) == 0
    assert json.loads(out.read_text())[0]["id"] == "otel-meetup"


def test_the_real_events_file_is_valid():
    # Same check CI runs on every pull request.
    assert b.main(["--check"]) == 0
