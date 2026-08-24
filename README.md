# PostgreSQL + Prisma Questionnaire Lab

A hands-on, build-it-yourself study app covering a **production PostgreSQL + Prisma** setup — one schema as the source of truth, two connection strings (pooled vs direct), a client singleton behind dependency injection, and expand/contract migrations. Instead of just reading, you *operate* it: a `schema.prisma` analyzer, an interactive pooled-vs-direct connection simulator, and a simulated Prisma CLI — all in the browser — plus a self-check quiz per topic.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5176). It opens automatically.

To make a production build:

```bash
npm run build && npm run preview
```

> Everything runs in the browser. There is **no database or Prisma CLI** — the terminal replays realistic output, and the schema tool parses and analyzes your input client-side.

## What's inside

**14 topics across 5 sections**, in lesson order:

- **Foundations** — The parts, the schema, two connection strings, naming & constraints
- **Migrations & Client** — migrations, the client singleton, dependency injection, query patterns
- **Operations** — local setup, changing the schema, startup/tests/CI/production, two things to watch
- **Reference** — the everyday command cheat-sheet
- **Self-Check** — recap questions

Each topic has three parts: **read the concept → run the tool → test yourself.**

## How the interactive tools work

- **Schema Lab** (`src/playgrounds/SchemaLab.jsx`) — parses a `schema.prisma` client-side, lists the datasource/generator settings and every model (table name via `@@map`, primary key, unique business-rule constraints, relations), and lints the lesson traps: a missing `directUrl` (DDL would fail silently through the pooler) and `binaryTargets` that would crash on other platforms. Edit it, press **▶ Validate**.
- **Routing Lab** (`src/playgrounds/RoutingLab.jsx`) — an interactive connection-routing simulator. Pick an operation (normal query vs schema change) and a connection string (pooled `DATABASE_URL` vs direct `DIRECT_URL`) and see the verdict — including the classic "DDL through the pooler fails silently".
- **Terminal** (`src/playgrounds/Terminal.jsx`) — a *simulated* shell for `npm` scripts, the `prisma` CLI, `psql`, and the DI gatekeeper. Press **▶ Run demo**, or type one of the commands.

## Editing content

All topic content is authored as data in `src/data/topics-1.js` … `topics-3.js`. Each block is `{ type: 'p' | 'ul' | 'h2' | 'callout' | 'table' | 'code' | 'terminal' | 'schema' | 'routing' | 'quiz', ... }`. Add or edit a topic there and it appears in the sidebar automatically.

## Progress

Topics you mark "understood" are saved in `localStorage`, and the sidebar tracks your completion percentage.

## Project structure

```
src/
  App.jsx                  sidebar, progress, home, topic view, nav
  components/
    Blocks.jsx             maps content-block data → UI
    CodeBlock.jsx          read-only, lightly highlighted code panels
    Table.jsx              simple data tables
    Quiz.jsx               self-check quiz with feedback
  playgrounds/
    Terminal.jsx           simulated Prisma/Postgres shell
    SchemaLab.jsx          schema.prisma analyzer + linter
    RoutingLab.jsx         pooled-vs-direct connection simulator
  data/
    topics.js              combines sections, builds sidebar groups
    topics-1..3.js         the syllabus content
  styles.css               visual system
```

## Styling

The colour tokens, the accent rules and the contrast floor are documented in
[STYLE.md](STYLE.md). Read it before you change [src/styles.css](src/styles.css).

This app uses the shared paper/phosphor token system: one `light-dark()` value
per colour, e-ink paper in the light scheme and CRT phosphor in the dark one. It
follows the reader's operating system appearance — there is no in-app switch.

[tools/contrast-audit.py](tools/contrast-audit.py) checks every colour against
the surface it lands on. It must exit 0 before you commit a stylesheet change:

```bash
python3 tools/contrast-audit.py src/styles.css
```

## Deploy to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and publishes on every push to `master`. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The site is then served at `https://<user>.github.io/postgresql-prisma-questionnaire-lab/`.

## Credits

Structure and visual system adapted from the Dev Questionnaire Lab. Content based on a real production monorepo (KShop).
