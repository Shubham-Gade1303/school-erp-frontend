import { FileText } from "lucide-react";
import type { StudentFee } from "../../../types/admission";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { RecordEditor } from "../components/RecordEditor";
import { StepIntro } from "../components/StepIntro";
import { formatAmount, formatDate } from "../utils/format";

const feeStatuses = ["PENDING", "PAID", "PARTIAL"] as const;

export function FeesStep({
  studentId,
  academicYearId,
  fees,
  draft,
  selectedFeeId,
  saving,
  onDraft,
  onSave,
  onEdit,
  onSelectFee,
}: {
  studentId: number;
  academicYearId: number;
  fees: StudentFee[];
  draft: StudentFee | null;
  selectedFeeId: string;
  saving: boolean;
  onDraft: (draft: StudentFee | null) => void;
  onSave: () => void;
  onEdit: (fee: StudentFee) => void;
  onSelectFee: (id: number) => void;
}) {
  const totalFees = fees.reduce((total, fee) => total + Number(fee.amount || 0), 0);

  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Student fees"
      copy="Add and manage fees for the selected student and academic year."
    >
      {fees.length ? (
        <div className="admission-table-wrap">
          <table>
            <thead>
              <tr><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Payment Fee</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {fees.map((fee, index) => (
                <tr className={String(fee.id) === selectedFeeId ? "selected-row" : ""} key={fee.id ?? `${fee.feeType}-${index}`}>
                  <td>{fee.feeType}</td>
                  <td>{formatAmount(fee.amount)}</td>
                  <td>{formatDate(fee.dueDate)}</td>
                  <td><span className={`status-badge ${fee.status.toLowerCase()}`}>{fee.status}</span></td>
                  <td>
                    <button className="text-button" disabled={saving || !fee.id} onClick={() => fee.id && onSelectFee(fee.id)} type="button">
                      {String(fee.id) === selectedFeeId ? "Selected" : "Select"}
                    </button>
                  </td>
                  <td><button className="text-button" disabled={saving} onClick={() => onEdit(fee)} type="button">Edit</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><th colSpan={1}>Total fees</th><th>{formatAmount(totalFees)}</th><td colSpan={4} /></tr></tfoot>
          </table>
        </div>
      ) : (
        <EmptyState text="No fees exist for this student and academic year. Add the first fee below." />
      )}
      {draft ? (
        <RecordEditor title={draft.id ? "Edit fee" : "Add fee"}>
          <div className="admission-form-grid">
            <Field label="Fee Type" required>
              <input value={draft.feeType} onChange={(event) => onDraft({ ...draft, feeType: event.target.value })} />
            </Field>
            <Field label="Amount" required>
              <input min="0.01" step="0.01" type="number" value={draft.amount || ""} onChange={(event) => onDraft({ ...draft, amount: Number(event.target.value) })} />
            </Field>
            <Field label="Due Date" required>
              <input type="date" value={draft.dueDate} onChange={(event) => onDraft({ ...draft, dueDate: event.target.value })} />
            </Field>
            <Field label="Status" required>
              <select value={draft.status} onChange={(event) => onDraft({ ...draft, status: event.target.value })}>
                {feeStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </Field>
            <Field label="Remarks">
              <input value={draft.remarks ?? ""} onChange={(event) => onDraft({ ...draft, remarks: event.target.value })} />
            </Field>
          </div>
          <div className="editor-actions">
            <button className="secondary-button" disabled={saving} onClick={onSave} type="button">{saving ? "Saving..." : "Save fee"}</button>
            <button className="text-button" disabled={saving} onClick={() => onDraft(null)} type="button">Cancel</button>
          </div>
        </RecordEditor>
      ) : (
        <button className="secondary-button" disabled={saving || !studentId || !academicYearId} onClick={() => onDraft({
          studentId,
          academicYearId,
          feeType: "",
          amount: 0,
          dueDate: "",
          status: "PENDING",
          remarks: "",
        })} type="button">Add fee</button>
      )}
    </StepIntro>
  );
}
