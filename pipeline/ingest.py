"""Fetch the official schedule and write web/public/data/sessions.json + meta.json.

Usage (from pipeline/):
    uv run python ingest.py                   # read the source configured in source.toml
    uv run python ingest.py --file my.ics     # use a local file instead (manual fallback)

Being polite to the source: one request per run, a User-Agent that names this project,
and a 30 s timeout. If the fetch fails we keep the last good sessions.json and exit 0,
so the site keeps working.

Files are only rewritten when the sessions actually change, so the scheduled refresh
job commits nothing on quiet days.
"""

import argparse
import json
import logging
import os
import sys
import tomllib
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from normalize import build_sessions
from sources import ics, sessionize
from tags import Tagger

PIPELINE_DIR = Path(__file__).resolve().parent
OUT_DIR = PIPELINE_DIR.parent / "web" / "public" / "data"
CONFIG_FILE = PIPELINE_DIR / "source.toml"

USER_AGENT = "hallway-track-na26/0.1 (+https://github.com/kirananil007/hallway-track-na26)"
MAX_BYTES = 20 * 1024 * 1024
# If a new fetch has fewer than half the sessions we already have, it's probably a broken
# or partial response. Refuse it (use --allow-shrink to override).
MIN_KEEP_RATIO = 0.5

log = logging.getLogger("ingest")


class FetchError(Exception):
    pass


def fetch(url: str, timeout: int = 30) -> str:
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "application/json, text/calendar"}
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(MAX_BYTES + 1)
    except (urllib.error.URLError, TimeoutError) as e:
        raise FetchError(f"could not fetch {url}: {e}") from e
    if len(body) > MAX_BYTES:
        raise FetchError(f"response from {url} is larger than {MAX_BYTES} bytes")
    return body.decode("utf-8")


def load_config(path: Path = CONFIG_FILE) -> dict:
    return tomllib.loads(path.read_text(encoding="utf-8"))["source"]


def parse_payload(adapter: str, text: str, config: dict) -> list:
    if adapter == "sessionize":
        return sessionize.parse(json.loads(text), config.get("session_url_base", ""))
    if adapter == "ics":
        return ics.parse(text)
    raise ValueError(f"unknown adapter {adapter!r} (expected 'sessionize' or 'ics')")


def read_existing(out_dir: Path) -> list | None:
    path = out_dir / "sessions.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_outputs(sessions: list[dict], out_dir: Path, source_label: str, now: datetime | None = None) -> bool:
    """Write sessions.json and meta.json. Returns False (and writes nothing) if unchanged."""
    sessions_file = out_dir / "sessions.json"
    new_text = json.dumps(sessions, ensure_ascii=False, indent=2) + "\n"
    if sessions_file.exists() and sessions_file.read_text(encoding="utf-8") == new_text:
        return False

    out_dir.mkdir(parents=True, exist_ok=True)
    sessions_file.write_text(new_text, encoding="utf-8")
    meta = {
        "updated_at": (now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        "source": source_label,
        "session_count": len(sessions),
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return True


def run(text: str, adapter: str, config: dict, out_dir: Path, source_label: str, allow_shrink: bool = False) -> int:
    try:
        raws = parse_payload(adapter, text, config)
    except (ValueError, KeyError, TypeError) as e:
        # e.g. an HTML error page served with status 200, or a changed JSON format.
        _error(f"could not parse the {adapter} data ({type(e).__name__}: {e}); keeping the existing data")
        return 1
    sessions = build_sessions(raws, Tagger.from_file())
    if not sessions:
        _error("the source returned no sessions; keeping the existing data")
        return 1

    existing = read_existing(out_dir)
    if existing and not allow_shrink and len(sessions) < len(existing) * MIN_KEEP_RATIO:
        _error(
            f"session count dropped from {len(existing)} to {len(sessions)}; refusing to publish "
            "(re-run with --allow-shrink if this is expected)"
        )
        return 1

    if write_outputs(sessions, out_dir, source_label):
        log.info("wrote %d sessions to %s", len(sessions), out_dir)
    else:
        log.info("no changes (%d sessions)", len(sessions))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", type=Path, help="read this .json or .ics file instead of the configured source")
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--allow-shrink", action="store_true", help="publish even if many sessions disappeared")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    config = load_config()
    if args.file:
        adapter = "ics" if args.file.suffix.lower() == ".ics" else "sessionize"
        text = args.file.read_text(encoding="utf-8")
        label = f"file: {args.file.name}"
    else:
        adapter, location, label = config["adapter"], config["location"], config.get("label", config["adapter"])
        try:
            if location.startswith("https://"):
                text = fetch(location)
            else:
                text = (PIPELINE_DIR / location).read_text(encoding="utf-8")
        except (FetchError, OSError) as e:
            if (args.out_dir / "sessions.json").exists():
                _warn(f"{e}; keeping the last good sessions.json")
                return 0
            _error(f"{e}; and there is no previous sessions.json to fall back to")
            return 1

    return run(text, adapter, config, args.out_dir, label, args.allow_shrink)


def _warn(message: str) -> None:
    log.warning(message)
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::warning::{message}")  # shows up as an annotation on the workflow run


def _error(message: str) -> None:
    log.error(message)
    if os.environ.get("GITHUB_ACTIONS"):
        print(f"::error::{message}")


if __name__ == "__main__":
    sys.exit(main())
