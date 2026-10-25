import type { ExamRecord } from "../../types/exam";

export function StatusBadge({ exam }: { exam: ExamRecord }) {
  const status = exam.active ? "Active" : "Inactive";
  return (
    <span className={`exam-status-badge ${exam.active ? "active" : "inactive"}`}>
      {status}
    </span>
  );
}
