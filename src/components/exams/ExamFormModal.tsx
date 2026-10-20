import { useState, type FormEvent } from "react";
import { CalendarPlus, X } from "lucide-react";
import type {
  ExamClassOption,
  ExamRecord,
  ExamRequest,
} from "../../types/exam";

interface ExamFormModalProps {
  exam: ExamRecord | null;
  classes: ExamClassOption[];
  selectedAcademicYearId?: number;
  isSaving: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  onCancel: () => void;
  onSubmit: (request: ExamRequest) => Promise<void>;
}

export function ExamFormModal({
  exam,
  classes,
  selectedAcademicYearId,
  isSaving,
  error,
  fieldErrors,
  onCancel,
  onSubmit,
}: ExamFormModalProps) {
  const [examName, setExamName] = useState(() => exam?.examName ?? "");
  const [classKey, setClassKey] = useState(() =>
    exam?.academicYearId && exam.standardId
      ? `${exam.academicYearId}:${exam.standardId}`
      : "",
  );
  const [startDate, setStartDate] = useState(
    () => exam?.startDate?.slice(0, 10) ?? "",
  );
  const [endDate, setEndDate] = useState(
    () => exam?.endDate?.slice(0, 10) ?? "",
  );
  const dateError =
    startDate && endDate && endDate < startDate
      ? "End date must be on or after the start date."
      : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!examName.trim() || !classKey || !startDate || !endDate) {
      return;
    }
    if (dateError) return;
    const [yearValue, standardValue] = classKey.split(":");
    const academicYearId = Number(yearValue);
    const standardId = Number(standardValue);
    const selectedClass = classes.find(
      (option) =>
        option.academicYearId === academicYearId &&
        option.standardId === standardId,
    );
    if (!selectedClass) return;
    await onSubmit({
      examName: examName.trim(),
      academicYearId: selectedClass.academicYearId,
      standardId: selectedClass.standardId,
      startDate,
      endDate,
      active: exam?.active ?? true,
    });
  }

  return (
    <div className="exam-dialog-backdrop" onMouseDown={onCancel} role="presentation">
      <section
        aria-labelledby="exam-form-title"
        aria-modal="true"
        className="exam-dialog-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="exam-dialog-heading">
          <div className="exam-dialog-icon"><CalendarPlus size={20} /></div>
          <div>
            <p>{exam ? "Update schedule" : "New schedule"}</p>
            <h2 id="exam-form-title">{exam ? "Edit exam" : "Post exam date"}</h2>
          </div>
          <button
            aria-label="Close exam form"
            className="exam-dialog-close"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <form className="exam-form" onSubmit={(event) => void submit(event)}>
          {error && <p className="exam-error-message" role="alert">{error}</p>}
          <div className="exam-form-grid">
            <ExamField error={fieldErrors.examName} label="Exam Name">
              <input
                autoFocus
                maxLength={100}
                onChange={(event) => setExamName(event.target.value)}
                required
                value={examName}
              />
            </ExamField>
            <ExamField
              error={fieldErrors.academicYearId ?? fieldErrors.standardId}
              label="Academic Year / Class"
            >
              <select
                disabled={classes.length === 0}
                onChange={(event) => setClassKey(event.target.value)}
                required
                value={classKey}
              >
                <option value="">Select academic year and class</option>
                {classes.map((item) => (
                  <option
                    key={`${item.academicYearId}:${item.standardId}`}
                    value={`${item.academicYearId}:${item.standardId}`}
                  >
                    {item.academicYearId === selectedAcademicYearId
                      ? item.label
                      : `${item.label} · ${item.academicYear}`}
                  </option>
                ))}
              </select>
            </ExamField>
            <div className="exam-form-date-row">
              <ExamField error={fieldErrors.startDate} label="Start Date">
                <input
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                  type="date"
                  value={startDate}
                />
              </ExamField>
              <ExamField error={fieldErrors.endDate ?? dateError} label="End Date">
                <input
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                  type="date"
                  value={endDate}
                />
              </ExamField>
            </div>
          </div>
          <div className="exam-dialog-actions">
            <button
              className="exam-secondary-button"
              disabled={isSaving}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button className="exam-primary-button" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : exam ? "Save changes" : "Post exam date"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ExamField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="exam-field">
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
