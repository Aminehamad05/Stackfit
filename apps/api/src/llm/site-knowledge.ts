// Site knowledge grounding (RAG-lite, no vector DB).
//
// Why this instead of fine-tuning: the site changes every seed, per-user rows
// can never live in weights, and training on user data would be a privacy
// liability. Retrieval keeps answers fresh, scoped, and auditable.
//
// SECURITY CONTRACT (load-bearing — keep all four):
// 1. Static text below is public product knowledge only. No credentials,
//    no personal data, no unapproved content.
// 2. Concept rows come ONLY from approved content (status='approved').
// 3. Personal rows come ONLY from the caller's own userId (JWT, never the
//    message text) — see buildContext in modules/chat/routes.ts.
// 4. The model is instructed to refuse everything outside these sources
//    rather than invent (scores, other users, grades, unlocks).

interface KnowledgeSection {
  id: string;
  keywords: string[];
  text: string;
}

const SECTIONS: KnowledgeSection[] = [
  {
    id: 'journey',
    keywords: ['how', 'work', 'start', 'journey', 'steps', 'path', 'begin', 'process', 'flow'],
    text: 'The Stackfit journey: 1) Onboarding — tick courses/skills and rate confidence+interest 1-5. 2) Field matches — deterministic top-3 with compatibility %. 3) Tasters — 1-3h hands-on projects per field. 4) Choose a field (final). 5) Roadmap — ordered concept steps with resources. 6) Quiz gates unlock each step. 7) Events, leaderboard, certifications along the way.',
  },
  {
    id: 'matching',
    keywords: ['match', 'matching', 'score', 'compatibility', 'field', 'recommend', 'suggest', 'top', 'rank', 'skill', 'interest'],
    text: 'Field matching is deterministic code, not AI judgment: rankFields = 0.6*skillMatch + 0.4*interestMatch from your background. Best field shows 100% compatibility; others are relative to it. Fit after tasters = 0.2*skill + 0.5*enjoyment + 0.3*performance; untried fields show fit null and are never ranked against tried ones.',
  },
  {
    id: 'roadmap',
    keywords: ['roadmap', 'unlock', 'lock', 'step', 'order', 'prerequisite', 'generat', 'path'],
    text: 'Roadmaps are built by known-overlay + topological sort: your known concepts are skipped, prerequisites always come first. Step 1 starts in_progress, the rest locked. Choosing a field only reserves an empty roadmap shell — generate the steps from the Roadmap page. Roadmaps are private: another account\'s id reads as not found.',
  },
  {
    id: 'quiz',
    keywords: ['quiz', 'test', 'question', 'exam', 'pass', 'grade', 'attempt', 'answer', 'qcm'],
    text: 'Quizzes pull from the approved bank only and options never reveal the answer. Pass mark is 70%. Passing flips the step to quiz_passed, opens the next step, marks the concept known, awards 10 leaderboard points, and re-checks certifications. Wrong answers are never shown — study the concept and retry.',
  },
  {
    id: 'taster',
    keywords: ['taster', 'tasting', 'project', 'try', 'hands-on', 'submit', 'review'],
    text: 'Tasters are short (1-3h) real builds per field with a rubric. The Taster page shows the 5 simplest concepts with starter resources, readiness-ranked starter projects, and guided tastings. Start then submit: submitting saves your reflection and enjoyment and awards 25 leaderboard points. A submitted taster counts as done while AI auto-review is off, so performance stays null until it returns.',
  },
  {
    id: 'gamification',
    keywords: ['point', 'leaderboard', 'rank', 'score', 'badge', 'certification', 'certificat', 'award'],
    text: 'Points: +10 per passed quiz, +25 per submitted taster (plus interview/project points as those land). The leaderboard ranks everyone by total. Certifications auto-award when your quiz mastery crosses their criteria — check the Certs page for earned vs what is missing.',
  },
  {
    id: 'events',
    keywords: ['event', 'club', 'hackathon', 'meetup', 'networking', 'calendar', 'join', 'subscribe'],
    text: 'Networking lists approved club events (hackathons, meetups, conferences) filterable by field/city/date. Subscribe in one tap, download .ics or push to Google Calendar. Clubs post via the Org portal (draft until published). Seeded demo events are synthetic until organizers claim them.',
  },
  {
    id: 'account',
    keywords: ['account', 'profile', 'password', 'photo', 'avatar', 'name', 'delete', 'setting', 'sign', 'login', 'register'],
    text: 'Account: display name + photo live on the Profile page (click your name chip). Settings holds theme, password change, and account deletion (type your email to confirm — wipes everything, permanent). Students and clubs are separate worlds: club tokens get 403 on student routes and vice versa.',
  },
  {
    id: 'ai',
    keywords: ['ai', 'interview', 'chatbot', 'bot', 'llm', 'model', 'intelligent'],
    text: 'AI features: this chat (live, grounded in your progress + site knowledge) and taster auto-review + interviews (disabled for now — those pages say so). The AI never decides matches, roadmaps, or grades; it explains, interviews, and reviews only.',
  },
  {
    id: 'pages',
    keywords: ['where', 'page', 'find', 'learn', 'course', 'study', 'go', 'navigate', 'section', 'link'],
    text: 'Site map for learning: Onboarding (background picker) → My Fields (top-3 + compare + final choice) → Taster page (hands-on trial per field) → Roadmap page (ordered concept steps with resources; quiz gates inside each step unlock the next) → Certs (earned/missing) → Networking (club events). Profile (photo + name), Settings (theme, password, deletion), Leaderboard (ranks), Data & Trust (policy).',
  },
  {
    id: 'trust',
    keywords: ['data', 'privacy', 'private', 'secur', 'share', 'personal', 'consent', 'trust'],
    text: 'Data & Trust: learning content is stored as link metadata, never hosted copyrighted text. Your data is yours alone plus shared curated content; the team never sells or shares it. Account deletion on request removes everything. Full policy lives on the Data & Trust page.',
  },
];

function tokensOf(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/** Keyword-overlap retrieval over the curated sections, capped by budget. */
export function retrieveSiteKnowledge(query: string, maxChars = 1800): string {
  const tokens = new Set(tokensOf(query));
  if (tokens.size === 0) return '';
  const scored = SECTIONS.map((s) => {
    let hits = 0;
    for (const k of s.keywords) {
      if (tokens.has(k)) hits += 2;
      else {
        for (const t of tokens) {
          if (t.startsWith(k) || k.startsWith(t)) {
            hits += 1;
            break;
          }
        }
      }
    }
    return { s, hits };
  })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  let out = '';
  for (const r of scored) {
    const chunk = `[${r.s.id}] ${r.s.text}\n`;
    if (out.length + chunk.length > maxChars) break;
    out += chunk;
  }
  return out.trim();
}
