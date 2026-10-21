from event_time import to_event_time


def test_naive_time_is_treated_as_venue_local_mst():
    assert to_event_time("2026-11-09T09:00:00").isoformat() == "2026-11-09T09:00:00-07:00"


def test_utc_time_is_converted_to_mst():
    assert to_event_time("2026-11-10T16:00:00Z").isoformat() == "2026-11-10T09:00:00-07:00"


def test_before_dst_ends_uses_mdt():
    # Sanity check that we rely on the real tz database, not a hard-coded -07:00.
    assert to_event_time("2026-10-21T09:00:00").isoformat() == "2026-10-21T09:00:00-06:00"
