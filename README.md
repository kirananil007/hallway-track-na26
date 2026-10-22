# Hallway Track

**A community planner for KubeCon + CloudNativeCon North America 2026**
Salt Lake City · Nov 9–12, 2026

> Unofficial community project. Not affiliated with or endorsed by CNCF or the Linux Foundation.

🚧 Work in progress. See [PLAN.md](PLAN.md) for milestones.

## What it does (planned)

- **Plan** a conflict-free schedule from your role and interests, then export it to your calendar.
- **Find** community side events (meetups, happy hours, project gatherings) in one place, added via pull requests.
- **Choose** a Monday co-located event and get oriented as a first-timer.

No backend, no accounts, no cookies, no tracking. Your plan stays in your browser.

## Why I built this

TODO(kiran)

## Run it locally

You need [Node.js](https://nodejs.org/) 22+ and [uv](https://docs.astral.sh/uv/) (Python 3.12).

```bash
# Web app
cd web
npm install
npm run dev        # http://localhost:5173/hallway-track-na26/
npm test

# Data pipeline
cd pipeline
uv run pytest
uv run python ingest.py   # fetch the latest schedule into web/public/data/
```

## Where the data comes from

- **Sessions:** the official schedule on Sessionize, refreshed every 6 hours by a GitHub Action
  ([refresh-data.yml](.github/workflows/refresh-data.yml)). We keep only the title, time, room,
  speakers and a ~200-character summary, and every session links to its official page.
- **Interest tags:** keyword matching from [pipeline/tags.yaml](pipeline/tags.yaml). PRs that
  improve it are welcome.

## How "Plan my KubeCon" suggests sessions

No AI and no server: the same answers always give the same plan, and every pick shows why.
The rules live in [web/src/lib/scoring.ts](web/src/lib/scoring.ts) and
[web/src/lib/recommend.ts](web/src/lib/recommend.ts).

- **Score:** +3 per chosen interest the session is tagged with, +2 if its official track matches
  an interest, up to +2 for tags related to your role, +2/+1/−2 for an exact/near/far level match,
  and +1 for keynotes. A session must match at least one chosen interest.
- **Pick:** the highest-scoring sessions go in first, and anything that clashes is skipped.
- **Backup:** for each pick, the best leftover session in the same time slot. A backup can
  score higher than its main pick when it also clashes with another, better pick (long
  tutorials and Contribfests often do).
- **Pass:** without All-Access, co-located events are left out; Monday's Project Lightning
  Talks are included with any pass.

## Contributing

Coming in M5: add a side event by editing one YAML file in the GitHub web editor.

## License

[Apache-2.0](LICENSE)
