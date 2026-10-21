"""Turn RawSession objects from any adapter into the public sessions.json shape."""

import html
import logging
import re

from event_time import to_event_time
from models import RawSession
from tags import Tagger

log = logging.getLogger(__name__)

SUMMARY_MAX = 200

# Tracks (lowercase, emoji stripped) that are not talks: breaks, expo-floor stages, etc.
OTHER_TRACKS = {
    "breaks",
    "registration",
    "experiences",
    "poster sessions",
    "project opportunities",
    "project pavilion tours",
    "project pavilion stage",
    "solutions showcase",
    "cloud native theater",
    "sponsor demo theater",
}
# Titles that are logistics, whatever track they sit in (e.g. "BREAK" inside Project Lightning Talks).
OTHER_TITLE = re.compile(r"^(break|lunch|breakfast|coffee|registration|badge pick-?up)\b", re.IGNORECASE)

LEVELS = {
    "beginner": "beginner",
    "novice": "beginner",
    "introductory": "beginner",
    "intermediate": "intermediate",
    "advanced": "advanced",
    "expert": "advanced",
}


def clean_track(track: str) -> str:
    """Drop leading emoji/punctuation: "⚡ Lightning Talks" -> "Lightning Talks"."""
    return re.sub(r"^\W+", "", track).strip()


def detect_type(track: str, title: str) -> str:
    t, ti = track.lower(), title.lower()
    if OTHER_TITLE.match(title):
        return "other"
    if "keynote" in t or ti.startswith("keynote"):
        return "keynote"
    if "co-located" in t or "colocated" in t:
        return "colocated"
    if "lightning" in t or "lightning talk" in ti:
        return "lightning"
    if t in OTHER_TRACKS:
        return "other"
    return "breakout"


def detect_level(hint: str) -> str:
    """Map the source's level text to beginner/intermediate/advanced, else "unknown"."""
    return LEVELS.get(hint.strip().lower(), "unknown")


def summarize(description: str | None) -> str:
    """Plain-text summary of at most ~200 chars, cut at a word boundary.

    We only keep a short summary on purpose: the full abstract stays on the official site.
    """
    text = re.sub(r"<[^>]+>", " ", description or "")
    text = " ".join(html.unescape(text).split())
    if len(text) <= SUMMARY_MAX:
        return text
    cut = text[: SUMMARY_MAX + 1]
    cut = cut[: cut.rfind(" ")] if " " in cut else text[:SUMMARY_MAX]
    return cut.rstrip(" ,.;:-") + "…"


def normalize_session(raw: RawSession, tagger: Tagger) -> dict:
    start, end = to_event_time(raw.start), to_event_time(raw.end)
    track = clean_track(raw.track)
    level = detect_level(raw.level_hint)
    # Tags use the full description, but only the short summary is published.
    tags = tagger.tags_for(raw.title, track, raw.description, also=("beginner",) if level == "beginner" else ())
    return {
        "id": raw.id,
        "title": raw.title,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "day": start.date().isoformat(),
        "room": raw.room,
        "track": track,
        "type": detect_type(track, raw.title),
        "level": level,
        "speakers": raw.speakers,
        "summary": summarize(raw.description),
        "url": raw.url,
        "tags": tags,
    }


def build_sessions(raws: list[RawSession], tagger: Tagger) -> list[dict]:
    """Normalize, de-duplicate by id (the last one wins) and sort by time."""
    by_id: dict[str, RawSession] = {}
    for raw in raws:
        if raw.id in by_id:
            log.warning("duplicate session id %s (%r); keeping the later entry", raw.id, raw.title)
        by_id[raw.id] = raw
    sessions = [normalize_session(raw, tagger) for raw in by_id.values()]
    return sorted(sessions, key=lambda s: (s["start"], s["title"], s["id"]))
