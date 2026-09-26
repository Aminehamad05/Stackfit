// db/seed/index.ts — MVP seed per AGENT_SPEC §8.
// Loads ALL db/seed/*.json into Postgres via Prisma (idempotent: upserts by slug/unique).
// Usage: npm run db:seed   (= tsx db/seed/index.ts)
// Insert order respects FKs; slug/name references are resolved to ids in code.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PrismaClient,
  type BackgroundKind,
  type ContentStatus,
  type EventStatus,
  type EventType,
  type Level,
  type ResourceType,
} from '@prisma/client';

const prisma = new PrismaClient();
// Seed JSONs live next to this file; the script always runs from the repo root
// (npm run db:seed), so resolve relative to CWD — not import.meta (CJS-safe).
const dir = join(process.cwd(), 'db/seed');
const load = <T>(f: string): T => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T;

// ---- JSON row shapes (match the seed files) ----
interface FieldRow { slug: string; name: string; description: string }
interface ConceptRow { slug: string; name: string; description: string; level: Level; status: ContentStatus }
interface PrereqRow { concept_slug: string; prereq_slug: string }
interface FieldConceptRow { field_slug: string; concept_slug: string; importance: number }
interface BgItemRow { kind: BackgroundKind; name: string }
interface BgItemConceptRow { item_kind: string; item_name: string; concept_slug: string; strength: number }
interface ResourceRow {
  title: string; url: string; provider: string | null; type: ResourceType;
  is_free: boolean; price_cents: number | null; currency: string | null;
  duration_min: number | null; level: Level; language: string; status: ContentStatus;
}
interface ConceptResourceRow { concept_slug: string; resource_url: string; rank: number }
interface OptionRow { text: string; is_correct: boolean }
interface QuestionRow {
  concept_slug: string; stem: string; difficulty: Level; explanation: string;
  source: string; status: ContentStatus; options: OptionRow[];
}
interface TasterRow {
  field_slug: string; slug: string; title: string; description: string; level: Level;
  est_hours: number; deliverable_type: string; starter_repo_url: string | null;
  rubric: unknown; status: ContentStatus;
}
interface TasterConceptRow { taster_slug: string; concept_slug: string }
interface TasterResourceRow { taster_slug: string; resource_url: string; rank: number }
interface ClubRow { name: string; description: string | null; contact_email: string | null }
interface EventRow {
  title: string; type: EventType; city: string | null; country: string; location: string | null;
  description: string | null; starts_at: string; ends_at: string | null; url: string | null;
  club_name: string; field_slug: string | null; status: EventStatus;
}

async function main(): Promise<void> {
  // 1. Fields
  const fields = load<FieldRow[]>('fields.json');
  for (const f of fields) {
    await prisma.field.upsert({
      where: { slug: f.slug },
      update: { name: f.name, description: f.description },
      create: { slug: f.slug, name: f.name, description: f.description },
    });
  }
  const fieldId = async (slug: string): Promise<number> =>
    (await prisma.field.findUniqueOrThrow({ where: { slug } })).id;
  console.log(`[seed] fields: ${fields.length}`);

  // 2. Concepts
  const concepts = load<ConceptRow[]>('concepts.json');
  for (const c of concepts) {
    await prisma.concept.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, level: c.level, status: c.status },
      create: { slug: c.slug, name: c.name, description: c.description, level: c.level, status: c.status },
    });
  }
  const conceptId = async (slug: string): Promise<number> =>
    (await prisma.concept.findUniqueOrThrow({ where: { slug } })).id;
  const conceptIds = new Map<string, number>();
  for (const c of concepts) conceptIds.set(c.slug, await conceptId(c.slug));
  console.log(`[seed] concepts: ${concepts.length}`);

  // 3. Prerequisites (delete+insert: edges have no payload to upsert)
  const prereqs = load<PrereqRow[]>('concept_prerequisites.json');
  await prisma.conceptPrerequisite.deleteMany();
  await prisma.conceptPrerequisite.createMany({
    data: prereqs.map((p) => ({
      conceptId: conceptIds.get(p.concept_slug) as number,
      prereqId: conceptIds.get(p.prereq_slug) as number,
    })),
    skipDuplicates: true,
  });
  console.log(`[seed] concept_prerequisites: ${prereqs.length}`);

  // 4. Field ↔ concepts
  const fcs = load<FieldConceptRow[]>('field_concepts.json');
  await prisma.fieldConcept.deleteMany();
  await prisma.fieldConcept.createMany({
    data: await Promise.all(
      fcs.map(async (r) => ({
        fieldId: await fieldId(r.field_slug),
        conceptId: conceptIds.get(r.concept_slug) as number,
        importance: r.importance,
      })),
    ),
    skipDuplicates: true,
  });
  console.log(`[seed] field_concepts: ${fcs.length}`);

  // 5. Background items + mappings
  const items = load<BgItemRow[]>('background_items.json');
  for (const i of items) {
    await prisma.backgroundItem.upsert({
      where: { kind_name: { kind: i.kind, name: i.name } },
      update: {},
      create: { kind: i.kind, name: i.name },
    });
  }
  const itemId = async (kind: string, name: string): Promise<number> =>
    (
      await prisma.backgroundItem.findUniqueOrThrow({
        where: { kind_name: { kind: kind as BackgroundKind, name } },
      })
    ).id;
  const bics = load<BgItemConceptRow[]>('background_item_concepts.json');
  await prisma.backgroundItemConcept.deleteMany();
  await prisma.backgroundItemConcept.createMany({
    data: await Promise.all(
      bics.map(async (r) => ({
        itemId: await itemId(r.item_kind, r.item_name),
        conceptId: conceptIds.get(r.concept_slug) as number,
        strength: r.strength,
      })),
    ),
    skipDuplicates: true,
  });
  console.log(`[seed] background_items: ${items.length}, mappings: ${bics.length}`);

  // 6. Resources + concept links (dedupe by URL)
  const resources = load<ResourceRow[]>('resources.json');
  const resourceIds = new Map<string, number>();
  for (const r of resources) {
    const existing = await prisma.resource.findFirst({ where: { url: r.url } });
    const row =
      existing ??
      (await prisma.resource.create({
        data: {
          title: r.title, url: r.url, provider: r.provider, type: r.type,
          isFree: r.is_free, priceCents: r.price_cents, currency: r.currency,
          durationMin: r.duration_min, level: r.level, language: r.language, status: r.status,
        },
      }));
    resourceIds.set(r.url, row.id);
  }
  const crs = load<ConceptResourceRow[]>('concept_resources.json');
  await prisma.conceptResource.deleteMany();
  await prisma.conceptResource.createMany({
    data: crs.map((r) => ({
      conceptId: conceptIds.get(r.concept_slug) as number,
      resourceId: resourceIds.get(r.resource_url) as number,
      rank: r.rank,
    })),
    skipDuplicates: true,
  });
  console.log(`[seed] resources: ${resources.length}, concept_resources: ${crs.length}`);

  // 7. Tasters + links
  const tasters = load<TasterRow[]>('taster_projects.json');
  for (const t of tasters) {
    await prisma.tasterProject.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title, description: t.description, level: t.level, estHours: t.est_hours,
        deliverableType: t.deliverable_type, starterRepoUrl: t.starter_repo_url,
        rubric: t.rubric as object, status: t.status,
      },
      create: {
        fieldId: await fieldId(t.field_slug), slug: t.slug, title: t.title,
        description: t.description, level: t.level, estHours: t.est_hours,
        deliverableType: t.deliverable_type, starterRepoUrl: t.starter_repo_url,
        rubric: t.rubric as object, status: t.status,
      },
    });
  }
  const tasterId = async (slug: string): Promise<number> =>
    (await prisma.tasterProject.findUniqueOrThrow({ where: { slug } })).id;
  const tcs = load<TasterConceptRow[]>('taster_concepts.json');
  await prisma.tasterConcept.deleteMany();
  await prisma.tasterConcept.createMany({
    data: await Promise.all(
      tcs.map(async (r) => ({ tasterId: await tasterId(r.taster_slug), conceptId: conceptIds.get(r.concept_slug) as number })),
    ),
    skipDuplicates: true,
  });
  const trs = load<TasterResourceRow[]>('taster_resources.json');
  await prisma.tasterResource.deleteMany();
  await prisma.tasterResource.createMany({
    data: await Promise.all(
      trs.map(async (r) => ({
        tasterId: await tasterId(r.taster_slug),
        resourceId: resourceIds.get(r.resource_url) as number,
        rank: r.rank,
      })),
    ),
    skipDuplicates: true,
  });
  console.log(`[seed] tasters: ${tasters.length}, links: ${tcs.length + trs.length}`);

  // 8. Clubs + events
  const clubs = load<ClubRow[]>('clubs.json');
  for (const c of clubs) {
    await prisma.club.upsert({
      where: { name: c.name },
      update: { description: c.description, contactEmail: c.contact_email },
      create: { name: c.name, description: c.description, contactEmail: c.contact_email },
    });
  }
  const clubId = async (name: string): Promise<number> =>
    (await prisma.club.findUniqueOrThrow({ where: { name } })).id;
  const events = load<EventRow[]>('events.json');
  await prisma.userEvent.deleteMany();
  await prisma.event.deleteMany();
  for (const e of events) {
    await prisma.event.create({
      data: {
        title: e.title, type: e.type, city: e.city, country: e.country, location: e.location,
        description: e.description, startsAt: new Date(e.starts_at),
        endsAt: e.ends_at ? new Date(e.ends_at) : null, url: e.url,
        status: e.status, clubId: await clubId(e.club_name),
        fieldId: e.field_slug ? await fieldId(e.field_slug) : null,
      },
    });
  }
  console.log(`[seed] clubs: ${clubs.length}, events: ${events.length}`);

  // 9. Questions + options (both bank files, deduped by concept+stem)
  const questions = [...load<QuestionRow[]>('questions.json'), ...load<QuestionRow[]>('question2.json')];
  await prisma.question.deleteMany(); // cascades to question_options
  let qCount = 0;
  let oCount = 0;
  const seen = new Set<string>();
  for (const q of questions) {
    const key = `${q.concept_slug}|||${q.stem.trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const correct = q.options.filter((o) => o.is_correct === true).length;
    if (q.options.length !== 4 || correct !== 1) {
      throw new Error(`Rejecting question (need 4 options / 1 correct): [${q.concept_slug}] ${q.stem.slice(0, 60)}`);
    }
    await prisma.question.create({
      data: {
        conceptId: conceptIds.get(q.concept_slug) as number, stem: q.stem,
        difficulty: q.difficulty, explanation: q.explanation, source: q.source, status: q.status,
        options: { create: q.options.map((o) => ({ text: o.text, isCorrect: o.is_correct })) },
      },
    });
    qCount += 1;
    oCount += q.options.length;
  }
  console.log(`[seed] questions: ${qCount} (+${oCount} options)`);

  console.log('[seed] DONE — all approved content is live via live_* views.');
}

main()
  .catch((e: unknown) => {
    console.error('[seed] FAILED:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
