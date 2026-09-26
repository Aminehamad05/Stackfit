import { useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/auth-context';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { ClubEventItem } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState, LoadingSkeleton } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

// Organisation dashboard (Step 3): event posting/management ONLY.
// No roadmap, quiz, interview, leaderboard, or tasters — by design.
const EMPTY = { title: '', type: 'meetup', country: 'Tunisia', city: '', location: '', startsAt: '', endsAt: '', url: '' };

export default function Org(): JSX.Element {
  const { clubName } = useAuth();
  const [events, setEvents] = useState<ClubEventItem[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      setEvents((await api<{ events: ClubEventItem[] }>('/clubs/me/events', { account: 'organisation' })).events);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function wrap(fn: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function payload() {
    return {
      title: form.title,
      type: form.type,
      country: form.country,
      ...(form.city ? { city: form.city } : {}),
      ...(form.location ? { location: form.location } : {}),
      ...(form.startsAt ? { startsAt: new Date(form.startsAt).toISOString() } : {}),
      ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
      ...(form.url ? { url: form.url } : {}),
    };
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>{clubName ?? 'Club dashboard'}</h1>
        <p>Post hackathons, meetups and conferences. Publish when ready — only approved events are public.</p>
      </div>
      {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}
      {notice ? <p><Badge tone="teal">{notice}</Badge></p> : null}
      <Card>
        <h2>{editId ? `Edit #${editId}` : 'New event'}</h2>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Field label="Title" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label>Category
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['hackathon', 'networking', 'meetup', 'conference'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Field label="Country" name="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <Field label="Emplacement (city / venue)" name="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Field label="Starts at" name="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Field label="Ends at" name="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Button variant="primary" onClick={() => void wrap(async () => {
            if (editId) {
              await api(`/clubs/me/events/${editId}`, { method: 'PATCH', body: payload(), account: 'organisation' });
              setNotice(`Event #${editId} updated.`);
            } else {
              const r = await api<{ event: ClubEventItem }>('/clubs/me/events', { method: 'POST', body: payload(), account: 'organisation' });
              setNotice(`Created #${r.event.id} as draft — publish when ready.`);
            }
            setEditId(null); setForm(EMPTY); await load();
          })} disabled={busy}>{editId ? 'Save' : 'Create (draft)'}</Button>
          {editId ? <Button variant="secondary" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</Button> : null}
        </div>
      </Card>
      <h2>My events ({events.length})</h2>
      {loading ? <LoadingSkeleton /> : null}
      {events.map((e) => (
        <Card key={e.id}>
          <strong>#{e.id} {e.title}</strong> <Badge tone={e.status === 'approved' ? 'teal' : 'gray'}>{e.status}</Badge>
          <div style={{ fontSize: '0.875rem' }}>{new Date(e.startsAt).toLocaleString()}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => {
              setEditId(e.id);
              setForm({ title: e.title, type: e.type, country: e.country, city: e.city ?? '', location: e.location ?? '', startsAt: e.startsAt.slice(0, 16), endsAt: e.endsAt ? e.endsAt.slice(0, 16) : '', url: e.url ?? '' });
            }}>Edit</Button>
            <Button variant="secondary" onClick={() => void wrap(async () => {
              await api(`/clubs/me/events/${e.id}`, { method: 'PATCH', body: { status: e.status === 'draft' ? 'approved' : 'draft' }, account: 'organisation' });
              await load();
            })} disabled={busy}>{e.status === 'draft' ? 'Publish' : 'Unpublish'}</Button>
            <Button variant="ghost" onClick={() => void wrap(async () => {
              if (!confirm(`Delete "${e.title}"?`)) return;
              await api(`/clubs/me/events/${e.id}`, { method: 'DELETE', account: 'organisation' });
              await load();
            })} disabled={busy}>Delete</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
