import re

import pytest
import yaml

from tags import TAGS_FILE, Tagger


def test_tags_file_is_well_formed():
    mapping = yaml.safe_load(TAGS_FILE.read_text(encoding="utf-8"))
    assert 15 <= len(mapping) <= 25, "keep the tag list small enough for filter chips"
    for tag, keywords in mapping.items():
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", tag), f"{tag!r} should be kebab-case"
        assert keywords and all(isinstance(k, str) for k in keywords), f"{tag!r} needs string keywords"


def test_keywords_match_whole_words_only(tagger):
    assert "ai-ml" not in tagger.tags_for("Editing YAML files with aim")
    assert tagger.tags_for("AI inference at scale") == ["ai-ml", "inference"]


def test_matching_is_case_insensitive_and_covers_phrases(tagger):
    assert tagger.tags_for("Shipping OTel to prod") == ["opentelemetry"]
    assert "platform-engineering" in tagger.tags_for("Our Internal Developer Platform journey")


def test_tags_follow_the_order_in_the_yaml(tagger):
    assert tagger.tags_for("eBPF meets Prometheus") == ["observability", "ebpf"]


def test_also_adds_tags(tagger):
    assert tagger.tags_for("Nothing to see here", also=("beginner",)) == ["beginner"]


def test_bad_mapping_is_rejected():
    with pytest.raises(ValueError):
        Tagger({"empty": []})
