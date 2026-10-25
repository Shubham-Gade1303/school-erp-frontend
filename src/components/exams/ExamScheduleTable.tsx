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
              <th scope="col">Academic year</th>
              <th scope="col">Class</th>
              <th scope="col">Start date</th>
              <th scope="col">End date</th>
              <th scope="col">Active status</th>
              {canManage && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const className = exam.standardName ||
                classes.find((item) => item.standardId === exam.standardId)?.label ||
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
                      </span>
                    </div>
                  </td>
                  <td>{exam.academicYear || "—"}</td>
                  <td>{className}</td>
                  <td>{formatDate(exam.startDate)}</td>
                  <td>{formatDate(exam.endDate)}</td>
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

function formatDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.slice(0, 10));
  if (!match) return date;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return date;
  }
  return new Intl.DateTimeFormat("en-GB").format(parsed);
}
