# data/raw: manual schedule fallback

Normally the pipeline fetches the schedule itself (see `pipeline/source.toml`), and this
folder stays empty.

If the live source stops working, you can drop in an export by hand:

1. Save the official schedule as an `.ics` (or Sessionize `.json`) file here, e.g. `schedule.ics`.
2. Run `cd pipeline && uv run python ingest.py --file ../data/raw/schedule.ics`.
3. Commit the updated `web/public/data/` files.

To make the scheduled refresh use the file, set `adapter = "ics"` and
`location = "../data/raw/schedule.ics"` in `pipeline/source.toml`.

We don't commit the raw download from the live source: it contains full abstracts and
speaker bios. We only publish short summaries and link to the official pages.
