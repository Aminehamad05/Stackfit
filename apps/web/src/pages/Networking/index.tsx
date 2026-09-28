import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import type { ClubEventItem } from '../../lib/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

const RAW_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const API_ORIGIN: string = (RAW_BASE.trim() !== '' ? RAW_BASE : '/api').replace(/\/+$/, '');

interface FieldOpt {
  id: number;
  slug: string;
  name: string;
}

export default function Networking(): JSX.Element {
  const { account } = useAuth();
  const [fields, setFields] = useState<FieldOpt[]>([]);
  const [field, setField] = useState('');
  const [city, setCity] = useState('');
  const [from, setFrom] = useState('');
  const [events, setEvents] = useState<ClubEventItem[]>([]);
  const [mine, setMine] = useState<ClubEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [f, e] = await Promise.all([
        api<{ fields: FieldOpt[] }>('/fields'),
        api<{ events: ClubEventItem[] }>('/events'),
      ]);
      setFields(f.fields);
      setEvents(e.events);
      if (account === 'person') {
        setMine((await api<{ events: ClubEventItem[] }>('/users/me/events')).events);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function search(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (field) q.set('field', field);
      if (city.trim()) q.set('city', city.trim());
      if (from) q.set('from', new Date(from).toISOString());
      setEvents((await api<{ events: ClubEventItem[] }>(`/events?${q.toString()}`)).events);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function subscribe(id: number): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api(`/events/${id}/subscribe`, { method: 'POST', body: {} });
      setMine((await api<{ events: ClubEventItem[] }>('/users/me/events')).events);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe(id: number): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api(`/events/${id}/subscribe`, { method: 'DELETE' });
      setMine((await api<{ events: ClubEventItem[] }>('/users/me/events')).events);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function gcal(id: number): Promise<void> {
    try {
      const r = await api<{ url: string }>(`/events/${id}/gcal-link`);
      window.open(r.url, '_blank', 'noopener');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const subscribed = new Set(mine.map((e) => e.id));

  async function reset(): Promise<void> {
    setField('');
    setCity('');
    setFrom('');
    setBusy(true);
    setError(null);
    try {
      setEvents((await api<{ events: ClubEventItem[] }>('/events')).events);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Networking</h1>
        <p>Approved hackathons, meetups and conferences from uni clubs. One tap to join.</p>
      </div>
      <Card>
        <div className="filter-bar">
          <div className="field">
            <label className="field-label" htmlFor="nf-field">Field</label>
            <select
              id="nf-field"
              className="select"
              value={field}
              onChange={(e) => setField(e.target.value)}
            >
              <option value="">All fields</option>
              {fields.map((f) => <option key={f.id} value={f.slug}>{f.name}</option>)}
            </select>
          </div>
          <Field label="City" name="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tunis" />
          <Field label="From date" name="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <div className="filter-actions">
            <Button variant="primary" onClick={() => void search()} disabled={busy}>Filter</Button>
            <Button variant="secondary" onClick={() => void reset()} disabled={busy}>Reset</Button>
          </div>
        </div>
      </Card>
      {loading ? <LoadingSkeleton lines={4} /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} onRetry={() => void load()} /> : null}
      {events.map((e) => (
        <Card key={e.id}>
          <div className="event-head">
            <h2>{e.title}</h2>
            <Badge tone="blue">{e.type}</Badge>
            {account === 'person' && subscribed.has(e.id) ? <Badge tone="teal">✓ Subscribed</Badge> : null}
          </div>
          <p className="event-meta">
            by <strong>{e.club?.name ?? 'a club'}</strong>
            <span aria-hidden="true"> · </span>{[e.city, e.country].filter(Boolean).join(', ')}
            <span aria-hidden="true"> · </span>{new Date(e.startsAt).toLocaleString()}
          </p>
          {e.description ? <p className="event-desc">{e.description}</p> : null}
          <div className="event-actions">
            {account === 'person' ? (
              subscribed.has(e.id) ? (
                <Button variant="secondary" onClick={() => void unsubscribe(e.id)} disabled={busy}>Unsubscribe</Button>
              ) : (
                <Button variant="primary" onClick={() => void subscribe(e.id)} disabled={busy}>Subscribe</Button>
              )
            ) : (
              <Link className="btn btn-secondary" to="/login">Sign in to subscribe</Link>
            )}
            <a className="btn btn-ghost" href={`${API_ORIGIN}/events/${e.id}/ics`}>↓ .ics</a>
            <Button variant="ghost" onClick={() => void gcal(e.id)}>Add to Google Calendar</Button>
          </div>
        </Card>
      ))}
      {events.length === 0 && !loading ? (
        <EmptyState title="No events match" body="Try clearing the filters." actionLabel="Clear" actionTo="/networking" />
      ) : null}
    </div>
  );
}
