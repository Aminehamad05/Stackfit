import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/auth-context';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingSkeleton } from '../../components/ui/States';

interface FieldOpt {
  id: number;
  slug: string;
  name: string;
  description: string;
}

// Explore: browse fields by name, jump straight into a field's full roadmap.
// No assessment detour — unsure users can still take it from the link below.
export default function Careers(): JSX.Element {
  const { account } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<FieldOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ fields: FieldOpt[] }>('/fields')
      .then((r) => setFields(r.fields))
      .catch((e: unknown) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function explore(fieldId: number): Promise<void> {
    if (account === null) {
      navigate('/login');
      return;
    }
    setBusyId(fieldId);
    setError(null);
    try {
      const list = await api<{ roadmaps: Array<{ id: number; field: { slug: string } }> }>('/roadmaps');
      const existing = list.roadmaps.find((m) => m.field.slug === fields.find((f) => f.id === fieldId)?.slug);
      const rid =
        existing?.id ??
        (await api<{ roadmap: { id: number } }>('/roadmaps', { method: 'POST', body: { fieldId } })).roadmap.id;
      navigate(`/roadmap?id=${rid}`);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Explore paths</h1>
        <p>Pick a field to open its full roadmap directly — no assessment required.</p>
      </div>
      {loading ? <LoadingSkeleton lines={4} /> : null}
      {error ? <ErrorState title="Something went wrong" body={error} /> : null}
      {fields.map((f) => (
        <Card key={f.id}>
          <h2>{f.name}</h2>
          <p>{f.description}</p>
          <Button variant="primary" onClick={() => void explore(f.id)} disabled={busyId !== null}>
            {busyId === f.id ? 'Opening…' : 'Explore path →'}
          </Button>
        </Card>
      ))}
      <p style={{ marginTop: 16 }}>
        Not sure which fits you? <Button variant="secondary" to="/assessment">Take the assessment →</Button>
      </p>
    </div>
  );
}
