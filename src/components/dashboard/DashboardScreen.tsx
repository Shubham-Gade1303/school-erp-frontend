import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarDays,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDashboard, type DashboardSectionState } from "../../hooks/useDashboard";
import type {
  AttendanceToday,
  FeeCollection,
  SchedulePeriod,
} from "../../types/dashboard";

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function DashboardScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const roleBase = user ? `/${user.role.toLowerCase()}` : "/admin";
  const attendancePercentage =
    dashboard.summary.data?.attendancePercentage ??
    dashboard.attendance.data?.percentage;

  const cards = dashboard.summary.data
    ? [
        {
          label: "Total Students",
          value: dashboard.summary.data.totalStudents,
          weeklyChange: dashboard.summary.data.studentsAddedThisWeek,
          icon: <GraduationCap />,
          tone: "cyan",
        },
        {
          label: "Total Teachers",
          value: dashboard.summary.data.totalTeachers,
          weeklyChange: dashboard.summary.data.teachersAddedThisWeek,
          icon: <UsersRound />,
          tone: "purple",
        },
        {
          label: "Total Classes",
          value: dashboard.summary.data.totalClasses,
          weeklyChange: dashboard.summary.data.classesAddedThisWeek,
          icon: <BookOpen />,
          tone: "orange",
        },
        {
          label: "Attendance",
          value:
            attendancePercentage === undefined
              ? "—"
              : `${formatPercentage(attendancePercentage)}%`,
          weeklyChange:
            dashboard.summary.data.attendanceChangeVsLastWeek,
          icon: <CalendarDays />,
          tone: "red",
          attendanceChange: true,
        },
      ]
    : [];

  return (
    <div className="dashboard-page-shell">
      <header className="dashboard-hero-header">
        <div>
          <p className="dashboard-heading-kicker">Dashboard</p>
          <h1 className="dashboard-heading-title">School overview</h1>
        </div>
        <div className="dashboard-header-actions">
          <AcademicYearChip
            state={dashboard.academicYear}
            onRetry={() => void dashboard.refetchAcademicYear()}
          />
        </div>
      </header>

      <div className="dashboard-top-row">
        <section
          className="stats-grid dashboard-summary-grid dashboard-stats-grid"
          aria-label="School summary"
        >
          {dashboard.summary.isLoading && !dashboard.summary.data ? (
            <StatSkeletons />
          ) : dashboard.summary.error && !dashboard.summary.data ? (
            <div className="dashboard-inline-error" role="alert">
              <span>{dashboard.summary.error}</span>
              <button
                className="dashboard-retry-button"
                onClick={() => void dashboard.refetchSummary()}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : (
            cards.map((card) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                tone={card.tone}
                weeklyChange={card.weeklyChange}
                attendanceChange={card.attendanceChange}
              />
            ))
          )}
        </section>

        <section className="panel dashboard-panel dashboard-attendance attendance-panel">
          <div className="panel-header dashboard-panel-header">
            <h2>Attendance Overview</h2>
            <span className="dashboard-metric-pill">
              Today
              {attendancePercentage !== undefined &&
                ` · ${formatPercentage(attendancePercentage)}%`}
            </span>
          </div>
          <AttendanceContent
            state={dashboard.attendance}
            percentage={attendancePercentage}
            onRetry={() => void dashboard.refetchAttendance()}
          />
        </section>

        <section className="panel dashboard-panel dashboard-schedule schedule-panel">
          <div className="panel-header dashboard-panel-header">
            <h2>Today&apos;s Schedule</h2>
            <button
              className="dashboard-link-button"
              onClick={() => navigate(`${roleBase}/timetable`)}
              type="button"
            >
              View All
            </button>
          </div>
          <ScheduleContent
            state={dashboard.schedule}
            onRetry={() => void dashboard.refetchSchedule()}
          />
        </section>
      </div>

      <section className="panel dashboard-panel dashboard-fees fee-panel">
        <div className="panel-header dashboard-panel-header">
          <h2>Fee Collection - Month Wise</h2>
          <label className="dashboard-month-picker">
            <span className="visually-hidden">Fee collection month</span>
            <input
              max={getCurrentMonth()}
              onChange={(event) => dashboard.setMonth(event.target.value)}
              type="month"
              value={dashboard.month}
            />
          </label>
        </div>
        <FeeContent
          state={dashboard.fees}
          onRetry={() => void dashboard.refetchFees()}
        />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  weeklyChange,
  attendanceChange = false,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: string;
  weeklyChange: number;
  attendanceChange?: boolean;
}) {
  const change = Number(weeklyChange);
  const hasChange = Number.isFinite(change) && change !== 0;

  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-card-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {hasChange && (
          <small className={change > 0 ? "change-positive" : "change-negative"}>
            {change > 0 ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
            {attendanceChange
              ? `${Math.abs(change)}% vs last week`
              : `${Math.abs(change)} this week`}
          </small>
        )}
      </div>
    </article>
  );
}

function StatSkeletons() {
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => (
        <div className="dashboard-stat-skeleton" key={index} role="status">
          <span />
          <div><i /><i /><i /></div>
        </div>
      ))}
    </>
  );
}

function AcademicYearChip({
  state,
  onRetry,
}: {
  state: DashboardSectionState<string>;
  onRetry: () => void;
}) {
  if (state.isLoading && !state.data) {
    return <div className="academic-year-pill dashboard-chip-skeleton" role="status" />;
  }
  if (state.error && !state.data) {
    return (
      <div className="academic-year-pill dashboard-year-error" role="alert">
        <span>{state.error}</span>
        <button onClick={onRetry} type="button">Retry</button>
      </div>
    );
  }
  return (
    <div className="academic-year-pill">
      <CalendarDays aria-hidden="true" size={15} />
      {state.data}
    </div>
  );
}

function AttendanceContent({
  state,
  percentage,
  onRetry,
}: {
  state: DashboardSectionState<AttendanceToday>;
  percentage: number | undefined;
  onRetry: () => void;
}) {
  if (state.isLoading && !state.data) return <SectionSkeleton rows={1} />;
  if (state.error && !state.data) {
    return <SectionError message={state.error} onRetry={onRetry} />;
  }
  const attendance = state.data;
  if (!attendance) return null;

  const total = attendance.present + attendance.absent + attendance.notMarked;
  const bars = [
    { label: "Present", value: attendance.present, tone: "present" },
    { label: "Absent", value: attendance.absent, tone: "absent" },
    { label: "Not marked", value: attendance.notMarked, tone: "not-marked" },
  ];
  return (
    <>
      {total === 0 ? (
        <p className="dashboard-empty-state">No attendance data for today.</p>
      ) : (
        <div className="attendance-chart" aria-label="Today's student attendance">
          {bars.map((bar) => (
            <div className="attendance-column" key={bar.label}>
              <div className="attendance-bar-wrap">
                <span
                  className={`attendance-bar ${bar.tone}`}
                  style={{ height: `${(bar.value / total) * 100}%` }}
                />
              </div>
              <small>
                <strong>{bar.value}</strong>
                <span>{bar.label}</span>
              </small>
            </div>
          ))}
        </div>
      )}
      {percentage === undefined && (
        <p className="dashboard-secondary-error">
          Attendance percentage is unavailable.
        </p>
      )}
    </>
  );
}

function FeeContent({
  state,
  onRetry,
}: {
  state: DashboardSectionState<FeeCollection[]>;
  onRetry: () => void;
}) {
  if (state.isLoading && !state.data) return <SectionSkeleton rows={3} />;
  if (state.error && !state.data) {
    return <SectionError message={state.error} onRetry={onRetry} />;
  }
  if (!state.data?.length) {
    return <p className="dashboard-empty-state">No fee records for this month.</p>;
  }

  return (
    <div className="fee-chart">
      {state.data.map((fee) => (
        <div className="fee-row" key={fee.feeType}>
          <div className="fee-row-heading">
            <span>{fee.feeType}</span>
            <strong>{formatPercentage(fee.percentage)}%</strong>
          </div>
          <div
            className="fee-track"
            role="progressbar"
            aria-label={`${fee.feeType} collected`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, fee.percentage))}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, fee.percentage))}%` }} />
          </div>
          <small>
            {moneyFormatter.format(fee.collectedAmount)} /{" "}
            {moneyFormatter.format(fee.totalAmount)}
          </small>
        </div>
      ))}
    </div>
  );
}

function ScheduleContent({
  state,
  onRetry,
}: {
  state: DashboardSectionState<SchedulePeriod[]>;
  onRetry: () => void;
}) {
  if (state.isLoading && !state.data) return <SectionSkeleton rows={4} />;
  if (state.error && !state.data) {
    return <SectionError message={state.error} onRetry={onRetry} />;
  }
  if (!state.data?.length) {
    return <p className="dashboard-empty-state">No classes scheduled today.</p>;
  }

  const now = new Date();
  return (
    <div className="schedule-list" role="list">
      {state.data.map((period) => {
        const isCurrent = isCurrentPeriod(period, now);
        return (
          <article
            className={`schedule-item ${getSubjectTone(period.subjectName)}${isCurrent ? " is-current" : ""}`}
            key={`${period.startTime}-${period.endTime}-${period.subjectName}-${period.className}-${period.sectionName}`}
            role="listitem"
          >
            <time>
              {formatTime(period.startTime)}
              <span>{formatTime(period.endTime)}</span>
            </time>
            <div className="schedule-item-body">
              <div className="schedule-item-icon" aria-hidden="true">
                <BookOpen size={14} />
              </div>
              <div className="schedule-item-copy">
                <strong>{period.subjectName}</strong>
                <small>
                  {period.className} {period.sectionName}
                  {period.room ? ` · ${period.room}` : ""}
                  {period.teacherName ? ` · ${period.teacherName}` : ""}
                </small>
              </div>
              {isCurrent && <span className="schedule-current-label">Now</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="dashboard-section-skeleton" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="dashboard-section-error" role="alert">
      <span>{message}</span>
      <button className="dashboard-retry-button" onClick={onRetry} type="button">
        Retry
      </button>
    </div>
  );
}

function formatPercentage(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(1)) : 0;
}

function getSubjectTone(subjectName: string) {
  const palette = ["subject-tone-0", "subject-tone-1", "subject-tone-2", "subject-tone-3", "subject-tone-4"];
  let hash = 0;
  for (let index = 0; index < subjectName.length; index += 1) {
    hash = (hash * 31 + subjectName.charCodeAt(index)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isCurrentPeriod(period: SchedulePeriod, now: Date) {
  const [startHour, startMinute] = period.startTime.split(":").map(Number);
  const [endHour, endMinute] = period.endTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
