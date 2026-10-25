import { useState, type FormEvent } from "react";
import { CalendarPlus, X } from "lucide-react";
import type { AcademicYear, Standard } from "../../types/admission";
import type { ExamRecord, ExamRequest } from "../../types/exam";

interface ExamFormModalProps {
  exam: ExamRecord | null;
  academicYears: AcademicYear[];
  standards: Standard[];
  selectedAcademicYearId?: number;
  selectedStandardId?: number;
  isSaving: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  onCancel: () => void;
  onSubmit: (request: ExamRequest) => Promise<void>;
}

export function ExamFormModal({
  exam,
  academicYears,
  standards,
  selectedAcademicYearId,
  selectedStandardId,
  isSaving,
  error,
  fieldErrors,
  onCancel,
  onSubmit,
}: ExamFormModalProps) {
  const [examName, setExamName] = useState(() => exam?.examName ?? "");
  const [academicYearId, setAcademicYearId] = useState(() =>
    String(exam?.academicYearId ?? selectedAcademicYearId ?? ""),
  );
  const [standardId, setStandardId] = useState(() =>
    String(exam?.standardId ?? selectedStandardId ?? ""),
  );
  const [startDate, setStartDate] = useState(
    () => exam?.startDate?.slice(0, 10) ?? "",
  );
  const [endDate, setEndDate] = useState(
    () => exam?.endDate?.slice(0, 10) ?? "",
  );
  const [active, setActive] = useState(() => exam?.active ?? true);
  const dateError =
    startDate && endDate && endDate < startDate
      ? "End date must be on or after the start date."
      : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      isSaving ||
      !examName.trim() ||
      examName.trim().length > 100 ||
      !academicYearId ||
      !standardId ||
      !startDate ||
      !endDate
    ) {
      return;
    }
    if (dateError) return;
    const selectedYear = academicYears.find(
      (year) => year.id === Number(academicYearId),
    );
    const selectedStandard = standards.find(
      (standard) => standard.id === Number(standardId),
    );
    if (!selectedYear || !selectedStandard) return;
    await onSubmit({
      examName: examName.trim(),
      academicYearId: selectedYear.id,
      standardId: selectedStandard.id,
      startDate,
      endDate,
      active,
    });
  }

  return (
    <div
      className="exam-dialog-backdrop"
      onMouseDown={() => !isSaving && onCancel()}
      role="presentation"
    >
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
            <ExamField error={fieldErrors.academicYearId} label="Academic Year">
              <select
                disabled={academicYears.length === 0}
                onChange={(event) => setAcademicYearId(event.target.value)}
                required
                value={academicYearId}
              >
                <option value="">Select academic year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.academicYear}
                  </option>
                ))}
              </select>
            </ExamField>
            <ExamField error={fieldErrors.standardId} label="Class / Standard">
              <select
                disabled={standards.length === 0}
                onChange={(event) => setStandardId(event.target.value)}
                required
                value={standardId}
              >
                <option value="">Select class</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={standard.id}>
                    {standard.standardName}
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
          <label className="exam-active-toggle">
            <input
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              type="checkbox"
            />
            <span>Active</span>
          </label>
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
