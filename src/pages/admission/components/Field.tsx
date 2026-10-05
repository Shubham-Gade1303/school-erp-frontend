import type { ReactNode } from "react";

export function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="admission-field">
      <label>
        <span>
          {label}
          {required ? " *" : ""}
        </span>
        {children}
      </label>
      {error && <small className="field-error" role="alert">{error}</small>}
    </div>
  );
}
