import { useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/errors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/States';
import { Field } from '../../components/ui/Field';

export default function Interview(): JSX.Element {
  const [conceptId, setConceptId] = useState('45');
  const [error, setError] = useState<string | null>(null);

  async function start(): Promise<void> {
    setError(null);
    try {
      await api('/interviews', { method: 'POST', body: { conceptId: +conceptId } });
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>AI interview</h1>
        <p>Technical understanding + explaining to a non-technical stakeholder. Disabled until the AI layer is re-enabled.</p>
      </div>
      <Card>
        <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
          <Field label="Concept id" name="conceptId" value={conceptId} onChange={(e) => setConceptId(e.target.value)} />
          <Button variant="primary" onClick={() => void start()}>Start interview</Button>
        </div>
        {error ? <ErrorState title="Interview unavailable" body={error} /> : null}
      </Card>
    </div>
  );
}
