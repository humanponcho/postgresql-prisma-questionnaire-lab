// Section 2: Migrations & the Client

export const section2 = [
  /* ---------------------------------------------------------------- 05 */
  {
    id: 'migrations',
    group: 'Migrations & Client',
    title: 'Migrations — how tables change',
    blocks: [
      { type: 'p', text: 'A **migration** is a timestamped folder containing one `migration.sql` file. There are currently **23** of them under `apps/backend/prisma/migrations/`. Two commands do two very different jobs.' },
      { type: 'table',
        head: ['npm script', 'Prisma command', 'When', 'What it does'],
        rows: [
          ['`prisma:migrate`', '`prisma migrate dev`', 'Development only', 'Compares schema → writes a new migration → applies it → regenerates the client'],
          ['`prisma:migrate:deploy`', '`prisma migrate deploy`', 'Production & CI', 'Applies existing migration files and nothing else — never invents SQL, never drops data'],
        ]},
      { type: 'callout', text: 'Prisma records which migrations have run in the hidden `_prisma_migrations` table, so `migrate deploy` knows exactly what is left to apply.' },
      { type: 'terminal', name: 'bash', hint: 'try: npm run prisma:migrate:deploy', session: [
        { cmd: 'npm run prisma:migrate   # dev only', out: [
          '✔ Enter a name for the new migration: add_coupon_table',
          'Applying migration 20260813_add_coupon_table',
          { t: 'The following migration was created and applied:', k: 'ok' },
          '  migrations/20260813_add_coupon_table/migration.sql',
          '✔ Generated Prisma Client',
        ]},
        { cmd: 'npm run prisma:migrate:deploy   # prod / CI', out: [
          '3 migrations found in prisma/migrations',
          { t: 'Applying migration 20260813_add_coupon_table', k: 'ok' },
          { t: 'All migrations have been successfully applied.', k: 'ok' },
          '(applies existing files only — never invents SQL)',
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'Which command is safe for production and CI?', options: ['`prisma migrate dev`', '`prisma migrate deploy`', '`prisma db push`', '`prisma migrate reset`'], answer: 1,
          explain: '`migrate deploy` only applies existing migration files — it never invents SQL or drops data.' },
        { q: 'Where does Prisma track which migrations have run?', options: ['A JSON file', 'The `_prisma_migrations` table', 'Git tags', 'Environment variables'], answer: 1,
          explain: 'The hidden `_prisma_migrations` table records applied migrations so deploy knows what remains.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: 'client-singleton',
    group: 'Migrations & Client',
    title: 'The client singleton',
    blocks: [
      { type: 'p', text: '`apps/backend/bootstrap/db.js` is the **only** file allowed to create a `PrismaClient`. It stores the instance on `globalThis` so serverless module reloads do **not** open extra connection pools, then wraps it in a `Proxy` so tests can swap a fake client without re-importing modules.' },
      { type: 'code', name: 'bootstrap/db.js', lang: 'javascript', code: `import { PrismaClient } from "@prisma/client";

// Reuse one instance across serverless module reloads (no extra pools).
const g = globalThis;
const real = g.__prisma ?? (g.__prisma = new PrismaClient());

// Proxy indirection lets tests swap in a fake without re-importing modules.
let current = real;
export const prisma = new Proxy({}, { get: (_t, key) => current[key] });
export function __setPrismaForTests(fake) { current = fake; }` },
      { type: 'p', text: 'Two rules protect the pattern:' },
      { type: 'ul', items: [
        'ESLint `no-restricted-imports` bans direct `PrismaClient` imports and `$queryRawUnsafe`.',
        'The DI gatekeeper script (`npm run gatekeeper`) greps for any bypass and **fails CI**.',
      ]},
      { type: 'terminal', name: 'bash', hint: 'try: npm run gatekeeper', session: [
        { cmd: 'npm run gatekeeper', out: [
          'scanning apps/backend for PrismaClient bypasses…',
          { t: '✗ apps/backend/services/reportService.js:3', k: 'err' },
          '    const prisma = new PrismaClient();',
          { t: 'DI violation: import the singleton from bootstrap/db.js instead.', k: 'err' },
          { t: 'exit 1  (CI fails)', k: 'err' },
        ]},
      ]},
      { type: 'callout', kind: 'warn', text: 'A stray `new PrismaClient()` on serverless opens a fresh pool on every cold start and **exhausts the database connections**. The singleton + gatekeeper exist to make that impossible.' },
      { type: 'quiz', questions: [
        { q: 'The only file allowed to instantiate `PrismaClient` is…', options: ['any service that needs the database', '`apps/backend/bootstrap/db.js`', 'every serverless entry point', 'the migration scripts'], answer: 1,
          explain: 'Only `bootstrap/db.js` constructs the client; everything else imports the shared singleton.' },
        { q: 'Why store the instance on `globalThis`?', options: ['To make it public', 'So serverless module reloads reuse one pool instead of opening new ones', 'To speed up queries', 'To avoid migrations'], answer: 1,
          explain: 'Serverless reloads a module repeatedly; caching on `globalThis` prevents a new pool per reload — the pool-exhaustion fix.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 07 */
  {
    id: 'dependency-injection',
    group: 'Migrations & Client',
    title: 'Dependency injection',
    blocks: [
      { type: 'p', text: 'No service imports `prisma` itself. `server.js` creates every service by **factory**, passing the shared client in. That is what makes tests trivial and keeps a single connection strategy across both deployment shapes.' },
      { type: 'code', name: 'server.js (excerpt)', lang: 'javascript', code: `import { prisma } from "./bootstrap/db.js";
import { createOrderService } from "./services/orderService.js";
import { createCartService } from "./services/cartService.js";

const orderService = createOrderService({ prisma, logger, mailer });
const cartService  = createCartService({ prisma, logger });

// A test simply passes a fake:
//   createOrderService({ prisma: fakePrisma, logger, mailer })` },
      { type: 'callout', text: 'The same singleton is imported by every Vercel serverless entry point, so the long-running server and the serverless functions share **one** connection strategy.' },
      { type: 'terminal', name: 'bash', hint: 'try: npm run gatekeeper', session: [
        { cmd: 'npm run gatekeeper', out: [
          'scanning apps/backend for PrismaClient bypasses…',
          { t: '✓ no direct PrismaClient imports', k: 'ok' },
          { t: '✓ no $queryRawUnsafe', k: 'ok' },
          { t: '✓ all services receive prisma by injection', k: 'ok' },
          { t: 'exit 0', k: 'ok' },
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'How does a service get its database client?', options: ['It imports `prisma` directly', 'It is passed in via a factory (dependency injection)', 'It calls `new PrismaClient()`', 'From a global variable'], answer: 1,
          explain: 'Services are created by factories that receive `{ prisma, ... }`, so a test can pass a fake client.' },
        { q: 'What is the main testing benefit of injecting `prisma`?', options: ['Faster queries', 'A test can pass a fake client without touching a real database', 'Smaller bundle', 'No migrations needed'], answer: 1,
          explain: 'Injection means the test supplies a fake `prisma`, so the service can be tested in isolation.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 08 */
  {
    id: 'query-patterns',
    group: 'Migrations & Client',
    title: 'Query patterns',
    blocks: [
      { type: 'ul', items: [
        '**Transactions** group multiple writes so either all succeed or none do. Inside a transaction the code must use the `tx` handle — never the outer `prisma`.',
        'Atomic stock decrement uses `{ decrement: qty }` so two concurrent orders cannot both succeed when only one unit remains.',
        'Selective `select` and limited nested `include` keep payloads small.',
        'Interactive transactions can fail through a connection pooler, so read-only listing code falls back to **sequential** queries.',
      ]},
      { type: 'h2', text: 'An atomic checkout transaction' },
      { type: 'code', name: 'orderService.js (excerpt)', lang: 'javascript', code: `await prisma.$transaction(async (tx) => {
  // Use tx, NOT the outer prisma, for every write in here.
  const updated = await tx.product.updateMany({
    where: { id, stock: { gte: qty } },
    data:  { stock: { decrement: qty } },   // atomic — no read-then-write race
  });
  if (updated.count === 0) throw new OutOfStockError(id);

  await tx.order.create({ data: { productId: id, qty } });
});` },
      { type: 'callout', kind: 'warn', text: 'If you call the outer `prisma` inside the callback, that query runs **outside** the transaction — so a later rollback will not undo it. Always use `tx`.' },
      { type: 'quiz', questions: [
        { q: 'Inside a `$transaction` callback, which handle must you use?', options: ['the outer `prisma`', 'the `tx` handle', 'either works', 'a new PrismaClient'], answer: 1,
          explain: 'Only `tx` participates in the transaction; the outer `prisma` runs outside it and will not roll back.' },
        { q: 'Why decrement stock with `{ decrement: qty }` instead of read-then-write?', options: ['It is shorter', 'It is atomic — two concurrent orders cannot both oversell the last unit', 'It avoids a transaction', 'It is required by Postgres'], answer: 1,
          explain: 'An atomic decrement (guarded by `stock: { gte: qty }`) prevents the classic read-then-write race between concurrent orders.' },
      ]},
    ],
  },
]
