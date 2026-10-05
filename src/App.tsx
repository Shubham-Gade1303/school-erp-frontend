import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import axios from "axios";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { loadDashboardData } from "./API/dashboardService";
import { TeacherDashboardContent } from "./components/teacher/TeacherDashboardContent";
import { TeacherFeaturePlaceholder } from "./components/teacher/TeacherFeaturePlaceholder";
import { AppLayout } from "./components/layout/AppLayout";
import { useAuth } from "./context/AuthContext";
import { TeachersPage } from "./pages/admin/Teachers";
import { StudentsPage } from "./pages/admin/Students";
import { AdmissionPage } from "./pages/admission/AdmissionPage";
import { AcademicYearsPage } from "./pages/admission/AcademicYearsPage";
import { AttendancePage } from "./pages/AttendancePage";
import type { DashboardData, UserRole } from "./types/api";
import { getAttendanceByDate } from "./services/attendanceService";
import { getAllStudents } from "./services/studentService";
import type { AttendanceRecord } from "./types/attendance";
import "./App.css";

const roleRoutes: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  PRINCIPAL: "/principal/dashboard",
  TEACHER: "/teacher/dashboard",
};

type AttendanceOverviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      date: string;
      totalActive: number;
      present: number;
      absent: number;
      notMarked: number;
      rate: number | null;
      isEmpty: boolean;
    };

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<RoleRoute role="ADMIN" />}>
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardScreen />} />
            <Route path="timetable" element={<FeaturePage title="Timetable" />} />
            <Route path="admission" element={<AdmissionPage />} />
            <Route path="academic-years" element={<AcademicYearsPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="classes" element={<FeaturePage title="Classes" />} />
            <Route path="subjects" element={<FeaturePage title="Subjects" />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="exams" element={<FeaturePage title="Exams" />} />
            <Route path="results" element={<FeaturePage title="Results" />} />
            <Route path="fees" element={<FeaturePage title="Fees" />} />
            <Route path="users" element={<FeaturePage title="Users" />} />
            <Route path="roles" element={<FeaturePage title="Roles" />} />
            <Route path="reports" element={<FeaturePage title="Reports" />} />
            <Route path="settings" element={<FeaturePage title="Settings" />} />
          </Route>
        </Route>
        <Route path="/principal" element={<RoleRoute role="PRINCIPAL" />}>
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardScreen />} />
            <Route path="timetable" element={<FeaturePage title="Timetable" />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="teachers" element={<FeaturePage title="Teachers" />} />
            <Route path="classes" element={<FeaturePage title="Classes" />} />
            <Route path="subjects" element={<FeaturePage title="Subjects" />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="exams" element={<FeaturePage title="Exams" />} />
            <Route path="results" element={<FeaturePage title="Results" />} />
            <Route path="reports" element={<FeaturePage title="Reports" />} />
            <Route path="settings" element={<FeaturePage title="Settings" />} />
          </Route>
        </Route>
        <Route path="/teacher" element={<RoleRoute role="TEACHER" />}>
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardScreen />} />
            <Route path="timetable" element={<FeaturePage title="Timetable" />} />
            <Route path="classes" element={<TeacherFeatureRoute title="My Classes" />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="assignments" element={<TeacherFeatureRoute title="Assignments" />} />
            <Route path="exams" element={<TeacherFeatureRoute title="Exams" />} />
            <Route path="results" element={<TeacherFeatureRoute title="Results" />} />
            <Route path="calendar" element={<TeacherFeatureRoute title="Calendar" />} />
            <Route path="messages" element={<TeacherFeatureRoute title="Messages" />} />
            <Route path="profile" element={<TeacherFeatureRoute title="Profile" />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  );
}

function TeacherFeatureRoute({ title }: { title: string }) {
  return <TeacherFeaturePlaceholder title={title} />;
}

function FeaturePage({ title }: { title: string }) {
  return (
    <section className="content-page feature-placeholder">
      <div className="placeholder-card panel">
        <h1>{title}</h1>
        <p>This area is ready for the Spring Boot API integration. No placeholder records are shown.</p>
      </div>
    </section>
  );
}

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate replace state={{ from: location }} to="/login" />
  );
}

function RoleRoute({ role }: { role: UserRole }) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return <Navigate replace to={user ? roleRoutes[user.role] : "/login"} />;
  }

  return <Outlet />;
}

function DashboardScreen() {
  const { user, accessDeniedMessage, clearAccessDenied } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [attendanceOverview, setAttendanceOverview] =
    useState<AttendanceOverviewState>({ status: "loading" });
  const role = user?.role;

  useEffect(() => {
    if (!role || role === "TEACHER") return;
    let isCurrent = true;
    loadDashboardData(role).then((data) => {
      if (isCurrent) setDashboardData(data);
    });
    return () => {
      isCurrent = false;
    };
  }, [role]);

  useEffect(() => {
    if (!role || role === "TEACHER") return;
    let isCurrent = true;
    const date = getLocalDateString();

    setAttendanceOverview({ status: "loading" });
    Promise.allSettled([getAttendanceByDate(date), getAllStudents()]).then(
      ([attendanceResult, studentsResult]) => {
        if (!isCurrent) return;
        if (attendanceResult.status === "rejected") {
          setAttendanceOverview({
            status: "error",
            message: "Unable to load today's attendance.",
          });
          return;
        }
        if (studentsResult.status === "rejected") {
          setAttendanceOverview({
            status: "error",
            message: "Unable to load today's active student count.",
          });
          return;
        }

        const records = attendanceResult.value.data;
        const totalActive = studentsResult.value.data.filter(
          (student) => student.active === true,
        ).length;
        const present = countAttendanceStatus(records, "PRESENT");
        const absent = countAttendanceStatus(records, "ABSENT");
        const notMarked = Math.max(0, totalActive - present - absent);

        setAttendanceOverview({
          status: "loaded",
          date,
          totalActive,
          present,
          absent,
          notMarked,
          rate: totalActive > 0 ? Math.round((present / totalActive) * 1000) / 10 : null,
          isEmpty: records.length === 0,
        });
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [role]);

  if (!user || !role || (role !== "TEACHER" && !dashboardData)) return null;

  const scheduleData = [
    { time: "08:00 AM", title: "Mathematics", detail: "Class 10 • Room 101", tone: "primary" },
    { time: "09:00 AM", title: "Science", detail: "Class 9 • Room 102", tone: "success" },
    { time: "10:00 AM", title: "English", detail: "Class 8 • Room 103", tone: "purple" },
    { time: "11:00 AM", title: "Social Studies", detail: "Class 7 • Room 104", tone: "orange" },
    { time: "12:00 PM", title: "Lunch Break", detail: "All Classes", tone: "neutral" },
    { time: "01:00 PM", title: "Computer Science", detail: "Class 9 • Lab 1", tone: "pink" },
  ];

  const feeCollection = [
    { label: "Tuition Fee", value: 90 },
    { label: "Transport Fee", value: 75 },
    { label: "Hostel Fee", value: 60 },
    { label: "Other Fee", value: 50 },
  ];

  const topPerformers = [
    { name: "Aarav Sharma", score: "96%", badge: "Grade A" },
    { name: "Diya Nair", score: "94%", badge: "Grade A" },
    { name: "Kabir Singh", score: "92%", badge: "Grade A" },
  ];

  return (
    <>
      {accessDeniedMessage && (
        <p className="form-error" role="alert" onClick={clearAccessDenied}>
          {accessDeniedMessage}
        </p>
      )}

      {role === "TEACHER" ? (
        <TeacherDashboardContent user={user} onNavigate={navigate} />
      ) : (
        <div className="dashboard-page-shell">
          <header className="dashboard-hero-header">
            <div>
              <p className="dashboard-heading-kicker">Dashboard</p>
              <h1 className="dashboard-heading-title">Welcome to School ERP System</h1>
            </div>
            <div className="dashboard-header-actions">
              <div className="academic-year-pill">
                <CalendarDays size={15} />
                Academic Year 2026-2027
              </div>
            </div>
          </header>

          <div className="dashboard-top-row">
            <div className="stats-grid dashboard-summary-grid dashboard-stats-grid">
              {dashboardData?.stats.map((stat) => (
                <StatCard
                  icon={getStatIcon(stat.icon)}
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  tone={stat.tone}
                />
              ))}
            </div>

            <section className="panel dashboard-panel dashboard-attendance attendance-panel">
              <div className="panel-header dashboard-panel-header">
                <h2>Attendance Overview</h2>
                <button className="dashboard-filter-button" type="button">
                  {attendanceOverview.status === "loaded" && attendanceOverview.rate !== null
                    ? `Today · ${attendanceOverview.rate}%`
                    : "Today"}
                </button>
              </div>

              {attendanceOverview.status === "loading" ? (
                <div className="attendance-chart" role="status">
                  <p className="empty-state" style={{ margin: "auto" }}>
                    Loading today's attendance...
                  </p>
                </div>
              ) : attendanceOverview.status === "error" ? (
                <div className="attendance-chart" role="alert">
                  <p className="empty-state" style={{ margin: "auto" }}>
                    {attendanceOverview.message}
                  </p>
                </div>
              ) : (
                <>
                  {attendanceOverview.isEmpty && (
                    <p className="empty-state" style={{ margin: "0 16px", padding: "0 0 8px" }}>
                      No attendance marked today.
                    </p>
                  )}
                  <div className="attendance-chart" aria-label="Today's student attendance">
                    {[
                      { label: "Present", value: attendanceOverview.present, color: "#1eb982" },
                      { label: "Absent", value: attendanceOverview.absent, color: "#e35f79" },
                      { label: "Not Marked", value: attendanceOverview.notMarked, color: "#8b98a9" },
                    ].map((item) => (
                      <div className="attendance-column" key={item.label}>
                        <div className="attendance-bar-wrap">
                          <span
                            className="attendance-bar"
                            style={{
                              height: attendanceOverview.totalActive
                                ? `${(item.value / attendanceOverview.totalActive) * 100}%`
                                : "0%",
                              minHeight: item.value ? undefined : 0,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <small>
                          <strong>{item.value}</strong>
                          <span>{item.label}</span>
                        </small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="panel dashboard-panel dashboard-schedule schedule-panel">
              <div className="panel-header dashboard-panel-header">
                <h2>Today's Schedule</h2>
                <button className="dashboard-link-button" type="button">
                  View All
                </button>
              </div>

              <div className="schedule-list" role="list">
                {scheduleData.map((item) => (
                  <div className={`schedule-item ${item.tone}`} key={`${item.time}-${item.title}`} role="listitem">
                    <time>{item.time}</time>
                    <div className="schedule-item-body">
                      <div className="schedule-item-icon" aria-hidden="true">
                        <CalendarDays size={15} />
                      </div>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="panel dashboard-panel dashboard-fees fee-panel">
            <div className="panel-header dashboard-panel-header">
              <h2>Fee Collection - Month Wise</h2>
              <button className="dashboard-filter-button" type="button">
                This Month
              </button>
            </div>

            <div className="fee-chart">
              {feeCollection.map((item) => (
                <div className="fee-row" key={item.label}>
                  <div className="fee-label-row">
                    <span>{item.label}</span>
                  </div>
                  <div className="fee-track">
                    <span style={{ width: `${item.value}%` }} />
                  </div>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel dashboard-panel dashboard-insights insight-panel">
            <div className="panel-header dashboard-panel-header">
              <h2>Top Performers</h2>
              <button className="dashboard-link-button" type="button">
                View Full Report
              </button>
            </div>

            <div className="performer-list">
              {topPerformers.map((item) => (
                <div className="performer-item" key={item.name}>
                  <div className="performer-avatar" aria-hidden="true">{item.name.slice(0, 2).toUpperCase()}</div>
                  <div className="performer-copy">
                    <strong>{item.name}</strong>
                    <small>{item.badge}</small>
                  </div>
                  <span>{item.score}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function getStatIcon(icon: string) {
  const icons: Record<string, React.ReactNode> = {
    students: <GraduationCap />,
    teachers: <UsersRound />,
    classes: <BookOpen />,
    attendance: <CalendarDays />,
    assignments: <ClipboardList />,
    results: <BarChart3 />,
  };
  return icons[icon] ?? <BarChart3 />;
}

function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countAttendanceStatus(records: AttendanceRecord[], status: string) {
  const expectedStatus = status.toUpperCase();
  return records.filter(
    (record) => record.status.trim().toUpperCase() === expectedStatus,
  ).length;
}

function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password to continue.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const authenticatedUser = await login({ username: username.trim(), password });
      navigate(roleRoutes[authenticatedUser.role], { replace: true });
    } catch (submitError) {
      if (axios.isAxiosError(submitError)) {
        const message = submitError.response?.data?.message;
        setError(
          typeof message === "string"
            ? message
            : submitError.response?.status === 400
              ? "Invalid username or password."
              : "Unable to reach the server. Please try again.",
        );
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-panel-content">
          <div className="school-illustration" aria-hidden="true">
            <Building2 size={82} strokeWidth={1.35} />
          </div>
          <p className="school-kicker">International Public School</p>
          <h1>Where bright minds build a brighter future.</h1>
          <p className="school-description">
            One connected space for teachers, students, and the whole school
            community.
          </p>
          <div className="school-stats">
            <span>
              <UsersRound size={15} />
              1000+ Students
            </span>
            <span>
              <BookOpen size={15} />
              10+ Faculty
            </span>
          </div>
        </div>
        <div className="brand-panel-footer">
          Excellence in education since 1985
        </div>
      </section>
      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-icon">
            <LockKeyhole size={25} />
          </div>
          <p className="eyebrow">School ERP account</p>
          <h2>Welcome Back</h2>
          <p className="login-intro">
            Sign in to your School ERP account
          </p>
          <form onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Username</span>
              <div className="input-wrap">
                <span className="input-prefix">@</span>
                <input
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  type="text"
                  value={username}
                />
              </div>
            </label>
            <label className="form-field">
              <span>Password</span>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={16} />
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                />
              </div>
            </label>
            <div className="form-options">
              <label className="remember-option">
                <input
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Remember me</span>
              </label>
              <button className="forgot-link" type="button">
                Forgot password?
              </button>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing In..." : "Sign In"} <ArrowRight size={18} />
            </button>
          </form>
          <p className="support-copy">
            Need help? Contact IT support at{" "}
            <a href="mailto:support@school.com">support@school.com</a>
          </p>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          +12 This Week <b>↗</b>
        </small>
      </div>
    </article>
  );
}
export default App;
