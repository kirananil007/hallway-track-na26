import json
from datetime import datetime, timezone

import ingest
from conftest import FIXTURES

CONFIG = {"session_url_base": "https://example.invalid/session/"}


def fixture_text():
    return (FIXTURES / "sessionize_sample.json").read_text(encoding="utf-8")


def test_write_outputs_only_when_changed(tmp_path):
    sessions = [{"id": "1", "title": "A"}]
    first = datetime(2026, 10, 21, tzinfo=timezone.utc)
    assert ingest.write_outputs(sessions, tmp_path, "test", now=first) is True
    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta == {"updated_at": "2026-10-21T00:00:00+00:00", "source": "test", "session_count": 1}

    # Same sessions again: nothing is rewritten, so updated_at stays put.
    later = datetime(2026, 10, 22, tzinfo=timezone.utc)
    assert ingest.write_outputs(sessions, tmp_path, "test", now=later) is False
    assert json.loads((tmp_path / "meta.json").read_text())["updated_at"] == "2026-10-21T00:00:00+00:00"


def test_run_writes_sessions(tmp_path):
    assert ingest.run(fixture_text(), "sessionize", CONFIG, tmp_path, "test") == 0
    sessions = json.loads((tmp_path / "sessions.json").read_text())
    assert len(sessions) == 6


def test_run_refuses_an_empty_result(tmp_path):
    empty = json.dumps({"sessions": [], "speakers": [], "rooms": [], "categories": []})
    assert ingest.run(empty, "sessionize", CONFIG, tmp_path, "test") == 1
    assert not (tmp_path / "sessions.json").exists()


def test_run_rejects_garbage_cleanly(tmp_path, caplog):
    assert ingest.run("<html>Service Unavailable</html>", "sessionize", CONFIG, tmp_path, "test") == 1
    assert "could not parse the sessionize data" in caplog.text
    assert not (tmp_path / "sessions.json").exists()


def test_run_refuses_a_big_drop_unless_allowed(tmp_path):
    existing = [{"id": str(i)} for i in range(100)]
    (tmp_path / "sessions.json").write_text(json.dumps(existing))
    assert ingest.run(fixture_text(), "sessionize", CONFIG, tmp_path, "test") == 1
    assert len(json.loads((tmp_path / "sessions.json").read_text())) == 100  # untouched
    assert ingest.run(fixture_text(), "sessionize", CONFIG, tmp_path, "test", allow_shrink=True) == 0


def test_fetch_failure_keeps_the_last_good_data(tmp_path, monkeypatch):
    (tmp_path / "sessions.json").write_text("[]")

    def broken_fetch(url):
        raise ingest.FetchError("network down")

    monkeypatch.setattr(ingest, "fetch", broken_fetch)
    assert ingest.main(["--out-dir", str(tmp_path)]) == 0
    assert (tmp_path / "sessions.json").read_text() == "[]"


def test_fetch_failure_without_previous_data_fails(tmp_path, monkeypatch):
    monkeypatch.setattr(ingest, "fetch", lambda url: (_ for _ in ()).throw(ingest.FetchError("down")))
    assert ingest.main(["--out-dir", str(tmp_path)]) == 1


def test_manual_ics_file(tmp_path):
    assert ingest.main(["--file", str(FIXTURES / "messy.ics"), "--out-dir", str(tmp_path)]) == 0
    meta = json.loads((tmp_path / "meta.json").read_text())
    assert meta["source"] == "file: messy.ics"
    assert meta["session_count"] == 3


def test_fetch_identifies_itself(monkeypatch):
    seen = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self, limit):
            return b"{}"

    def fake_urlopen(request, timeout):
        seen["ua"] = request.get_header("User-agent")
        seen["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(ingest.urllib.request, "urlopen", fake_urlopen)
    assert ingest.fetch("https://example.invalid/api") == "{}"
    assert "github.com/kirananil007/hallway-track-na26" in seen["ua"]
    assert seen["timeout"] == 30
