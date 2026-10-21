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
```

## Contributing

Coming in M5: add a side event by editing one YAML file in the GitHub web editor.

## License

[Apache-2.0](LICENSE)
