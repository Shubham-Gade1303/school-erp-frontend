import axios from "axios";
import { CalendarDays, CalendarPlus, CircleAlert } from "lucide-react";
import { useState } from "react";
import { createExam, deleteExam, updateExam } from "../API/examApi";
import { ExamFormModal } from "../components/exams/ExamFormModal";
import { ExamScheduleTable } from "../components/exams/ExamScheduleTable";
import { ExamStatsCards } from "../components/exams/ExamStatsCards";
import { useAuth } from "../context/AuthContext";
import { useExamData, useExamLookups } from "../hooks/useExams";
import type {
  ExamRecord,
  ExamRequest,
  ExamValidationError,
} from "../types/exam";
import "./ExamsPage.css";

export function ExamsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "PRINCIPAL";
  const [academicYearId, setAcademicYearId] = useState("");
  const [standardId, setStandardId] = useState("");
  const [examId, setExamId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingExam, setEditingExam] = useState<
    ExamRecord | null | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ExamRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteError, setDeleteError] = useState("");

  const selectedYearId = academicYearId ? Number(academicYearId) : undefined;
  const lookups = useExamLookups();
  const filters = {
    academicYearId: selectedYearId,
    standardId: standardId ? Number(standardId) : undefined,
    examId: examId ? Number(examId) : undefined,
  };
  const examsData = useExamData(filters, refreshKey);
  const visibleClasses = lookups.classes.filter(
    (item) =>
      !selectedYearId || item.academicYearId === selectedYearId,
  );
  const loadError = lookups.error || examsData.error;
  const isLoading = examsData.loading || lookups.loading;

  function changeYear(value: string) {
    setAcademicYearId(value);
    setStandardId("");
    setExamId("");
  }

  function beginCreate() {
    setFormError("");
    setFieldErrors({});
    setEditingExam(null);
  }

  function beginEdit(exam: ExamRecord) {
    setFormError("");
    setFieldErrors({});
    setEditingExam(exam);
  }

  async function saveExam(request: ExamRequest) {
    setIsSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingExam?.id) {
        await updateExam(editingExam.id, request);
      } else {
        await createExam(request);
      }
      setEditingExam(undefined);
      setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      const parsed = getApiValidationError(error);
      setFormError(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    setDeleteError("");
    try {
      await deleteExam(deleteTarget.id);
      setDeleteTarget(null);
      setRefreshKey((value) => value + 1);
    } catch (error: unknown) {
      setDeleteError(getApiValidationError(error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="exams-page">
      <header className="exams-page-header">
        <div className="exams-heading-copy">
          <p className="exams-eyebrow">Academic planning</p>
          <h1>Examinations</h1>
          <p className="exams-subtitle">
            Review exam dates and results across the school.
          </p>
          <div className="exam-filters" aria-label="Examination filters">
            <label>
              <span>Academic Year</span>
              <select
                disabled={lookups.academicYears.length === 0}
                onChange={(event) => changeYear(event.target.value)}
                value={academicYearId}
              >
                <option value="">All academic years</option>
                {lookups.academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.academicYear}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Class</span>
              <select
                disabled={lookups.loading}
                onChange={(event) => {
                  setStandardId(event.target.value);
                  setExamId("");
                }}
                value={standardId}
              >
                <option value="">All classes</option>
                {lookups.standards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.standardName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Exam</span>
              <select
                disabled={examsData.loading}
                onChange={(event) => setExamId(event.target.value)}
                value={examId}
              >
                <option value="">All exams</option>
                {examsData.exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.examName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="exams-header-action">
          <CalendarDays aria-hidden="true" className="exams-header-calendar" size={25} />
          {canManage && (
            <button className="exam-primary-button" onClick={beginCreate} type="button">
              <CalendarPlus aria-hidden="true" size={17} />
              Post Exam Date
            </button>
          )}
        </div>
      </header>

      {loadError && (
        <p className="exam-error-message" role="alert">
          <CircleAlert aria-hidden="true" size={17} />
          {loadError}
        </p>
      )}

      <ExamStatsCards loading={isLoading} stats={examsData.stats} />

      {isLoading ? (
        <section aria-label="Loading exam schedule" className="exam-schedule-card">
          <div className="exam-section-heading">
            <div>
              <p className="exam-section-kicker">Planning</p>
              <h2>Exam schedule</h2>
            </div>
          </div>
          <div className="exam-table-skeleton" role="status">
            <span /><span /><span />
            <span /><span /><span />
            <span /><span /><span />
          </div>
        </section>
      ) : !loadError ? (
        <ExamScheduleTable
          canManage={canManage}
          classes={lookups.classes}
          exams={examsData.exams}
          onDelete={(exam) => {
            setDeleteError("");
            setDeleteTarget(exam);
          }}
          onEdit={beginEdit}
        />
      ) : null}

      {editingExam !== undefined && (
        <ExamFormModal
          classes={visibleClasses}
          error={formError}
          exam={editingExam}
          fieldErrors={fieldErrors}
          isSaving={isSaving}
          key={editingExam?.id ?? "new"}
          onCancel={() => setEditingExam(undefined)}
          onSubmit={saveExam}
          selectedAcademicYearId={selectedYearId}
        />
      )}

      {deleteTarget && (
        <div
          className="exam-dialog-backdrop"
          onMouseDown={() => !isSaving && setDeleteTarget(null)}
          role="presentation"
        >
          <section
            aria-labelledby="exam-delete-title"
            aria-modal="true"
            className="exam-dialog-card exam-delete-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p className="exam-section-kicker">Delete exam</p>
            <h2 id="exam-delete-title">Are you sure?</h2>
            <p>
              This will permanently delete <strong>{deleteTarget.examName}</strong>.
            </p>
            {deleteError && (
              <p className="exam-error-message" role="alert">{deleteError}</p>
            )}
            <div className="exam-dialog-actions">
              <button
                className="exam-secondary-button"
                disabled={isSaving}
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="exam-danger-button"
                disabled={isSaving}
                onClick={() => void confirmDelete()}
                type="button"
              >
                {isSaving ? "Deleting..." : "Delete exam"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function getApiValidationError(error: unknown): ExamValidationError {
  if (!axios.isAxiosError(error)) {
    return {
      message: error instanceof Error ? error.message : "The request failed.",
      fieldErrors: {},
    };
  }

  const data: unknown = error.response?.data;
  if (typeof data === "string" && data.trim()) {
    return { message: data, fieldErrors: {} };
  }

  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    const rawErrors = body.fieldErrors ?? body.validationErrors ?? body.errors;
    const fieldErrors: Record<string, string> = {};
    if (rawErrors && typeof rawErrors === "object" && !Array.isArray(rawErrors)) {
      Object.entries(rawErrors).forEach(([field, message]) => {
        if (typeof message === "string") fieldErrors[field] = message;
        else if (Array.isArray(message) && typeof message[0] === "string") {
          fieldErrors[field] = message[0];
        }
      });
    }
    return {
      message:
        (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        (fieldErrors.startDate && fieldErrors.endDate
          ? "Please review the highlighted fields."
          : error.response?.status === 400
            ? "Please check the form and try again."
            : "Unable to save the examination."),
      fieldErrors,
    };
  }

  return {
    message: error.response
      ? "Unable to save the examination."
      : "Unable to connect to the server.",
    fieldErrors: {},
  };
}
