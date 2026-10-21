import json
from pathlib import Path

import pytest

from tags import Tagger

FIXTURES = Path(__file__).parent / "fixtures"
SESSION_URL_BASE = "https://example.invalid/session/"


@pytest.fixture
def sessionize_data() -> dict:
    return json.loads((FIXTURES / "sessionize_sample.json").read_text(encoding="utf-8"))


@pytest.fixture
def messy_ics() -> str:
    return (FIXTURES / "messy.ics").read_text(encoding="utf-8")


@pytest.fixture
def tagger() -> Tagger:
    return Tagger.from_file()
