// scripts/check-links.ts — verify resource URLs resolve, set resources.verified_at.
// AI-free: plain HTTP HEAD checks. Usage: npx tsx scripts/check-links.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUrl(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status?: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const resources = await prisma.resource.findMany({
    select: { id: true, url: true },
    orderBy: { id: 'asc' },
  });
  console.log(`[check-links] checking ${resources.length} resources…`);
  let okCount = 0;
  for (const r of resources) {
    const { ok, status } = await checkUrl(r.url);
    if (ok) {
      okCount += 1;
      await prisma.resource.update({
        where: { id: r.id },
        data: { verifiedAt: new Date() },
      });
    }
    console.log(`  #${r.id} ${ok ? 'OK ' : 'FAIL'} ${status ?? 'ERR'} ${r.url}`);
  }
  console.log(`[check-links] done: ${okCount}/${resources.length} reachable.`);
}

main()
  .catch((e: unknown) => {
    console.error('[check-links] failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
