# PLAN.md — Hallway Track: a community planner for KubeCon + CloudNativeCon NA 2026

> Unofficial community project. Not affiliated with or endorsed by CNCF or the Linux Foundation.

Repo: `hallway-track-na26` → site at `https://<github-user>.github.io/hallway-track-na26/` (Vite `base: "/hallway-track-na26/"`).

Event: Nov 9–12, 2026 · Salt Palace Convention Center, Salt Lake City · all times MST (UTC−7, `America/Denver`).
Today: 2026-10-21 (19 days out). Target: public MVP (M0–M5) by **2026-10-26**, M6 polish by ~Nov 1.

---

## 0. What I verified, and what changed from the brief

| Claim in brief | Status (checked 2026-10-21) |
|---|---|
| Schedule on `kccncna2026.sched.com` | ❌ **Does not exist.** The subdomain redirects to `www.sched.com`; `/all.ics` → 404. |
| Official schedule location | ✅ `https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/` (HTML) and its "Plan your schedule" button → `https://kubecon-cloudnativecon-north-america-2026.sessionize.com` |
| Public iCal / JSON feed for 2026 | ⚠️ No documented Sessionize API/Embed ID published (not in the LF page source or network requests either). **But** the Sessionize event app serves `https://kubecon-cloudnativecon-north-america-2026.sessionize.com/api/schedule` publicly: ~1.8 MB JSON, 542 sessions, 688 speakers, 34 rooms, an `x-sz-datahash` header for change detection. It's undocumented. We've asked `events@cncf.io` for the official API ID / permission. `TODO(verify)` |
| Times in that JSON | Local and without an offset (`2026-11-09T09:00:00`). The LF page states "Times shown in MST (UTC-7)", so we attach `America/Denver`. |
| Tracks / type / level | `categories`: "All Sessions" (30 items: tracks + Keynote Sessions, ⚡ Lightning Talks, Project Lightning Talks, CNCF-hosted / Sponsor-hosted Co-located Events, Breaks, …) and "Audience Level" (Beginner / Advanced / Any Level → `unknown`). |
| Session page URL | No URL field. We'll build one from the Sessionize app's session route. `TODO(verify)` |
| Even past Sched feeds (`kccncna2024/2025.sched.com/all.ics`) | Return **503** to a plain HTTP client, so Sched feeds may be blocked for automation anyway. |
| Co-located events (Mon Nov 9) | ✅ From the CNCF blog (2026-09-11): Agentics Day: MCP + Agents, ArgoCon, BackstageCon, CiliumCon, Cloud Native AI + Inference Day, FluxCon, Kubernetes on Edge Day, Observability Day, Open Source SecurityCon, OpenTofu Day, Platform Engineering Day. Per-event links: `TODO(verify)` |
| KubeCon-only pass excludes co-located events but includes Project Lightning Talks | ✅ Same CNCF blog post. |
| New "AI Inference + Agentic" track | ✅ Reported in press. It affects `tags.py` (`inference`, `ai-ml`, plus a new `agentic` tag). |

**Consequence:** the ingest layer is built around **source adapters** so the rest of the pipeline doesn't care where the data comes from:

1. `sessionize_json` — one adapter for both Sessionize URLs, since they share the `sessions/speakers/rooms/categories` shape:
   - the official API/Embed endpoint (`https://sessionize.com/api/v2/<id>/view/All`), **if CNCF shares the ID** (preferred);
   - the event app's `/api/schedule` until then (the **default for now**).
2. `ics` — any iCal file (Sched-style or otherwise). This is the generic path and the **manual fallback**: you drop a file in `data/raw/`.
3. *(Not doing)* Scraping the LF HTML schedule page. That breaks the "never scrape HTML" rule.

We pick the source with a config file (`pipeline/source.toml`), not code changes. If no live source is reachable, the pipeline uses the last committed snapshot in `data/raw/` and the site still builds.

The output shape stays exactly as specified. I'm renaming the field comments from "Sched UID" to "source UID". The `url` field will point to the official session page, whichever platform hosts it.

---

## 1. Milestones

Each milestone ends with: tests green → one commit → a 3–5 line summary to you.

### M0 — Scaffold (≈½ day)
- `git init`, `.gitignore`, `LICENSE` (Apache-2.0), `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, CNCF uses it), README stub with the disclaimer.
- `pipeline/` as a uv project (`pyproject.toml`, `uv.lock`), with a single trivial passing test.
- `web/` from `npm create vite@latest -- --template react-ts`, Tailwind added, a placeholder page with the footer disclaimer.
- `.github/workflows/ci.yml` (pytest + vitest + `vite build` on PRs) and `deploy.yml` (build → `actions/upload-pages-artifact` → `actions/deploy-pages`).
- **Needs you:** create the GitHub repo and set Pages → Source = "GitHub Actions" (see the open questions; I won't touch GitHub settings).
- **Acceptance:** the live Pages URL loads the placeholder.

### M1 — Ingest
- `pipeline/ingest.py` (entry point) → `sources/sessionize.py` | `sources/ics.py` → `normalize.py` → `web/public/data/sessions.json` + `meta.json` (`updated_at`, `source`, `count`).
- Parsing that copes with messy data: speakers from the dedicated field or `Speakers:` lines in the description, level from `[Beginner]`-style text or a category field, type detection (keyword in title/track, plus Monday + co-located event name → `colocated`), HTML stripped from summaries, summary cut at the nearest word under ~200 chars.
- Duplicate UIDs: keep the last occurrence, log a warning, and test it.
- `tags.py` reads `pipeline/tags.yaml` (tag → keyword list), so contributors can edit YAML instead of Python.
- Polite fetch: stdlib `urllib`, one request, a `User-Agent: <project>/<ver> (+<repo url>)` header, a 30s timeout, and ETag/`If-Modified-Since` when the server supports them. On any failure we keep the cached snapshot and exit 0 with a warning. We fail only if there's no snapshot at all.
- Fixtures in `pipeline/tests/fixtures/`: hand-written, "real-looking" messy files with **made-up** sessions, no copied abstracts.
- Tests: TZ conversion (UTC and floating times → `-07:00`), a session with no speaker, multi-speaker, colocated vs. main, duplicate UIDs, HTML in the description, and a truncation boundary.
- `refresh-data.yml`: `cron: "17 */6 * * *"` + `workflow_dispatch`. It runs the pipeline and commits only if `git diff --quiet` fails. **Then it deploys in the same workflow** (it calls `deploy.yml` via `workflow_call`), because commits pushed with `GITHUB_TOKEN` don't trigger other workflows.

### M2 — Browse
- Hash tabs: `#/browse`, `#/plan`, `#/recommend`, `#/side-events`, `#/monday`, `#/first-timer`. One `useHashRoute()` hook, no router library.
- Sessions grouped by day → start time. Filters: day, track, type, level, tags (chips), and text search (title/speakers/summary). Filter state lives in the hash query, so filtered views are linkable.
- Times shown with `Intl.DateTimeFormat` using `timeZone: "America/Denver"`, plus a "show my local time" toggle. No date library.
- Mobile-first, Tailwind `dark:` driven by `prefers-color-scheme` plus a manual toggle. Data is fetched once as a single JSON file (gzip size should be well under 1 MB), and the list renders lazily per day.
- "Data updated at …" in the footer, taken from `meta.json`.

### M3 — My Plan + export (core value)
- `lib/storage.ts`: a versioned key (`planner.v1.plan`), every access in try/catch, and in-memory fallback if storage fails.
- Plan item = `{ id, kind: "session" | "side", backup: boolean }`.
- `lib/conflicts.ts`: overlap means `a.start < b.end && b.start < a.end` (back-to-back is **not** a conflict). Conflicting cards get a visual badge. Marking one as backup clears its conflict flag.
- `lib/ics.ts`: RFC 5545 output with CRLF line endings, 75-octet line folding, text escaping (`\,` `\;` `\n`), `VTIMEZONE` for `America/Denver`, `DTSTART;TZID=America/Denver:…`, a stable `UID` (`<id>@<project-domain>`), `DTSTAMP`, `LOCATION`, `URL`, and a short `DESCRIPTION` with the link. Backups are exported as `STATUS:TENTATIVE` (configurable).
- `lib/share.ts`: `#/plan?s=<ids>` uses base64url of a compact ID list. Opening a shared link shows a preview with "Import into my plan" and never overwrites silently.
- Vitest: conflicts (overlap, touching, nested, side-vs-session), an ICS snapshot test + folding/escaping tests, and a share round-trip + malformed input.
- Manual check: import the exported file into Google, Apple and Outlook calendars (I'll give you a checklist).

### M4 — Recommend ("Plan my KubeCon")
- Form: role, 1–5 tags, experience, days attending, All-Access yes/no (no → hide colocated sessions except Project Lightning Talks).
- `lib/scoring.ts` is a pure, deterministic function. Score = `3·|tag overlap| + roleBoost (role→tags map) + levelMatch (+2 exact, +1 adjacent, 0 unknown) + 1 if keynote`. Ties are broken by start time, then id, so it's stable.
- `lib/recommend.ts` builds a slot-greedy schedule: go through time in order and pick the highest-scoring session that doesn't conflict with what's already picked. The runner-up that overlaps the same slot becomes the backup. Each pick carries a `reasons[]` ("matched: autoscaling, sre · level match").
- "Accept all" or per-pick accept into My Plan.
- Vitest: score table tests, determinism, no conflicts in the output, the backup choice, and the pass filter.

### M5 — Community side events
- `data/events.yaml` + `data/events.schema.json` (draft 2020-12). Fields as specified, plus `id` (a slug, needed for plan/share/UID) and `example: true` on the seed entries.
- `pipeline/build_side_events.py` validates the schema and then checks what the schema can't: `start` and `end` fall within 2026-11-08..13 MST, `end > start`, the URL is `https://` and parses, no duplicate `id`, no duplicate (title, start) pair, and `last_verified` is not in the future. Errors print as `events.yaml: entry 3 ("…"): <reason>` so a web-editor contributor can fix them.
- `validate-events.yml`: runs on PRs touching `data/events.yaml`. It doesn't make network calls to RSVP URLs (that would be flaky in CI); it checks format only.
- 3–5 seed entries titled `EXAMPLE — …`, hosted by "Example Org" and linking to `https://example.com/...`. The UI shows an "example" badge.
- Side Events page: a day filter, add to plan (these take part in conflicts and ICS), and an "Add an event" button that links to GitHub's web editor for `data/events.yaml`.
- `.github/PULL_REQUEST_TEMPLATE/add-side-event.md`, `ISSUE_TEMPLATE/side-event.yml` (for people who prefer filing an issue), and `CONTRIBUTING.md` with a "60-second" path.

### M6 — Monday, First-timer, polish
- `data/colocated.yaml` → Monday comparison page (name, focus, who it's for, link). Links stay `TODO(verify)` until confirmed. A pass-rules callout at the top.
- `web/src/content/first-timer.md` with section headings and `TODO(kiran)` placeholders. I'll add practical, generic tips only where they're clearly factual (e.g. venue address, time zone).
- Accessibility: a skip link, focus rings, `aria-pressed` on toggles, labelled form controls, AA contrast in both themes, and a keyboard-only pass.
- Lighthouse mobile ≥ 90 (checked locally and noted in README). A static OG image (1200×630, plain text, no logos), meta description, and favicon.
- README: screenshot/GIF, `TODO(kiran)` "why I built this", Mermaid architecture diagram, 5-minute local setup, and how to contribute.

### Stretch (only after M6, and only with your OK)
An MCP server, a PWA/offline service worker, and room-map links.

---

## 2. File layout

```
pipeline/
  pyproject.toml  uv.lock
  source.toml            # which adapter + URL/ID; "manual" = use data/raw only
  ingest.py              # entry: fetch (or use cache) -> normalize -> write JSON
  sources/ics.py  sources/sessionize.py
  normalize.py           # shared shaping: type/level/speakers/summary
  tags.py  tags.yaml     # data-driven keyword -> tag map
  build_side_events.py
  tests/  tests/fixtures/
data/
  raw/                   # committed last-good snapshot (+ .etag)
  events.yaml  events.schema.json
  colocated.yaml         # M6
web/
  index.html  vite.config.ts  (base: "/<repo>/")
  public/data/           # GENERATED + committed: sessions.json, side_events.json, meta.json
  src/
    main.tsx  App.tsx    # App = tab bar + hash route switch
    lib/                 # pure + tested: time.ts conflicts.ts scoring.ts recommend.ts ics.ts share.ts storage.ts filters.ts
    hooks/               # useHashRoute.ts usePlan.ts useData.ts
    components/          # SessionCard, FilterBar, TabBar, Footer, ThemeToggle (~6-8 total)
    pages/               # Browse MyPlan Recommend SideEvents Monday FirstTimer
    content/first-timer.md
.github/
  workflows/ ci.yml deploy.yml refresh-data.yml validate-events.yml
  PULL_REQUEST_TEMPLATE/add-side-event.md
  ISSUE_TEMPLATE/side-event.yml  bug.yml
README.md CONTRIBUTING.md LICENSE CODE_OF_CONDUCT.md PLAN.md
```

The pipeline writes generated JSON straight into `web/public/data/` and commits it. That way `npm run dev` works with no Python, and Pages builds don't need the pipeline step.

---

## 3. Dependencies

**From your list:** `icalendar`, `pyyaml`, `jsonschema`, `pytest`, Vite, React, TypeScript, Tailwind, Vitest.

**Implied by those, which I'll add unless you object:**
- `@tailwindcss/vite` (Tailwind v4's official Vite plugin)
- ESLint config that ships with the Vite template
- `tzdata` Python package (only if needed for `zoneinfo` on some runners; macOS and Ubuntu ship tz data)

**Need your yes or no:**
1. **Markdown rendering for `first-timer.md`.** Options: (a) `marked` (small, ~40 KB, no deps); (b) no library: write the guide as a TSX page with plain JSX, which is less community-friendly; (c) convert at build time with Python `markdown`. My recommendation is (a).
2. **`ruff`** as a Python lint/format dev dependency, run in CI. Recommended: yes.

No paid services. GitHub Pages + Actions are free for public repos.

---

## 4. Open questions for you

1. ~~Schedule source~~ **Resolved (provisional):** the Sessionize app's `/api/schedule`, switching to the official ID if CNCF replies (email to `events@cncf.io` drafted; Kiran to send). If they say no, we fall back to a manual `.ics`.
2. **Session `url`:** link to the Sessionize app's session page, which is the platform the official site links to. OK?
3. **GitHub repo:** `hallway-track-na26` ✅. Is it going on your personal account? I need you to (a) create it and (b) set Pages → Source → GitHub Actions. Or I can do both with `gh` if you say so explicitly.
4. **Project name:** "Hallway Track — a community planner for KubeCon + CloudNativeCon NA 2026" (assumed from the repo name; confirm).
5. **Backups in ICS export:** include them as `TENTATIVE`, or leave them out? Default: include as tentative.
6. **Analytics:** none for now (confirming).
7. **Deps:** the `marked` and `ruff` questions in §3.

---

## 5. Risks

- **No machine-readable schedule feed** is the biggest risk. Mitigation: adapters + manual snapshot. Worst case, you refresh the snapshot by hand a few times before the event, and the 6-hourly job is a no-op.
- **Schedule churn during the event** (room changes): `last_updated` is shown prominently, and every card links to the official page.
- **Pages base path bugs:** set `base` in `vite.config.ts` and test the built site via `vite preview` in CI.
- **Side-event spam or harm:** every addition is a PR, so a human reviews it. CODEOWNERS on `data/events.yaml`.
