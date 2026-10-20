import type { ExamRecord, ExamStatus } from "../../types/exam";

export function StatusBadge({ exam }: { exam: ExamRecord }) {
  const status = normalizeStatus(exam.status) ?? deriveStatus(exam);
  const label = {
    UPCOMING: "Upcoming",
    ONGOING: "Ongoing",
    RESULTS_PENDING: "Results pending",
    COMPLETED: "Completed",
  }[status];

  return <span className={`exam-status-badge ${status.toLowerCase()}`}>{label}</span>;
}

function normalizeStatus(status?: string): ExamStatus | null {
  switch (status?.trim().toUpperCase().replaceAll(" ", "_")) {
    case "UPCOMING":
      return "UPCOMING";
    case "ONGOING":
      return "ONGOING";
    case "RESULTS_PENDING":
      return "RESULTS_PENDING";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return null;
  }
}

function deriveStatus(exam: ExamRecord): ExamStatus {
  const today = getLocalDate();
  const startDate = exam.startDate.slice(0, 10);
  const endDate = (exam.endDate || exam.startDate).slice(0, 10);

  if (today < startDate) return "UPCOMING";
  if (today <= endDate) return "ONGOING";
  return exam.resultsEntered ? "COMPLETED" : "RESULTS_PENDING";
}

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
