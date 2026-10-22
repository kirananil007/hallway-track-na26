"""Validate data/events.yaml and write web/public/data/side_events.json.

Usage (from pipeline/):
    uv run python build_side_events.py          # validate, then write the JSON
    uv run python build_side_events.py --check  # validate only (what CI runs on pull requests)

Errors name the entry and say what to fix, because most contributors will be editing
the YAML in the GitHub web editor and only see this output in the PR checks.
"""

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

import jsonschema
import yaml

from event_time import to_event_time
from tags import Tagger

PIPELINE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_DIR.parent
EVENTS_FILE = REPO_ROOT / "data" / "events.yaml"
SCHEMA_FILE = REPO_ROOT / "data" / "events.schema.json"
OUT_FILE = REPO_ROOT / "web" / "public" / "data" / "side_events.json"

FIRST_DAY = date(2026, 11, 8)
LAST_DAY = date(2026, 11, 13)


class _PlainLoader(yaml.SafeLoader):
    """A YAML loader that keeps dates and times as text.

    PyYAML would otherwise turn `2026-11-10T18:30` into a datetime and `2026-10-21` into a
    date, which makes errors confusing. We check the formats ourselves instead.
    """


_PlainLoader.yaml_implicit_resolvers = {
    key: [(tag, regexp) for tag, regexp in resolvers if tag != "tag:yaml.org,2002:timestamp"]
    for key, resolvers in yaml.SafeLoader.yaml_implicit_resolvers.items()
}


def load_events(text: str) -> object:
    return yaml.load(text, Loader=_PlainLoader)


def _label(index: int, entry: object) -> str:
    title = entry.get("title") if isinstance(entry, dict) else None
    return f"entry {index + 1}" + (f' ("{title}")' if title else "")


def validate(data: object, schema: dict, known_tags: set[str], today: date) -> list[str]:
    """Return a list of human-readable problems. An empty list means the file is valid."""
    errors = []

    validator = jsonschema.Draft202012Validator(schema)
    for error in sorted(validator.iter_errors(data), key=lambda e: list(e.path)):
        path = list(error.path)
        if len(path) >= 2 and path[0] == "events" and isinstance(path[1], int):
            where = _label(path[1], data["events"][path[1]])
            field = f" field '{path[2]}'" if len(path) > 2 else ""
            errors.append(f"{where}{field}: {error.message}")
        else:
            errors.append(f"events.yaml: {error.message}")
    if errors:
        return errors  # the checks below assume the basic shape is right

    seen_ids: dict[str, int] = {}
    seen_slots: dict[tuple[str, str], int] = {}
    for index, event in enumerate(data["events"]):
        where = _label(index, event)
        start, end = to_event_time(event["start"]), to_event_time(event["end"])

        if not FIRST_DAY <= start.date() <= LAST_DAY or not FIRST_DAY <= end.date() <= LAST_DAY:
            errors.append(f"{where}: dates must be between {FIRST_DAY} and {LAST_DAY} (Salt Lake City time)")
        if end <= start:
            errors.append(f"{where}: 'end' must be after 'start'")

        if not urlparse(event["url"]).netloc:
            errors.append(f"{where}: 'url' doesn't look like a web address")

        unknown = [t for t in event["tags"] if t not in known_tags]
        if unknown:
            errors.append(f"{where}: unknown tags {unknown}; use tags from pipeline/tags.yaml")

        try:
            verified = date.fromisoformat(event["last_verified"])
            if verified > today:
                errors.append(f"{where}: 'last_verified' is in the future")
        except ValueError:
            errors.append(f"{where}: 'last_verified' is not a real date")

        if event["id"] in seen_ids:
            errors.append(f"{where}: id '{event['id']}' is already used by entry {seen_ids[event['id']] + 1}")
        seen_ids.setdefault(event["id"], index)

        slot = (event["title"].strip().lower(), start.isoformat())
        if slot in seen_slots:
            errors.append(f"{where}: looks like a duplicate of entry {seen_slots[slot] + 1} (same title and start)")
        seen_slots.setdefault(slot, index)

    return errors


def to_json(events: list[dict]) -> list[dict]:
    out = []
    for event in events:
        start, end = to_event_time(event["start"]), to_event_time(event["end"])
        out.append(
            {
                "id": event["id"],
                "title": event["title"].strip(),
                "host": event["host"].strip(),
                "start": start.isoformat(),
                "end": end.isoformat(),
                "day": start.date().isoformat(),
                "venue": event["venue"].strip(),
                "address": event.get("address", "").strip(),
                "url": event["url"],
                "tags": event["tags"],
                "cost": event["cost"],
                "requires_registration": event["requires_registration"],
                "submitted_by": event["submitted_by"],
                "last_verified": event["last_verified"],
                "example": event.get("example", False),
            }
        )
    return sorted(out, key=lambda e: (e["start"], e["title"]))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="validate only, don't write the JSON")
    parser.add_argument("--events", type=Path, default=EVENTS_FILE)
    parser.add_argument("--out", type=Path, default=OUT_FILE)
    args = parser.parse_args(argv)

    try:
        data = load_events(args.events.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        print(f"events.yaml is not valid YAML (check indentation and quotes):\n{e}")
        return 1

    schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    errors = validate(data, schema, set(Tagger.from_file().order), date.today())
    if errors:
        print(f"Found {len(errors)} problem(s) in events.yaml:")
        for error in errors:
            print(f"  - {error}")
        return 1

    events = to_json(data["events"])
    print(f"events.yaml is valid: {len(events)} event(s).")
    if not args.check:
        text = json.dumps(events, ensure_ascii=False, indent=2) + "\n"
        if not args.out.exists() or args.out.read_text(encoding="utf-8") != text:
            args.out.write_text(text, encoding="utf-8")
            print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
