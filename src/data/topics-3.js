// Section 3: Operations + Quick reference + Self-Check

export const section3 = [
  /* ---------------------------------------------------------------- 09 */
  {
    id: 'local-setup',
    group: 'Operations',
    title: 'Local first-time setup',
    blocks: [
      { type: 'p', text: 'Three commands get a new machine running. The database runs in Docker; the backend and frontend stay **native** (this avoids macOS volume-mount bugs).' },
      { type: 'terminal', name: 'bash', hint: 'press ▶ Run demo', session: [
        { cmd: 'npm install                # installs the pinned Prisma CLI', out: [
          'added 812 packages in 24s',
        ]},
        { cmd: 'npm run docker:db          # Postgres 15 in Docker on 5432', out: [
          { t: ' ✔ Container acmeshop-db-1  Started', k: 'ok' },
          'listening on 0.0.0.0:5432',
        ]},
        { cmd: 'npm run db:init:seed       # migrate + seed', out: [
          'Applying 23 migrations… done',
          { t: 'Seeded 12 products, 3 shipping rates', k: 'ok' },
        ]},
      ]},
      { type: 'code', name: 'docker-compose.services.yml', lang: 'yaml', code: `services:
  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: acmeshop
      POSTGRES_PASSWORD: acmeshop
      POSTGRES_DB: acmeshop
    volumes:
      - acmeshop-db:/var/lib/postgresql/data

volumes:
  acmeshop-db:` },
      { type: 'callout', kind: 'warn', text: 'The init script is **fatal on a connection failure everywhere**. A previous version exited `0` outside production, which hid misconfigurations for months — a silent success is worse than a loud failure.' },
      { type: 'quiz', questions: [
        { q: 'What runs in Docker for local development?', options: ['Everything', 'Only Postgres — backend and frontend stay native', 'Only the backend', 'Nothing'], answer: 1,
          explain: '`docker-compose.services.yml` runs just Postgres; the app stays native to avoid macOS volume-mount bugs.' },
        { q: 'Why must the init script be fatal on connection failure?', options: ['To run faster', 'A silent exit 0 hides misconfigurations — fail loudly instead', 'Docker requires it', 'To skip seeding'], answer: 1,
          explain: 'An earlier version exited 0 outside production and hid broken configs for months; failing loudly surfaces them immediately.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 10 */
  {
    id: 'changing-schema',
    group: 'Operations',
    title: 'Changing the schema',
    blocks: [
      { type: 'p', text: 'The safe loop for any schema change is four steps — and the last two are where mistakes get caught.' },
      { type: 'ul', items: [
        'Edit `schema.prisma`.',
        'Run `npm run prisma:migrate`.',
        'Read the generated `migration.sql` **before** committing (watch for an accidental `DROP`).',
        'Commit the schema **and** the migration folder together — they must never separate.',
      ]},
      { type: 'terminal', name: 'bash', hint: 'try: npm run prisma:migrate', session: [
        { cmd: 'npm run prisma:migrate', out: [
          '✔ Name the migration: add_coupon_column',
          'created migrations/20260813_add_coupon_column/migration.sql',
          { t: '✔ applied and client regenerated', k: 'ok' },
        ]},
        { cmd: 'cat migrations/20260813_add_coupon_column/migration.sql', out: [
          { t: '-- read this before committing!', k: 'warn' },
          'ALTER TABLE "orders" ADD COLUMN "coupon_code" TEXT;',
          '(no DROP — safe)',
        ]},
        { cmd: 'git add prisma/schema.prisma prisma/migrations/', out: [
          { t: 'staged schema + migration together (never separate them)', k: 'ok' },
        ]},
      ]},
      { type: 'callout', kind: 'warn', text: 'If the schema and its migration folder are committed separately, a teammate (or CI) can end up with a schema that describes tables no migration creates — or the reverse. Always commit them in one commit.' },
      { type: 'quiz', questions: [
        { q: 'What must you do before committing a generated migration?', options: ['Deploy it to production', 'Read the `migration.sql` for accidental `DROP`s', 'Delete the schema', 'Run it twice'], answer: 1,
          explain: 'Reading the SQL catches a destructive `DROP` before it reaches the repo or production.' },
        { q: 'Schema file and migration folder should be committed…', options: ['separately', 'together, in one commit', 'only the schema', 'only the migration'], answer: 1,
          explain: 'They are one logical change; separating them lets schema and migrations drift out of sync.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 11 */
  {
    id: 'startup-tests-ci-prod',
    group: 'Operations',
    title: 'Server startup, tests, CI, production',
    blocks: [
      { type: 'ul', items: [
        '**Startup** runs a migration-status check — production **exits 1** if a migration is pending.',
        '**Tests** use a real Postgres database (`acmeshop_test`), not mocks. Worker setup carefully avoids disconnecting a shared client while other files are still running.',
        '**CI** starts a Postgres service container, then `migrate deploy` → `generate` → `seed`.',
        '**Production** deploy order is strict: wake Neon → `migrate deploy` with `DIRECT_URL` (3 attempts) → deploy to Vercel.',
      ]},
      { type: 'code', name: 'production deploy order', lang: 'text', code: `wake Neon (retry TCP)
   │
   ▼
prisma migrate deploy   (DIRECT_URL, up to 3 attempts)
   │
   ▼
deploy to Vercel        (new code starts serving traffic)` },
      { type: 'callout', text: 'Migrations always run **before** new code serves traffic — the **expand/contract** discipline. New code must never talk to an old schema, and the currently-running code must survive the new schema until it is replaced.' },
      { type: 'terminal', name: 'bash', hint: 'try: npm run db:init:check', session: [
        { cmd: 'npm run db:init:check   # startup migration-status gate', out: [
          { t: '✗ 1 pending migration: 20260813_add_coupon_column', k: 'err' },
          { t: 'production exits 1 — refusing to serve on a stale schema', k: 'err' },
        ]},
        { cmd: 'prisma migrate deploy   # DIRECT_URL, attempt 1/3', out: [
          'attempt 1: connection reset',
          { t: 'attempt 2: applied 1 migration', k: 'ok' },
          { t: 'schema is current — safe to deploy new code', k: 'ok' },
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'What does the startup migration-status check do in production?', options: ['Applies pending migrations', 'Exits 1 if a migration is pending', 'Seeds the database', 'Nothing'], answer: 1,
          explain: 'Production refuses to serve on a stale schema — it exits 1 when a migration is pending.' },
        { q: 'Why must migrations run before the new code serves traffic?', options: ['To save time', 'Expand/contract — new code must never talk to an old schema', 'Vercel requires it', 'To avoid the pooler'], answer: 1,
          explain: 'Migrations apply first so the schema is ready; expand/contract keeps both the old and new code working across the change.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 12 */
  {
    id: 'things-to-watch',
    group: 'Operations',
    title: 'Two things to watch',
    blocks: [
      { type: 'p', text: 'Two rough edges are worth knowing so they do not surprise you.' },
      { type: 'ul', items: [
        '`@prisma/adapter-neon` is **declared but unused**. The defensive fallback for transactions is still useful, but the adapter itself is not wired in.',
        'Hand-written scripts under `apps/backend/migrations/` and some monitoring scripts use **raw SQL outside** the ESLint-guarded application paths. Treat them with the same care as guarded code.',
      ]},
      { type: 'callout', text: 'The DI gatekeeper and `no-restricted-imports` only protect the application paths. Raw-SQL scripts outside those paths are on you — review them as carefully as the guarded code.' },
      { type: 'quiz', questions: [
        { q: 'What is true of `@prisma/adapter-neon` here?', options: ['It is the main connection method', 'It is declared but unused (not wired in)', 'It replaces the singleton', 'It runs migrations'], answer: 1,
          explain: 'The adapter is declared but not wired in; the defensive transaction fallback is what remains useful.' },
        { q: 'Why treat scripts under `apps/backend/migrations/` with extra care?', options: ['They run faster', 'They use raw SQL outside the ESLint-guarded paths', 'They are auto-generated', 'They cannot fail'], answer: 1,
          explain: 'Those scripts sit outside the DI/lint guards, so their raw SQL has no automated safety net.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 13 */
  {
    id: 'quick-reference',
    group: 'Reference',
    title: 'Quick reference',
    blocks: [
      { type: 'p', text: 'The everyday commands. Type any of them into the simulator below to see what it does.' },
      { type: 'table',
        head: ['Task', 'Command'],
        rows: [
          ['Start local Postgres', '`npm run docker:db`'],
          ['Migrate + seed', '`npm run db:init:seed`'],
          ['Full reset', '`npm run db:reset`'],
          ['Check migrations only', '`npm run db:init:check`'],
          ['New migration after schema edit', '`npm run prisma:migrate`'],
          ['Apply migrations (prod/CI)', '`npm run prisma:migrate:deploy`'],
          ['Regenerate client', '`npm run prisma:generate`'],
          ['Browse tables', '`npm run prisma:studio`'],
          ['Verify DI compliance', '`npm run gatekeeper`'],
        ]},
      { type: 'terminal', name: 'bash', hint: 'type any command from the table above',
        commands: {
          'npm run docker:db': [{ t: ' ✔ Container acmeshop-db-1  Started (Postgres 15 on 5432)', k: 'ok' }],
          'npm run db:init:seed': ['Applying 23 migrations… done', { t: 'Seeded 12 products, 3 shipping rates', k: 'ok' }],
          'npm run db:reset': [{ t: 'Dropped, re-created, migrated, and re-seeded acmeshop', k: 'ok' }],
          'npm run db:init:check': [{ t: '✓ schema is current — no pending migrations', k: 'ok' }],
          'npm run prisma:migrate': ['✔ created + applied a new migration, client regenerated'],
          'npm run prisma:migrate:deploy': [{ t: 'All migrations have been successfully applied.', k: 'ok' }],
          'npm run prisma:generate': [{ t: '✔ Generated Prisma Client (6.19.3)', k: 'ok' }],
          'npm run prisma:studio': ['Prisma Studio is up on http://localhost:5555'],
          'npm run gatekeeper': [{ t: '✓ no DI violations — exit 0', k: 'ok' }],
        }},
      { type: 'quiz', questions: [
        { q: 'Which command applies migrations in production/CI without inventing SQL?', options: ['`npm run prisma:migrate`', '`npm run prisma:migrate:deploy`', '`npm run db:reset`', '`npm run prisma:studio`'], answer: 1,
          explain: '`prisma:migrate:deploy` runs `prisma migrate deploy` — apply-only, never generative or destructive.' },
        { q: 'Which command opens a table browser?', options: ['`npm run prisma:generate`', '`npm run prisma:studio`', '`npm run gatekeeper`', '`npm run docker:db`'], answer: 1,
          explain: '`prisma:studio` launches Prisma Studio to browse and edit table data.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 14 */
  {
    id: 'self-check',
    group: 'Self-Check',
    title: 'Self-check questions',
    blocks: [
      { type: 'p', text: 'Answer these out loud first, then check yourself. If any feel shaky, jump back to the matching topic and drive the tool again.' },
      { type: 'quiz', questions: [
        { q: '1. Schema changes (DDL) in production must use…', options: [
          'the pooled `DATABASE_URL`', 'the direct `DIRECT_URL`', 'either URL', 'a SQLite fallback'], answer: 1,
          explain: 'DDL uses the direct, unpooled `DIRECT_URL`. Through the pooler it fails silently.' },
        { q: '2. The only file allowed to instantiate `PrismaClient` is…', options: [
          'any service that needs the database', '`apps/backend/bootstrap/db.js`', 'every serverless entry point', 'the migration scripts'], answer: 1,
          explain: 'Only `bootstrap/db.js` constructs the client; everything else imports the shared singleton.' },
        { q: '3. Which command is safe for production and CI?', options: [
          '`prisma migrate dev`', '`prisma migrate deploy`', '`prisma db push`', '`prisma migrate reset`'], answer: 1,
          explain: '`migrate deploy` applies existing migration files only — it never invents SQL or drops data.' },
        { q: '4. Inside a `$transaction` callback you must use…', options: [
          'the outer `prisma`', 'the `tx` handle', 'a new PrismaClient', 'raw SQL'], answer: 1,
          explain: 'Only `tx` participates in the transaction; the outer `prisma` runs outside it and will not roll back.' },
        { q: '5. Why is the client cached on `globalThis`?', options: [
          'To make it public', 'So serverless module reloads reuse one pool instead of exhausting connections', 'To run migrations', 'To skip seeding'], answer: 1,
          explain: 'Serverless reloads modules repeatedly; caching on `globalThis` prevents a fresh pool per reload.' },
      ]},
      { type: 'callout', kind: 'tip', text: 'Right tool per need: **schema** for structure, **migrate deploy** for production/CI, the **singleton + DI** for connection safety, and **expand/contract** migrations so new code never talks to an old schema.' },
    ],
  },
]
