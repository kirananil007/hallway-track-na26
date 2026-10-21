"""Time helpers for the event.

The schedule source gives local wall-clock times with no offset
(e.g. "2026-11-09T09:00:00"). The event is in Salt Lake City, so we attach
America/Denver. DST ends on Nov 1, 2026, so event-week times come out as MST (UTC-7).
"""

from datetime import datetime
from zoneinfo import ZoneInfo

EVENT_TZ = ZoneInfo("America/Denver")


def to_event_time(value: str) -> datetime:
    """Parse an ISO 8601 string into an aware datetime in the event time zone.

    Naive values are treated as venue-local time. Values that already carry an
    offset (or "Z") are converted, not reinterpreted.
    """
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=EVENT_TZ)
    return parsed.astimezone(EVENT_TZ)
