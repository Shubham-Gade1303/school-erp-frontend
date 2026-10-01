import { X } from "lucide-react";
import type { TeacherResponse } from "../../types/teacher";

export function DeleteTeacherDialog({ teacher, isDeleting, onCancel, onConfirm }: { teacher: TeacherResponse; isDeleting: boolean; onCancel: () => void; onConfirm: () => Promise<void> }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-labelledby="delete-teacher-title" className="dialog-card compact-dialog" role="dialog">
        <div className="dialog-heading">
          <div><p className="eyebrow">Delete teacher</p><h2 id="delete-teacher-title">Are you sure?</h2></div>
          <button aria-label="Close confirmation" onClick={onCancel} type="button"><X size={18} /></button>
        </div>
        <p className="dialog-copy">Are you sure you want to delete {teacher.fullName}?</p>
        <div className="form-actions">
          <button className="secondary-button" onClick={onCancel} type="button">Cancel</button>
          <button className="delete-button" disabled={isDeleting} onClick={() => void onConfirm()} type="button">{isDeleting ? "Deleting..." : "Delete"}</button>
        </div>
      </section>
    </div>
  );
}
