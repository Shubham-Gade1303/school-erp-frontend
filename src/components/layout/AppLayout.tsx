import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDashboardExams } from "../../hooks/useDashboardExams";
import type { ExamRecord } from "../../types/exam";
import type { UserRole } from "../../types/api";

type NavigationItem = { label: string; path: string; icon: typeof LayoutDashboard };

const navigationByRole: Record<UserRole, NavigationItem[]> = {
  ADMIN: ([
    ["Dashboard", "dashboard", LayoutDashboard],
    ["Admission", "admission", UserPlus],
    ["Academic Years", "academic-years", CalendarDays],
    ["Students", "students", UsersRound],
    ["Teachers", "teachers", UsersRound],
    ["Subjects", "subjects", BookOpen],
    ["Attendance", "attendance", ClipboardList],
    ["Exams", "exams", ClipboardList],
    ["Results", "results", BarChart3],
    ["Fees", "fees", ShieldCheck],
    ["Users", "users", UsersRound],
    ["Reports", "reports", Video],
    ["Settings", "settings", Settings],
  ] as const).map(([label, path, icon]) => ({ label, path: `/admin/${path}`, icon })),
  PRINCIPAL: ([
    ["Dashboard", "dashboard", LayoutDashboard],
    ["Students", "students", UsersRound],
    ["Teachers", "teachers", UsersRound],
    ["Subjects", "subjects", BookOpen],
    ["Attendance", "attendance", ClipboardList],
    ["Exams", "exams", ClipboardList],
    ["Results", "results", BarChart3],
    ["Reports", "reports", Video],
    ["Settings", "settings", Settings],
  ] as const).map(([label, path, icon]) => ({ label, path: `/principal/${path}`, icon })),
  TEACHER: ([
    ["Dashboard", "dashboard", LayoutDashboard],
    ["My Classes", "classes", BookOpen],
    ["My Students", "students", UsersRound],
    ["Subjects", "subjects", BookOpen],
    ["Attendance", "attendance", CalendarDays],
    ["Assignments", "assignments", ClipboardList],
    ["Exams", "exams", ClipboardList],
    ["Results", "results", BarChart3],
    ["Calendar", "calendar", CalendarDays],
    ["Messages", "messages", MessageCircle],
    ["Profile", "profile", UsersRound],
  ] as const).map(([label, path, icon]) => ({ label, path: `/teacher/${path}`, icon })),
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const examsState = useDashboardExams();
  const notificationExams = getUpcomingExamReminders(examsState.exams ?? []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function toggleNotifications() {
    const shouldOpen = !isNotificationsOpen;
    setIsNotificationsOpen(shouldOpen);
    if (shouldOpen) void examsState.loadExams();
  }

  useEffect(() => {
    if (!isNotificationsOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !notificationMenuRef.current?.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsNotificationsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNotificationsOpen]);

  if (!user) return null;

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><GraduationCap size={21} /></span>
          <span><strong>School-ERP</strong><small>Learn Suite</small></span>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigationByRole[user.role].map(({ label, path, icon: Icon }) => (
            <NavLink
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
              key={label}
              to={path}
              end
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
          <button className="logout" onClick={handleLogout} type="button">
            <LogOut size={15} />
            Logout
          </button>
        </nav>
      </aside>
      <section className="content-area">
        <header className="topbar">
          <div className="top-actions">
            <div className="notification-menu" ref={notificationMenuRef}>
              <button
                aria-controls="school-notifications"
                aria-expanded={isNotificationsOpen}
                aria-label="Notifications"
                onClick={toggleNotifications}
                type="button"
              >
                <Bell size={17} />
              </button>
              {isNotificationsOpen && (
                <section
                  aria-label="Notifications"
                  className="notification-dropdown"
                  id="school-notifications"
                  role="dialog"
                >
                  <div className="notification-dropdown-heading">
                    <div>
                      <strong>Notifications</strong>
                      <small>Exam reminders from school records</small>
                    </div>
                    <button
                      aria-label="Close notifications"
                      className="notification-close"
                      onClick={() => setIsNotificationsOpen(false)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  {examsState.isLoading && !examsState.exams ? (
                    <p className="notification-dropdown-state" role="status">Loading reminders…</p>
                  ) : examsState.error && !examsState.exams ? (
                    <div className="notification-dropdown-state" role="alert">
                      <p>{examsState.error}</p>
                      <button onClick={() => void examsState.retryExams()} type="button">Retry</button>
                    </div>
                  ) : notificationExams.length ? (
                    <ul className="notification-list">
                      {notificationExams.slice(0, 5).map((exam) => (
                        <li key={exam.id}>
                          <span className="notification-exam-icon"><CalendarDays size={15} /></span>
                          <span className="notification-copy">
                            <strong>{exam.examName}</strong>
                            <small>{exam.standardName} · {formatReminderDate(exam.startDate)}</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="notification-dropdown-state">No upcoming exam reminders.</p>
                  )}
                  <button
                    className="notification-view-all"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate(`/${user.role.toLowerCase()}/exams`);
                    }}
                    type="button"
                  >
                    View examinations
                  </button>
                  <p className="notification-disclaimer">
                    The frontend has no notification or read-status API configured.
                  </p>
                </section>
              )}
            </div>
            <button className="message-button" aria-label="Messages" type="button"><MessageCircle size={17} /><i /></button>
            <button aria-label="Help" type="button"><CircleHelp size={17} /></button>
          </div>
          <div className="profile">
            <div className="avatar profile-avatar">{getInitials(user.username)}</div>
            <span><strong>{user.username}</strong><small>{user.role}</small></span>
            <ChevronRight size={14} />
          </div>
        </header>
        <Outlet />
      </section>
    </main>
  );
}

function getUpcomingExamReminders(exams: ExamRecord[]) {
  const today = getLocalDateString();
  return exams
    .filter((exam) => exam.active && isValidDate(exam.startDate) && exam.endDate >= today)
    .sort((first, second) => first.startDate.localeCompare(second.startDate));
}

function formatReminderDate(value: string) {
  if (!isValidDate(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = getLocalDateString();
  if (value === today) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === getLocalDateString(tomorrow)) return "Tomorrow";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
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

function getInitials(username: string) {
  return username.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}