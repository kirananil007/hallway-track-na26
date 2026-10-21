"""Adapter for Sessionize schedule JSON.

Works with both the event app's /api/schedule and the official API/Embed "All" view.
Both return {"sessions", "speakers", "rooms", "categories"}, where each session points
to its speakers, room and category items by id.
"""

from models import RawSession


def parse(data: dict, session_url_base: str) -> list[RawSession]:
    speakers = {s["id"]: _speaker_name(s) for s in data.get("speakers", [])}
    rooms = {r["id"]: (r.get("name") or "").strip() for r in data.get("rooms", [])}

    # Category item id -> (group title, item name), e.g. 123 -> ("Audience Level", "Beginner").
    items = {}
    for group in data.get("categories", []):
        for item in group.get("items", []):
            items[item["id"]] = (group.get("title") or "", item.get("name") or "")

    sessions = []
    for s in data.get("sessions", []):
        if not s.get("startsAt") or not s.get("endsAt"):
            continue  # not scheduled yet

        # The "Audience Level" group gives the level; the first other category is the track.
        track, level = "", ""
        for item_id in s.get("categoryItems") or []:
            group, name = items.get(item_id, ("", ""))
            if "level" in group.lower():
                level = name
            elif not track:
                track = name

        sessions.append(
            RawSession(
                id=str(s["id"]),
                title=(s.get("title") or "").strip(),
                start=s["startsAt"],
                end=s["endsAt"],
                room=rooms.get(s.get("roomId"), ""),
                track=track,
                level_hint=level,
                # Speaker ids we can't resolve are dropped rather than shown as raw ids.
                speakers=[speakers[x] for x in s.get("speakers") or [] if x in speakers],
                description=s.get("description") or "",
                url=session_url_base + str(s["id"]),
            )
        )
    return sessions


def _speaker_name(speaker: dict) -> str:
    full = speaker.get("fullName")
    if full:
        return full.strip()
    return f"{speaker.get('firstName') or ''} {speaker.get('lastName') or ''}".strip()
