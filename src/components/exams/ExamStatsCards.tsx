import {
  CalendarDays,
  CircleCheck,
  Clock3,
  ClipboardList,
} from "lucide-react";
import type { ExamStats } from "../../types/exam";

const statItems = [
  { key: "total", label: "Total Exams", icon: ClipboardList },
  { key: "upcoming", label: "Upcoming", icon: CalendarDays },
  { key: "completed", label: "Completed", icon: CircleCheck },
  { key: "resultsPending", label: "Results Pending", icon: Clock3 },
] as const;

export function ExamStatsCards({
  stats,
  loading,
}: {
  stats: ExamStats;
  loading: boolean;
}) {
  return (
    <section aria-label="Examination statistics" className="exam-stats-grid">
      {statItems.map(({ key, label, icon: Icon }) => (
        <article className="exam-stat-card" key={key}>
          <div className="exam-stat-icon">
            <Icon aria-hidden="true" size={19} />
          </div>
          <div className="exam-stat-copy">
            <span>{label}</span>
            {loading ? (
              <span aria-label={`Loading ${label}`} className="exam-stat-skeleton" />
            ) : (
              <>
                <strong>{stats[key] ?? "—"}</strong>
                {key === "resultsPending" && (
                  <small title="Exam API does not expose result publication status">
                    Not available
                  </small>
                )}
              </>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
