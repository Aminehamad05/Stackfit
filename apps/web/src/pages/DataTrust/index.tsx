import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

function Points({ items }: { items: Array<{ title: string; body: string }> }): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((i) => (
        <div key={i.title}>
          <strong>{i.title}</strong>
          <p style={{ fontSize: '0.875rem', margin: '4px 0 0' }}>{i.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function DataTrust(): JSX.Element {
  return (
    <div className="container">
      <div className="page-head">
        <h1>Data &amp; Trust</h1>
        <p>What data Stackfit uses, how much of it, who can see it, and on what permission. Curated metadata, first-party submissions, and your own progress — we link to sources, never host their content.</p>
      </div>
      <Card>
        <h2>Data Source <Badge tone="blue">4 sources + APIs</Badge></h2>
        <Points items={[
          { title: 'Curated learning content', body: 'Concepts, resources, quiz questions — manually researched from public educational platforms (YouTube, freeCodeCamp, CS50, Coursera/edX, official docs, Kaggle Learn). Metadata only: title, URL, provider, price, level — never the platforms\u2019 copyrighted content.' },
          { title: 'University taxonomy', body: 'Course/skill labels derived from public curricula of Tunisian engineering schools — generic labels (e.g. \u201cLinear Algebra\u201d, \u201cComputer Networks\u201d), never tied to any student or institution record.' },
          { title: 'Clubs & events', body: '(a) submitted by organizers via the in-app Org portal (first-party); (b) a seeded demo dataset from publicly available club names/descriptions, flagged in-DB as synthetic demo data — not live listings.' },
          { title: 'User-generated', body: 'Account details, onboarding answers, taster submissions, quiz results, interview transcripts — provided directly by you, with consent at signup.' },
          { title: 'Third-party APIs', body: 'GitHub API (public repo/commit data, user-authorized OAuth, read-only) and NVIDIA Build / Brev inference (scores your text — reflections, answers; never trains external models on it).' },
        ]} />
      </Card>
      <Card>
        <h2>Volume <Badge tone="teal">seeded now</Badge></h2>
        <Points items={[
          { title: 'Users', body: 'Tens to low hundreds of accounts — growth is per-user only (quiz attempts, submissions, transcripts). No bulk personal-data ingestion.' },
          { title: 'Live seed in this build', body: '4 fields \u00b7 56 concepts (81 prereq edges) \u00b7 280 QCMs + 1120 options (5/concept) \u00b7 36 resources \u00b7 8 clubs \u00b7 16 events — all approved, served via live_* views. Taster projects/resources/concepts seed expanded with the taster service.' },
          { title: 'Demo clubs/events', body: '8 clubs with ~2 sample events each — explicitly synthetic until organizers claim and publish via the portal.' },
        ]} />
      </Card>
      <Card>
        <h2>Access <Badge tone="purple">least privilege</Badge></h2>
        <Points items={[
          { title: 'You', body: 'Only your own account data, progress, and submissions — plus shared curated content, public leaderboard, and event listings. Org tokens get 403 on student routes and vice versa.' },
          { title: 'Dev team', body: 'Admin DB access for building, debugging, and the content-review pipeline (draft \u2192 ai_reviewed \u2192 approved) during the hackathon.' },
          { title: 'AI components', body: 'Process your submitted text via API to generate scores/feedback; results persist only in our own database (ai_review, interviews).' },
          { title: 'Never', body: 'No sale, no advertisers, no exposure outside the project team during the hackathon.' },
        ]} />
      </Card>
      <Card>
        <h2>Permission Details <Badge tone="teal">consent-first</Badge></h2>
        <Points items={[
          { title: 'Signup consent + deletion', body: 'Account data collected with explicit consent at registration; request deletion of your account and associated data anytime.' },
          { title: 'Reference, don\u2019t reproduce', body: 'Educational content stored as title/link/price metadata per providers\u2019 terms — we link out, never host their material.' },
          { title: 'Organizer-submitted', body: 'Portal submissions are voluntary; seeded demo events are synthetic and never attributed as confirmed club listings.' },
          { title: 'GitHub OAuth', body: 'Standard OAuth, read-only scope, explicit authorization per user.' },
          { title: 'No sensitive data', body: 'No health, financial, or government-ID collection — ever.' },
        ]} />
      </Card>
    </div>
  );
}
