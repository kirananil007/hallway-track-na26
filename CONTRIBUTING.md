# Contributing

Thanks for helping! Hallway Track is an unofficial community project.

## Add a side event (about 1 minute, no setup)

Meetups, happy hours, project gatherings, community runs: if it's public and around
KubeCon + CloudNativeCon NA 2026 in Salt Lake City (Nov 8–13), add it.

1. Open [`data/events.yaml` in the GitHub editor](https://github.com/kirananil007/hallway-track-na26/edit/main/data/events.yaml).
   GitHub will offer to fork the repo for you. Say yes.
2. Paste this at the very end of the file, under `events:` (the same template is in the
   comments at the top of the file), and change the details:

   ```yaml
     - id: otel-community-meetup          # short, lowercase-with-dashes, unique
       title: OpenTelemetry community meetup
       host: Your group or company
       start: 2026-11-10T18:30            # Salt Lake City local time
       end: 2026-11-10T21:00
       venue: Name of the place
       address: 123 Main St, Salt Lake City, UT   # optional
       url: https://lu.ma/your-event      # RSVP or details page (https)
       tags: [observability, opentelemetry]       # up to 5, see the list below
       cost: free                         # free or paid
       requires_registration: true
       submitted_by: your-github-handle   # without the @
       last_verified: 2026-10-21          # today's date
   ```

   Keep the two leading spaces before `- id:`. Indentation matters in YAML.
3. Click **Commit changes…**, then **Propose changes**, then **Create pull request**.

An automatic check runs on your pull request within a minute. If it fails, open
**Details**: it lists exactly what to fix (wrong date, missing field, unknown tag…).
Edit the file in your fork and the check runs again. Once a maintainer merges it, the
event appears on the site within a few minutes.

**Tags you can use:** see [`pipeline/tags.yaml`](pipeline/tags.yaml), e.g. `observability`,
`opentelemetry`, `security`, `platform-engineering`, `gitops`, `ai-ml`, `networking`,
`sre`, `beginner`, `contributor`.

**Please only add events that are** public (anyone can RSVP, even if paid), follow the
event Code of Conduct, and have a real RSVP or details page. We only store your GitHub
handle, nothing else.

**Event changed or cancelled?** Edit or delete its entry the same way, and update `last_verified`.

## Improve interest tags

Tags come from keyword matching in [`pipeline/tags.yaml`](pipeline/tags.yaml). Add a
keyword to a tag's list and open a pull request.

## Code changes

See [Run it locally](README.md#run-it-locally). Please run the tests before opening a PR:
`cd pipeline && uv run pytest` and `cd web && npm test && npm run lint`.

By contributing you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions
are licensed under [Apache-2.0](LICENSE).
