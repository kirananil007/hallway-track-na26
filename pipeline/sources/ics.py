"""Adapter for iCalendar (.ics) files, used as the manual fallback.

Calendar exports are messy: speakers and level are often buried in the description
("Speakers: Jane Doe (Acme), John Roe", "Audience Level: Advanced", "[Beginner]").
We pull them out with a few forgiving patterns and keep the rest as the description.
"""

import re
from datetime import date, datetime

from icalendar import Calendar

from models import RawSession

SPEAKER_LINE = re.compile(r"^\s*speakers?\s*:\s*(?P<names>.+?)\s*$", re.I | re.M)
LEVEL_LINE = re.compile(
    r"^\s*(?:audience|content experience|experience)?\s*level\s*:\s*(?P<level>.+?)\s*$", re.I | re.M
)
LEVEL_BRACKET = re.compile(r"\[\s*(?P<level>beginner|intermediate|advanced|any level|all levels)\s*\]", re.I)


def parse(text: str) -> list[RawSession]:
    sessions = []
    for event in Calendar.from_ical(text).walk("VEVENT"):
        uid = str(event.get("UID", "")).strip()
        start, end = event.get("DTSTART"), event.get("DTEND")
        if not uid or start is None or end is None:
            continue

        title = str(event.get("SUMMARY", "")).strip()
        description = str(event.get("DESCRIPTION", ""))
        speakers, description = _pop_speakers(description)
        level, description = _pop_level(description)

        # Some exports put the level in the title instead: "[Beginner] Networking 101".
        title_level = LEVEL_BRACKET.match(title)
        if title_level:
            level = level or title_level.group("level")
            title = title[title_level.end() :].strip()

        sessions.append(
            RawSession(
                id=uid,
                title=title,
                start=_iso(start.dt),
                end=_iso(end.dt),
                room=str(event.get("LOCATION", "")).strip(),
                track=_first_category(event),
                level_hint=level,
                speakers=speakers,
                description=description.strip(),
                url=str(event.get("URL", "")).strip(),
            )
        )
    return sessions


def _pop_speakers(description: str) -> tuple[list[str], str]:
    """Find a "Speaker(s): ..." line, return the names and the description without it."""
    match = SPEAKER_LINE.search(description)
    if not match:
        return [], description

    raw = match.group("names")
    # "A (Acme); B (Initech)" or "A (Acme), B (Initech)" or "A and B".
    parts = raw.split(";") if ";" in raw else re.split(r",|&|\band\b", raw)
    names = []
    for part in parts:
        name = re.sub(r"\(.*?\)", "", part).split(",")[0].strip()
        if name and name not in names:
            names.append(name)
    return names, description[: match.start()] + description[match.end() :]


def _pop_level(description: str) -> tuple[str, str]:
    """Find a level line or [Level] tag, return it and the description without it."""
    for pattern in (LEVEL_LINE, LEVEL_BRACKET):
        match = pattern.search(description)
        if match:
            return match.group("level").strip(), description[: match.start()] + description[match.end() :]
    return "", description


def _first_category(event) -> str:
    cats = event.get("CATEGORIES")
    if cats is None:
        return ""
    for prop in cats if isinstance(cats, list) else [cats]:
        for name in getattr(prop, "cats", [prop]):
            if str(name).strip():
                return str(name).strip()
    return ""


def _iso(value: datetime | date) -> str:
    if not isinstance(value, datetime):  # all-day event
        value = datetime(value.year, value.month, value.day)
    return value.isoformat()
