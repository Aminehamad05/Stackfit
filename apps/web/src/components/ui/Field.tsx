import type { InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, id, ...rest }: FieldProps): JSX.Element {
  const fieldId = id ?? rest.name;
  return (
    <div className="field">
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        {...rest}
        className={`input ${error ? 'input-error' : ''} ${rest.className ?? ''}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
      />
      {error ? (
        <span className="field-error" id={`${fieldId}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint" id={`${fieldId}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
