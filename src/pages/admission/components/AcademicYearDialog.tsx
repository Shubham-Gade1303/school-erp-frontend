import { useState, type FormEvent, type ReactNode } from "react";
import type { AcademicYear, AcademicYearRequest } from "../../../types/admission";

export function AcademicYearDialog({
  academicYear,
  saving,
  onCancel,
  onSubmit,
}: {
  academicYear: AcademicYear | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (request: AcademicYearRequest) => void;
}) {
  const [values, setValues] = useState<AcademicYearRequest>({
    academicYear: academicYear?.academicYear ?? "",
    startDate: academicYear?.startDate ?? "",
    endDate: academicYear?.endDate ?? "",
    active: academicYear?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!/^\d{4}-\d{4}$/.test(values.academicYear)) {
      nextErrors.academicYear = "Use the format YYYY-YYYY.";
    }
    if (!values.startDate) nextErrors.startDate = "Start date is required.";
    if (!values.endDate) nextErrors.endDate = "End date is required.";
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      nextErrors.endDate = "End date cannot be earlier than the start date.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(values);
  }

  return (
    <div className="academic-dialog-backdrop">
      <section aria-labelledby="academic-year-dialog-title" aria-modal="true" className="academic-dialog-card" role="dialog">
        <div className="academic-dialog-heading">
          <div>
            <p>Academic setup</p>
            <h2 id="academic-year-dialog-title">{academicYear ? "Edit Academic Year" : "Add Academic Year"}</h2>
          </div>
          <button aria-label="Close academic year form" onClick={onCancel} type="button">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="academic-year-form-grid">
            <DialogField error={errors.academicYear} label="Academic Year">
              <input maxLength={9} placeholder="2027-2028" value={values.academicYear} onChange={(event) => setValues((current) => ({ ...current, academicYear: event.target.value }))} />
            </DialogField>
            <DialogField error={errors.startDate} label="Start Date">
              <input type="date" value={values.startDate} onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))} />
            </DialogField>
            <DialogField error={errors.endDate} label="End Date">
              <input type="date" value={values.endDate} onChange={(event) => setValues((current) => ({ ...current, endDate: event.target.value }))} />
            </DialogField>
          </div>
          <label className="academic-year-active">
            <input checked={values.active} onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />
            <span>Active</span>
          </label>
          <div className="academic-dialog-actions">
            <button className="academic-secondary-button" onClick={onCancel} type="button">Cancel</button>
            <button className="academic-primary-button" disabled={saving} type="submit">
              {saving ? "Saving..." : academicYear ? "Save Academic Year" : "Create Academic Year"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DialogField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="academic-year-field">
      <span>{label} *</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
