import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  GraduationCap,
  Mail,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { loadTeacherRecord } from "../../API/teacherDashboardService";
import type { AuthUser, TeacherDashboardRecord } from "../../types/api";

type TeacherDashboardContentProps = {
  user: AuthUser;
  onNavigate: (path: string) => void;
};

export function TeacherDashboardContent({
  user,
  onNavigate,
}: TeacherDashboardContentProps) {
  const [teacher, setTeacher] = useState<TeacherDashboardRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    loadTeacherRecord(user.username)
      .then((record) => {
        if (isCurrent) setTeacher(record);
      })
      .catch(() => {
        if (isCurrent) setError("Unable to load your teacher profile.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [user.username]);

  const firstName = user.username.trim().split(/\s+/)[0] || "there";

  return (
    <>
      <div className="teacher-welcome">
        <div>
          <p className="eyebrow">Teacher workspace</p>
          <h1>Good Morning, {firstName}</h1>
          <p>Here's your teaching overview for today.</p>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <TeacherProfileCard teacher={teacher} username={user.username} isLoading={isLoading} />
      <TeacherStats teacher={teacher} isLoading={isLoading} />
      <div className="teacher-dashboard-grid">
        <TeachingAssignments teacher={teacher} isLoading={isLoading} />
        <AttendanceOverview onNavigate={onNavigate} />
        <TodaysClasses onNavigate={onNavigate} />
        <AssignmentOverview onNavigate={onNavigate} />
        <RecentActivity />
      </div>
    </>
  );
}

function TeacherProfileCard({
  teacher,
  username,
  isLoading,
}: {
  teacher: TeacherDashboardRecord | null;
  username: string;
  isLoading: boolean;
}) {
  return (
    <section className="teacher-profile-card panel">
      <div className="teacher-profile-identity">
        <div className="avatar profile-avatar"><UserRound size={17} /></div>
        <div>
          <p className="eyebrow">Teacher profile</p>
          <h2>{isLoading ? "Loading profile..." : getField(teacher, ["fullName", "name", "username"]) || username}</h2>
          <span>{getField(teacher, ["designation", "title"])}</span>
        </div>
      </div>
      <div className="teacher-profile-details">
        <ProfileDetail icon={<GraduationCap size={15} />} label="Employee ID" value={getField(teacher, ["employeeId", "employeeCode"])} />
        <ProfileDetail icon={<Mail size={15} />} label="Email" value={getField(teacher, ["email", "emailAddress"])} />
        <ProfileDetail icon={<Phone size={15} />} label="Phone" value={getField(teacher, ["phone", "phoneNumber", "mobile"])} />
        <ProfileDetail icon={<BookOpen size={15} />} label="Department" value={getField(teacher, ["department", "departmentName"])} />
      </div>
    </section>
  );
}

function ProfileDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="teacher-profile-detail"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function TeacherStats({ teacher, isLoading }: { teacher: TeacherDashboardRecord | null; isLoading: boolean }) {
  const stats = [
    [<BookOpen key="classes" />, "My Classes", getNumber(teacher, ["classCount", "classesCount"])],
    [<UsersRound key="students" />, "My Students", getNumber(teacher, ["studentCount", "studentsCount"])],
    [<GraduationCap key="subjects" />, "My Subjects", getNumber(teacher, ["subjectCount", "subjectsCount"])],
    [<CalendarDays key="attendance" />, "Today's Attendance", getField(teacher, ["todayAttendance", "attendance"] )],
  ] as const;

  return <div className="stats-grid teacher-stats">{stats.map(([icon, label, value]) => <Stat icon={icon} label={label} value={isLoading ? "..." : value} key={label} />)}</div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="stat-card"><div className="stat-icon purple">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>Backend data</small></div></article>;
}

function TeachingAssignments({ teacher, isLoading }: { teacher: TeacherDashboardRecord | null; isLoading: boolean }) {
  const assignments = getArray(teacher, ["teachingAssignments", "assignments"]);
  return <section className="panel teacher-section assignments-section"><PanelTitle icon={<BookOpen size={17} />} title="My Teaching Assignments" /><div className="assignment-table-header"><span>Subject</span><span>Class</span><span>Section</span><span>Students</span></div>{isLoading ? <LoadingRows /> : assignments.length ? assignments.map((item, index) => <AssignmentRow item={item} key={index} />) : <EmptyState text="No teaching assignments found." />}</section>;
}

function AssignmentRow({ item }: { item: Record<string, unknown> }) {
  return <div className="assignment-table-row"><span>{getField(item, ["subject", "subjectName"])}</span><span>{getField(item, ["className", "class", "classId"])}</span><span>{getField(item, ["section", "sectionName"])}</span><span>{getField(item, ["studentCount", "students"])}</span></div>;
}

function TodaysClasses({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <section className="panel teacher-section"><PanelTitle icon={<Clock3 size={17} />} title="Today's Classes" /><EmptyState text="No class schedule is available yet." action="View My Classes" onAction={() => onNavigate("/teacher/classes")} /></section>;
}

function AttendanceOverview({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <section className="panel teacher-section"><PanelTitle icon={<CalendarDays size={17} />} title="Attendance Overview" /><div className="metric-empty"><strong>Not available</strong><span>Attendance data will appear when the teacher attendance API is connected.</span></div><button className="panel-action" onClick={() => onNavigate("/teacher/attendance")} type="button">Mark Attendance</button></section>;
}

function AssignmentOverview({ onNavigate }: { onNavigate: (path: string) => void }) {
  return <section className="panel teacher-section"><PanelTitle icon={<ClipboardList size={17} />} title="Assignment Overview" /><div className="metric-empty"><strong>Not available</strong><span>Assignment review data will appear when the assignments API is connected.</span></div><button className="panel-action" onClick={() => onNavigate("/teacher/assignments")} type="button">View Assignments</button></section>;
}

function RecentActivity() {
  return <section className="panel teacher-section"><PanelTitle icon={<BarChart3 size={17} />} title="Recent Activity" /><EmptyState text="No recent activity found." /></section>;
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="teacher-panel-title"><span>{icon}</span><h2>{title}</h2></div>;
}

function EmptyState({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  return <div className="teacher-empty-state"><p>{text}</p>{action && onAction && <button className="panel-action" onClick={onAction} type="button">{action}</button>}</div>;
}

function LoadingRows() {
  return <div className="teacher-loading-rows"><i /><i /><i /></div>;
}

function getArray(record: TeacherDashboardRecord | null, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(record?.[key])) return record[key] as Record<string, unknown>[];
  }
  return [];
}

function getNumber(record: TeacherDashboardRecord | null, keys: string[]) {
  for (const key of keys) {
    if (typeof record?.[key] === "number") return String(record[key]);
  }
  return "Not available";
}

function getField(record: TeacherDashboardRecord | Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return "Not available";
}