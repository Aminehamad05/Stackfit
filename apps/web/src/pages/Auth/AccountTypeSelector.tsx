import type { AccountType } from '../../lib/api';

export function AccountTypeSelector({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (v: AccountType) => void;
}): JSX.Element {
  return (
    <div role="group" aria-label="Account type">
      <div className="account-type-grid">
        <button
          type="button"
          className="account-type"
          aria-pressed={value === 'person'}
          onClick={() => onChange('person')}
        >
          <strong>👤 Person</strong>
          <span>Student or career switcher. Assess skills, follow a roadmap.</span>
        </button>
        <button
          type="button"
          className="account-type"
          aria-pressed={value === 'organisation'}
          onClick={() => onChange('organisation')}
        >
          <strong>🏛️ Organisation</strong>
          <span>University club. Publish events and reach students.</span>
        </button>
      </div>
    </div>
  );
}
