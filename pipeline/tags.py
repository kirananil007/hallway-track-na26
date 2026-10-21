"""Keyword -> interest tag matching.

The mapping lives in tags.yaml so contributors can improve it without touching Python.
"""

import re
from pathlib import Path

import yaml

TAGS_FILE = Path(__file__).with_name("tags.yaml")


class Tagger:
    def __init__(self, mapping: dict[str, list[str]]):
        for tag, keywords in mapping.items():
            if not keywords or not all(isinstance(k, str) and k.strip() for k in keywords):
                raise ValueError(f"tags.yaml: tag {tag!r} needs a list of non-empty keywords")

        # Tags come out in the order they're listed in tags.yaml.
        self.order = list(mapping)
        # One regex per tag. The look-arounds make keywords match whole words only.
        self._patterns = {
            tag: re.compile(
                "|".join(rf"(?<![a-z0-9]){re.escape(k.strip().lower())}(?![a-z0-9])" for k in keywords),
                re.IGNORECASE,
            )
            for tag, keywords in mapping.items()
        }

    @classmethod
    def from_file(cls, path: Path = TAGS_FILE) -> "Tagger":
        with path.open(encoding="utf-8") as f:
            return cls(yaml.safe_load(f))

    def tags_for(self, *texts: str, also: tuple[str, ...] = ()) -> list[str]:
        """Return the tags whose keywords appear in any of `texts`, plus any tags in `also`."""
        blob = " ".join(texts)
        found = {tag for tag, pattern in self._patterns.items() if pattern.search(blob)}
        found.update(also)
        return [tag for tag in self.order if tag in found]
