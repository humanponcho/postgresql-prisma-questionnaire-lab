// Section 1: Foundations
// Each topic mirrors a lesson in the PostgreSQL + Prisma lesson, adds an
// interactive tool (schema analyzer / connection simulator / terminal), and a quiz.

export const section1 = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: 'the-parts',
    group: 'Foundations',
    title: 'The parts',
    blocks: [
      { type: 'p', text: '**PostgreSQL** ("Postgres") is the **database server** — it stores every shop entity in tables (users, products, orders, shipping rates, and so on). **Prisma** is the tool that sits between the Node.js code and Postgres. It has exactly **three jobs**.' },
      { type: 'table',
        head: ['Job', 'Tool', 'What it does'],
        rows: [
          ['Describe the tables', 'Prisma schema', 'One file lists every table and column'],
          ['Change the tables', 'Prisma Migrate', 'Writes and applies SQL files that alter the database'],
          ['Read and write rows', 'Prisma Client', 'Generated JavaScript, e.g. `prisma.order.findMany()`'],
        ]},
      { type: 'callout', text: 'Prisma is pinned to **exactly 6.19.3** in both the root and backend `package.json`. The CLI and the generated client must match — a version drift between them causes subtle, confusing failures.' },
      { type: 'p', text: 'Three groups use the system: **developers** on their own machines, the **CI pipeline**, and the **production** server.' },
      { type: 'terminal', name: 'bash', hint: 'try: npx prisma version', session: [
        { cmd: 'npx prisma version', out: [
          { t: 'prisma                  : 6.19.3', k: 'ok' },
          { t: '@prisma/client          : 6.19.3', k: 'ok' },
          'Node.js                 : v20.11.1',
          'Default Engines Hash    : a1b2c3…',
        ]},
        { cmd: 'npm ls prisma @prisma/client', out: [
          'acmeshop@1.0.0',
          '├── prisma@6.19.3',
          '└── @prisma/client@6.19.3',
          { t: '(CLI and client match — good)', k: 'ok' },
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'Which of Prisma\'s three jobs does the Prisma Client do?', options: ['Describe the tables', 'Change the tables', 'Read and write rows', 'Back up the database'], answer: 2,
          explain: 'The generated Client reads/writes rows, e.g. `prisma.order.findMany()`. The schema describes; Migrate changes.' },
        { q: 'Why pin the Prisma CLI and client to the same version?', options: ['To save disk space', 'The CLI and generated client must match or you get subtle failures', 'Newer is always required', 'To avoid installing Postgres'], answer: 1,
          explain: 'A drift between the CLI (which generates) and the client (which runs) causes confusing, hard-to-trace errors.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: 'the-schema',
    group: 'Foundations',
    title: 'The schema — single source of truth',
    blocks: [
      { type: 'p', text: '`apps/backend/prisma/schema.prisma` (403 lines, 20 tables) is the **single source of truth**. It begins with two blocks: the **generator** (how the client is built) and the **datasource** (which database and connection strings to use).' },
      { type: 'ul', items: [
        '`binaryTargets` lists every platform that must be able to run the client — Mac (`native`), Vercel serverless (`rhel-openssl-3.0.x`), Alpine/ARM Docker, and so on.',
        'Miss a target and the app crashes **only on that platform** — it builds fine locally and breaks in production.',
      ]},
      { type: 'h2', text: 'Validate a schema', tag: 'live' },
      { type: 'p', text: 'This parses the schema in your browser. Press ▶ Validate. Then try two experiments: delete the `directUrl` line (watch it warn about silent DDL failures), or cut `binaryTargets` down to just `["native"]` (watch it warn about crashing on other platforms).' },
      { type: 'schema', name: 'schema.prisma', height: 340, code: `generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x", "linux-musl-arm64-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  orders Order[]
  @@map("users")
}

model Order {
  id     Int   @id @default(autoincrement())
  userId Int
  user   User  @relation(fields: [userId], references: [id])
  total  Float
  @@map("orders")
}

model ConsumedPayment {
  id        Int    @id @default(autoincrement())
  reference String @unique
  @@map("consumed_payments")
}` },
      { type: 'quiz', questions: [
        { q: 'What does `binaryTargets` control?', options: ['Which tables are created', 'Which platforms can run the generated client', 'The connection pool size', 'The migration order'], answer: 1,
          explain: 'It lists every OS/arch that must run the client. Miss one and the app crashes only on that platform.' },
        { q: 'The schema file is described as…', options: ['a cache', 'the single source of truth for the database structure', 'optional documentation', 'generated from the database'], answer: 1,
          explain: 'One schema file defines every table and column — the single source of truth.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: 'two-connection-strings',
    group: 'Foundations',
    title: 'Two connection strings',
    blocks: [
      { type: 'p', text: 'This is the **most important production detail**. Two connection strings are mandatory in production, and using the wrong one for schema changes fails **silently**.' },
      { type: 'ul', items: [
        '`DATABASE_URL` — the **pooled** connection (Neon connection pooler). All normal queries go here.',
        '`DIRECT_URL` — the **direct**, unpooled connection. Schema changes (`CREATE TABLE`, `ALTER TABLE`) must **never** go through the pooler.',
        'Using the pooled URL for DDL makes migrations **fail silently** — the command looks like it worked, but the schema never changed.',
      ]},
      { type: 'h2', text: 'Route it yourself', tag: 'live' },
      { type: 'p', text: 'Pick an operation and a connection string. Watch the verdict — normal query + pooled is correct, but a schema change through the pooler fails silently.' },
      { type: 'routing' },
      { type: 'code', name: '.env', lang: 'bash', code: `# pooled — for the app's normal traffic
DATABASE_URL="postgresql://user:pass@ep-cool-123-pooler.eu.neon.tech/acmeshop?sslmode=require"

# direct — for migrations / DDL only
DIRECT_URL="postgresql://user:pass@ep-cool-123.eu.neon.tech/acmeshop?sslmode=require"` },
      { type: 'quiz', questions: [
        { q: 'Schema changes (DDL) in production must use…', options: ['the pooled `DATABASE_URL`', 'the direct `DIRECT_URL`', 'either URL', 'a SQLite fallback'], answer: 1,
          explain: 'DDL must use the direct, unpooled `DIRECT_URL`. Through the pooler it fails silently.' },
        { q: 'What happens if a migration runs through the pooled URL?', options: ['It errors loudly', 'It fails silently — looks fine, schema unchanged', 'It runs twice', 'It uses SQLite'], answer: 1,
          explain: 'The pooler swallows DDL: the command appears to succeed but the change never lands.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: 'naming-constraints',
    group: 'Foundations',
    title: 'Naming conventions & constraints',
    blocks: [
      { type: 'ul', items: [
        'Every model uses `@@map` so JavaScript sees **camelCase** while the database sees **snake_case**.',
        'Primary keys are plain `Int @id @default(autoincrement())`.',
        'Money uses `Float` — a deliberate trade-off recorded in **ADR-001**.',
      ]},
      { type: 'p', text: 'Business rules are enforced by **unique constraints**, not application code alone. The database is the last line of defence against a double-charge.' },
      { type: 'h2', text: 'The idempotency pattern', tag: 'live' },
      { type: 'p', text: 'Press ▶ Validate. The analyzer lists each `@unique` field as a business-rule constraint. `orderService.js` relies on Prisma error code `P2002` (unique-constraint violation) to reject a double-charge — the same pattern guards `WebhookEvent.stripeEventId` and `IdempotencyKey.key`.' },
      { type: 'schema', name: 'schema.prisma (excerpt)', height: 260, code: `model ConsumedPayment {
  id        Int    @id @default(autoincrement())
  reference String @unique
  @@map("consumed_payments")
}

model WebhookEvent {
  id            Int    @id @default(autoincrement())
  stripeEventId String @unique
  @@map("webhook_events")
}

model IdempotencyKey {
  id  Int    @id @default(autoincrement())
  key String @unique
  @@map("idempotency_keys")
}` },
      { type: 'code', name: 'orderService.js (excerpt)', lang: 'javascript', code: `try {
  await prisma.consumedPayment.create({ data: { reference } });
} catch (err) {
  // P2002 = unique constraint violation → this payment was already processed
  if (err.code === "P2002") throw new DoubleChargeError(reference);
  throw err;
}` },
      { type: 'callout', text: 'The database, not the app, guarantees uniqueness. Even if two requests race, only one `create` wins; the other gets `P2002` and is safely rejected.' },
      { type: 'quiz', questions: [
        { q: 'Why put a `@unique` constraint on `reference` instead of only checking in code?', options: ['It is faster to read', 'The database enforces it even under a race — the app check alone can be bypassed', 'It saves storage', 'Prisma requires it'], answer: 1,
          explain: 'Two concurrent requests can both pass an app-level check; the DB unique constraint lets only one succeed (P2002 for the other).' },
        { q: 'What does `@@map` achieve?', options: ['Adds an index', 'Maps a camelCase model to a snake_case table name', 'Makes the field unique', 'Sets the primary key'], answer: 1,
          explain: 'JavaScript works in camelCase; `@@map` gives the underlying table its snake_case name.' },
      ]},
    ],
  },
]
