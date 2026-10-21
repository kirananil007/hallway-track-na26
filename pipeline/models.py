"""The in-between shape every source adapter produces.

Adapters (sources/*.py) only translate their format into RawSession. All the
rules about types, levels, tags and summaries live in normalize.py, so they
behave the same whatever the source is.
"""

from dataclasses import dataclass, field


@dataclass
class RawSession:
    id: str
    title: str
    start: str  # ISO 8601, with or without an offset
    end: str
    room: str = ""
    track: str = ""
    level_hint: str = ""  # whatever the source calls the level, e.g. "Beginner", "Any Level"
    speakers: list[str] = field(default_factory=list)
    description: str = ""
    url: str = ""
