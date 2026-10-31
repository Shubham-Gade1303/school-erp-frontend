import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDashboardExams } from "../../hooks/useDashboardExams";
import { useDashboard, type DashboardSectionState } from "../../hooks/useDashboard";
import type { AttendanceRecord } from "../../types/attendance";
import type { ExamRecord } from "../../types/exam";
import { getAttendanceByDate } from "../../services/attendanceService";

type AttendanceDay = {
  date: string;
  records: AttendanceRecord[];
  error: string | null;
};

const EMPTY_EXAMS: ExamRecord[] = [];
const pendingAttendanceRequests = new Map<string, Promise<AttendanceDay>>();

export function DashboardScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboard = useDashboard();
  const {
    exams: examRecords,
    isLoading: isExamsLoading,
    error: examsError,
    loadExams,
    retryExams,
  } = useDashboardExams();
  const roleBase = user ? `/${user.role.toLowerCase()}` : "/admin";
  const today = getLocalDateString();
  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const [weekRecords, setWeekRecords] = useState<AttendanceDay[]>([]);
  const [isWeekLoading, setIsWeekLoading] = useState(true);
  const [weekRetry, setWeekRetry] = useState(0);
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  useEffect(() => {
    let isCurrent = true;
    const datesToLoad = weekDates.filter((date) => date !== today);
    Promise.all(datesToLoad.map(loadAttendanceDay))
      .then((days) => {
        if (isCurrent) setWeekRecords(days);
      })
      .finally(() => {
        if (isCurrent) setIsWeekLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [today, weekDates, weekRetry]);

  const todayMetrics = useMemo(
    () => getAttendanceMetrics(dashboard.attendance.data ?? []),
    [dashboard.attendance.data],
  );
  const exams = examRecords ?? EMPTY_EXAMS;
  const upcomingExams = useMemo(
    () => getUpcomingExams(exams, today),
    [exams, today],
  );
  const calendarDays = useMemo(
    () => getCalendarDays(displayedMonth),
    [displayedMonth],
  );
  const selectedDateExams = exams.filter(
    (exam) => exam.active && isDateInExamRange(selectedDate, exam),
  );
  const weekByDate = new Map(weekRecords.map((day) => [day.date, day]));
  const hasWeekError = weekRecords.some((day) => day.error);
  const isAttendanceLoading = isWeekLoading || dashboard.attendance.isLoading;
  const statCards = [
    {
      label: "Total Students",
      value: getMetricValue(dashboard.students),
      error: dashboard.students.data === null ? dashboard.students.error : null,
      icon: <GraduationCap />,
      tone: "cyan",
      onRetry: () => void dashboard.refetchStudents(),
    },
    {
      label: "Total Teachers",
      value: getMetricValue(dashboard.teachers),
      error: dashboard.teachers.data === null ? dashboard.teachers.error : null,
      icon: <UsersRound />,
      tone: "purple",
      onRetry: () => void dashboard.refetchTeachers(),
    },
    {
      label: "Total Classes",
      value: getMetricValue(dashboard.classes),
      error: dashboard.classes.data === null ? dashboard.classes.error : null,
      icon: <BookOpen />,
      tone: "orange",
      note: "standards / grades",
      onRetry: () => void dashboard.refetchClasses(),
    },
    {
      label: "Attendance Today",
      value: dashboard.attendance.isLoading && !dashboard.attendance.data
        ? "…"
        : dashboard.attendance.error
          ? "N/A"
          : todayMetrics.percentage === null
            ? "N/A"
            : `${todayMetrics.percentage}%`,
      error: dashboard.attendance.data === null ? dashboard.attendance.error : null,
      icon: <ClipboardCheck />,
      tone: "red",
      note: "of marked records",
      onRetry: () => void dashboard.refetchAttendance(),
    },
  ];

  function retryAttendance() {
    setIsWeekLoading(true);
    setWeekRetry((retry) => retry + 1);
    void dashboard.refetchAttendance();
  }

  return (
    <main className="dashboard-page-shell dashboard-redesign">
      <header className="dashboard-hero-header">
        <div className="dashboard-heading-copy">
          <p className="dashboard-heading-kicker">Dashboard</p>
          <h1 className="dashboard-heading-title">
            Welcome back{user?.username ? `, ${user.username}` : ""}
          </h1>
          <p className="dashboard-heading-description">
            Here&apos;s what&apos;s happening across your school today.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <AcademicYearChip
            state={dashboard.academicYear}
            onRetry={() => void dashboard.refetchAcademicYear()}
          />
        </div>
      </header>

      <section className="dashboard-redesign-stats" aria-label="School summary">
        {statCards.map((card) => (
            <StatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              tone={card.tone}
              error={card.error}
              onRetry={card.onRetry}
              note={card.note}
            />
        ))}
      </section>

      <div className="dashboard-redesign-grid">
        <div className="dashboard-redesign-column">
          <section className="panel dashboard-redesign-panel">
            <PanelHeader
              title="Attendance Overview"
              action={
                <span className="dashboard-date-pill">
                  <CalendarDays size={13} />
                  This week
                </span>
              }
            />
            {isAttendanceLoading && !dashboard.attendance.data ? (
              <SectionSkeleton />
            ) : dashboard.attendance.error && !dashboard.attendance.data ? (
              <SectionError
                message={dashboard.attendance.error}
                onRetry={retryAttendance}
              />
            ) : (
              <>
                {hasWeekError && (
                  <p className="dashboard-inline-note" role="status">
                    Some daily attendance records could not be loaded.
                    <button onClick={retryAttendance} type="button">Retry</button>
                  </p>
                )}
                <AttendanceChart
                  dates={weekDates}
                  recordsByDate={weekByDate}
                  today={today}
                  todayRecords={dashboard.attendance.data ?? []}
                />
              </>
            )}
          </section>

          <UnavailablePanel
            title="Today&apos;s Schedule"
            description="A timetable API is not available in the frontend services, so schedule data cannot be loaded here."
          />

          <UnavailablePanel
            title="Recent Admissions"
            description="Recent admission records and admission dates are not available through the current frontend API services."
          />
        </div>

        <div className="dashboard-redesign-column">
          <section className="panel dashboard-redesign-panel">
            <PanelHeader
              title="Upcoming Examinations"
              action={
                <button
                  className="dashboard-text-link"
                  onClick={() => navigate(`${roleBase}/exams`)}
                  type="button"
                >
                  View all
                </button>
              }
            />
            <ExamsContent
              exams={upcomingExams}
              isLoading={isExamsLoading}
              error={examsError}
              onRetry={() => void retryExams()}
            />
          </section>

          <ExamCalendar
            month={displayedMonth}
            days={calendarDays}
            selectedDate={selectedDate}
            today={today}
            exams={exams}
            selectedExams={selectedDateExams}
            onPrevious={() => setDisplayedMonth((month) =>
              new Date(month.getFullYear(), month.getMonth() - 1, 1),
            )}
            onNext={() => setDisplayedMonth((month) =>
              new Date(month.getFullYear(), month.getMonth() + 1, 1),
            )}
            onSelectDate={setSelectedDate}
          />

          <UnavailablePanel
            title="Top Performers"
            description="The performance API requires a student ID, so a school-wide ranking cannot be loaded without making a separate request for every student."
          />

          <UnavailablePanel
            title="Fee Collection"
            description="Fee and payment APIs are scoped to individual students and fee records. No school-wide collection summary is available in the frontend services."
          />

          <ImportantAlerts
            exams={upcomingExams}
            absentStudents={todayMetrics.absent}
            attendanceReady={!dashboard.attendance.isLoading && !dashboard.attendance.error}
            examsAvailable={examRecords !== null}
            onRetryExams={() => void retryExams()}
          />
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  error,
  onRetry,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: string;
  error: string | null;
  onRetry: () => void;
  note?: string;
}) {
  return (
    <article className="dashboard-redesign-stat">
      <div className={`dashboard-redesign-stat-icon ${tone}`}>{icon}</div>
      <div className="dashboard-redesign-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small className="dashboard-redesign-stat-note">{note}</small>}
        {error && (
          <small className="dashboard-redesign-stat-error" title={error}>
            Data unavailable
            <button onClick={onRetry} type="button">Retry</button>
          </small>
        )}
      </div>
    </article>
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
    return <span className="dashboard-date-pill" role="status">Loading academic year…</span>;
  }
  if (state.error && !state.data) {
    return (
      <button className="dashboard-date-pill" onClick={onRetry} title={state.error} type="button">
        Academic year unavailable · Retry
      </button>
    );
  }
  return (
    <span className="dashboard-date-pill">
      <CalendarDays size={14} />
      Academic Year {state.data ?? "Unavailable"}
    </span>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="dashboard-redesign-panel-header">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

function AttendanceChart({
  dates,
  recordsByDate,
  today,
  todayRecords,
}: {
  dates: string[];
  recordsByDate: Map<string, AttendanceDay>;
  today: string;
  todayRecords: AttendanceRecord[];
}) {
  const values = dates.map((date) => {
    const records = date === today ? todayRecords : recordsByDate.get(date)?.records ?? [];
    return { date, ...getAttendanceMetrics(records) };
  });
  const hasData = values.some((day) => day.marked > 0);

  if (!hasData) {
    return <p className="dashboard-redesign-empty">No attendance records are available for this week.</p>;
  }

  return (
    <div className="dashboard-attendance-chart" aria-label="Attendance percentage by day">
      <div className="dashboard-chart-axis" aria-hidden="true">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div className="dashboard-chart-bars">
        {values.map((day) => (
          <div className="dashboard-chart-day" key={day.date}>
            <div className="dashboard-chart-track">
              {day.marked > 0 ? (
                <>
                  <span
                    className="dashboard-chart-value"
                    style={{ bottom: `${day.percentage}%` }}
                  >
                    {day.percentage}%
                  </span>
                  <span
                    className="dashboard-chart-bar"
                    style={{ height: `${day.percentage}%` }}
                    title={`${day.present} present of ${day.marked} marked`}
                  />
                </>
              ) : (
                <span className="dashboard-chart-no-data" title="No attendance records">—</span>
              )}
            </div>
            <small>{formatWeekday(day.date)}</small>
          </div>
        ))}
      </div>
      <p className="dashboard-chart-caption">
        Present ÷ (present + absent) for unique students with a marked record.
      </p>
    </div>
  );
}

function ExamsContent({
  exams,
  isLoading,
  error,
  onRetry,
}: {
  exams: ExamRecord[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (isLoading && !exams.length) return <SectionSkeleton />;
  if (error && !exams.length) return <SectionError message={error} onRetry={onRetry} />;
  if (!exams.length) return <p className="dashboard-redesign-empty">No upcoming examinations.</p>;

  return (
    <div className="dashboard-redesign-exams">
      {exams.slice(0, 5).map((exam) => (
        <article className="dashboard-redesign-exam" key={exam.id}>
          <span className="dashboard-exam-date">{formatShortDate(exam.startDate)}</span>
          <div>
            <strong>{exam.examName}</strong>
            <small>{exam.standardName} · {getExamTiming(exam.startDate)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

function ExamCalendar({
  month,
  days,
  selectedDate,
  today,
  exams,
  selectedExams,
  onPrevious,
  onNext,
  onSelectDate,
}: {
  month: Date;
  days: string[];
  selectedDate: string;
  today: string;
  exams: ExamRecord[];
  selectedExams: ExamRecord[];
  onPrevious: () => void;
  onNext: () => void;
  onSelectDate: (date: string) => void;
}) {
  return (
    <section className="panel dashboard-redesign-panel">
      <PanelHeader
        title="Exam Calendar"
        action={
          <div className="dashboard-calendar-controls">
            <button aria-label="Previous month" onClick={onPrevious} type="button"><ChevronLeft size={16} /></button>
            <strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
            <button aria-label="Next month" onClick={onNext} type="button"><ChevronRight size={16} /></button>
          </div>
        }
      />
      <div className="dashboard-calendar-grid" role="grid" aria-label="Examination dates">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span className="dashboard-calendar-weekday" key={day} role="columnheader">{day}</span>
        ))}
        {days.map((date) => {
          const inMonth = date.slice(0, 7) === formatMonth(month);
          const hasExam = exams.some((exam) => exam.active && isDateInExamRange(date, exam));
          const classes = [
            "dashboard-calendar-day",
            inMonth ? "" : "outside-month",
            date === today ? "is-today" : "",
            date === selectedDate ? "is-selected" : "",
            hasExam ? "has-exam" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              aria-label={`${formatLongDate(date)}${hasExam ? ", examination scheduled" : ""}`}
              aria-pressed={date === selectedDate}
              className={classes}
              key={date}
              onClick={() => onSelectDate(date)}
              role="gridcell"
              type="button"
            >
              {Number(date.slice(-2))}
            </button>
          );
        })}
      </div>
      <div className="dashboard-calendar-selected">
        <strong>{formatLongDate(selectedDate)}</strong>
        {selectedExams.length ? (
          selectedExams.map((exam) => (
            <span key={exam.id}>{exam.examName} · {exam.standardName}</span>
          ))
        ) : (
          <small>No examinations scheduled for this date.</small>
        )}
      </div>
      <p className="dashboard-calendar-legend"><i /> Examination date</p>
    </section>
  );
}

function ImportantAlerts({
  exams,
  absentStudents,
  attendanceReady,
  examsAvailable,
  onRetryExams,
}: {
  exams: ExamRecord[];
  absentStudents: number;
  attendanceReady: boolean;
  examsAvailable: boolean;
  onRetryExams: () => void;
}) {
  const soonExams = exams.filter((exam) => daysUntil(exam.startDate) <= 30);
  const hasAlerts = soonExams.length > 0 || (attendanceReady && absentStudents > 0);

  return (
    <section className="panel dashboard-redesign-panel">
      <PanelHeader title="Important Alerts" />
      {!hasAlerts && !examsAvailable ? (
        <div className="dashboard-redesign-section-error" role="alert">
          <span>Examination alert data is unavailable.</span>
          <button onClick={onRetryExams} type="button">Retry</button>
        </div>
      ) : !hasAlerts ? (
        <p className="dashboard-redesign-empty">No alerts from the available exam and attendance records.</p>
      ) : (
        <div className="dashboard-alert-list">
          {!examsAvailable && (
            <article>
              <span className="dashboard-alert-icon exam"><CalendarDays size={15} /></span>
              <div><strong>Examination alerts are unavailable</strong><small>Retry to check upcoming exam records</small></div>
              <button onClick={onRetryExams} type="button">Retry</button>
            </article>
          )}
          {soonExams.length > 0 && (
            <article>
              <span className="dashboard-alert-icon exam"><CalendarDays size={15} /></span>
              <div><strong>{soonExams.length} upcoming examination{soonExams.length === 1 ? "" : "s"}</strong><small>Based on active examination dates</small></div>
            </article>
          )}
          {attendanceReady && absentStudents > 0 && (
            <article>
              <span className="dashboard-alert-icon attendance"><ClipboardCheck size={15} /></span>
              <div><strong>{absentStudents} students marked absent today</strong><small>Based on today&apos;s attendance records</small></div>
            </article>
          )}
        </div>
      )}
    </section>
  );
}

function UnavailablePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="panel dashboard-redesign-panel">
      <PanelHeader title={title} />
      <p className="dashboard-redesign-empty">{description}</p>
    </section>
  );
}

function SectionSkeleton() {
  return <div className="dashboard-redesign-section-loading" role="status">Loading…</div>;
}

function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="dashboard-redesign-section-error" role="alert">
      <span>{message}</span>
      <button onClick={onRetry} type="button">Retry</button>
    </div>
  );
}

function getAttendanceMetrics(records: AttendanceRecord[]) {
  const uniqueRecords = new Map<number, string>();
  for (const record of records) {
    uniqueRecords.set(record.studentId, record.status.trim().toUpperCase());
  }
  let present = 0;
  let absent = 0;
  for (const status of uniqueRecords.values()) {
    if (status === "PRESENT") present += 1;
    if (status === "ABSENT") absent += 1;
  }
  const marked = present + absent;
  return {
    present,
    absent,
    marked,
    percentage: marked ? Math.round((present / marked) * 1000) / 10 : null,
  };
}

function getMetricValue(state: DashboardSectionState<number>) {
  if (state.data !== null) return state.data;
  return state.isLoading ? "…" : "N/A";
}

function getUpcomingExams(exams: ExamRecord[], today: string) {
  return exams
    .filter((exam) =>
      exam.active &&
      isValidDate(exam.startDate) &&
      isValidDate(exam.endDate) &&
      exam.endDate >= today
    )
    .sort((first, second) => first.startDate.localeCompare(second.startDate));
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), -firstDay.getDay() + 1);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return getLocalDateString(date);
  });
}

function getWeekDates(date: Date) {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - daysSinceMonday,
  );
  return Array.from({ length: 7 }, (_, index) =>
    getLocalDateString(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)),
  );
}

function isDateInExamRange(date: string, exam: ExamRecord) {
  return exam.active && isValidDate(exam.startDate) && isValidDate(exam.endDate)
    && date >= exam.startDate && date <= exam.endDate;
}

function getExamTiming(date: string) {
  const difference = daysUntil(date);
  if (difference < 0) return "In progress";
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  return "Upcoming";
}

function daysUntil(date: string) {
  const target = parseLocalDate(date);
  if (!target) return Number.POSITIVE_INFINITY;
  const today = parseLocalDate(getLocalDateString());
  return today
    ? Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
      - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86_400_000)
    : Number.POSITIVE_INFINITY;
}

function parseLocalDate(value: string) {
  if (!isValidDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatWeekday(value: string) {
  const date = parseLocalDate(value);
  return date?.toLocaleDateString(undefined, { weekday: "short" }) ?? value;
}

function formatShortDate(value: string) {
  const date = parseLocalDate(value);
  return date?.toLocaleDateString(undefined, { day: "numeric", month: "short" }) ?? value;
}

function formatLongDate(value: string) {
  const date = parseLocalDate(value);
  return date?.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) ?? value;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function loadAttendanceDay(date: string) {
  const pendingRequest = pendingAttendanceRequests.get(date);
  if (pendingRequest) return pendingRequest;

  const request = getAttendanceByDate(date)
    .then((response) => ({ date, records: response.data, error: null }))
    .catch((error: unknown) => ({
      date,
      records: [],
      error: getErrorMessage(error, `Unable to load attendance for ${date}.`),
    }))
    .finally(() => pendingAttendanceRequests.delete(date));
  pendingAttendanceRequests.set(date, request);
  return request;
}
