import type { AcademicYear } from "../../../types/admission";

export function DeleteAcademicYearDialog({
  academicYear,
  deleting,
  onCancel,
  onConfirm,
}: {
  academicYear: AcademicYear;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="academic-dialog-backdrop">
      <section aria-labelledby="delete-academic-year-title" aria-modal="true" className="academic-dialog-card compact-dialog" role="dialog">
        <div className="academic-dialog-heading">
          <div>
            <p>Academic setup</p>
            <h2 id="delete-academic-year-title">Delete Academic Year?</h2>
          </div>
          <button aria-label="Close delete confirmation" onClick={onCancel} type="button">×</button>
        </div>
        <p className="academic-dialog-copy">Delete academic year {academicYear.academicYear}? This action cannot be undone.</p>
        <div className="academic-dialog-actions">
          <button className="academic-secondary-button" onClick={onCancel} type="button">Cancel</button>
          <button className="academic-delete-button" disabled={deleting} onClick={onConfirm} type="button">{deleting ? "Deleting..." : "Delete"}</button>
        </div>
      </section>
    </div>
  );
}
