// scripts/bootstrap.ts — container boot helper (idempotent, safe to run every start).
// 1. Applies db/views.sql (CREATE OR REPLACE — Prisma migrations can't own views).
// 2. Seeds curated content ONLY if the DB is empty (fields count = 0).
// Usage in compose: npx tsx /app/scripts/bootstrap.ts   (after `prisma migrate deploy`)
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyViews(): Promise<void> {
  const sql = readFileSync(join(process.cwd(), 'db/views.sql'), 'utf8');
  // Strip full-line SQL comments first (a naive chunk filter would drop the
  // statement following a comment block). Inline -- comments don't occur in views.sql.
  const uncommented = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  const statements = uncommented
    .split(/;\s*\n/)
    .map((s) => s.trim().replace(/;$/, ''))
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log(`[bootstrap] views applied (${statements.length} statements).`);
}

async function seedIfEmpty(): Promise<void> {
  const [{ count }] = (await prisma.$queryRawUnsafe(
    'SELECT count(*)::int AS count FROM fields',
  )) as Array<{ count: number }>;
  if (count > 0) {
    console.log(`[bootstrap] DB already seeded (${count} fields) — skipping seed.`);
    return;
  }
  console.log('[bootstrap] empty DB detected — running seed...');
  await import('../db/seed/index.js');
}

async function main(): Promise<void> {
  await applyViews();
  await seedIfEmpty();
  console.log('[bootstrap] ready.');
}

main()
  .catch((e: unknown) => {
    console.error('[bootstrap] FAILED:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
