import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import type { ExamClassOption, ExamRecord } from "../../types/exam";
import { StatusBadge } from "./StatusBadge";

interface ExamScheduleTableProps {
  exams: ExamRecord[];
  classes: ExamClassOption[];
  canManage: boolean;
  onEdit: (exam: ExamRecord) => void;
  onDelete: (exam: ExamRecord) => void;
}

export function ExamScheduleTable({
  exams,
  classes,
  canManage,
  onEdit,
  onDelete,
}: ExamScheduleTableProps) {
  return (
    <section className="exam-schedule-card">
      <div className="exam-section-heading">
        <div>
          <p className="exam-section-kicker">Planning</p>
          <h2>Exam schedule</h2>
        </div>
        <span>{exams.length} {exams.length === 1 ? "exam" : "exams"}</span>
      </div>
      <div className="exam-table-scroll">
        <table className="exam-table">
          <thead>
            <tr>
              <th scope="col">Exam</th>
              <th scope="col">Class</th>
              <th scope="col">Status</th>
              {canManage && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const className =
                exam.standardName ||
                classes.find(
                  (item) =>
                    item.standardId === exam.standardId &&
                    item.academicYearId === exam.academicYearId,
                )?.label ||
                "—";
              return (
                <tr key={exam.id}>
                  <td>
                    <div className="exam-name-cell">
                      <span aria-hidden="true" className="exam-row-icon">
                        <CalendarDays size={17} />
                      </span>
                      <span>
                        <strong>{exam.examName}</strong>
                        <small>
                          {formatDateRange(exam.startDate, exam.endDate)}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>{className}</td>
                  <td><StatusBadge exam={exam} /></td>
                  {canManage && (
                    <td>
                      <div className="exam-row-actions">
                        <button
                          aria-label={`Edit ${exam.examName}`}
                          className="exam-icon-button"
                          onClick={() => onEdit(exam)}
                          title="Edit exam"
                          type="button"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={`Delete ${exam.examName}`}
                          className="exam-icon-button danger"
                          onClick={() => onDelete(exam)}
                          title="Delete exam"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {exams.length === 0 && (
        <div className="exam-empty-state">
          <CalendarDays aria-hidden="true" size={25} />
          <h3>No examinations found</h3>
          <p>Try changing the filters or post an exam date to get started.</p>
        </div>
      )}
    </section>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return end !== start ? `${start} – ${end}` : start;
}

function formatDate(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en-GB").format(parsed);
}
