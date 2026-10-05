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
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/api";

type NavigationItem = { label: string; path: string; icon: typeof LayoutDashboard };

const navigationByRole: Record<UserRole, NavigationItem[]> = {
  ADMIN: ([
    ["Dashboard", "dashboard", LayoutDashboard],
    ["Admission", "admission", UserPlus],
    ["Academic Years", "academic-years", CalendarDays],
    ["Timetable", "timetable", CalendarDays],
    ["Students", "students", UsersRound],
    ["Teachers", "teachers", UsersRound],
    ["Classes", "classes", BookOpen],
    ["Subjects", "subjects", BookOpen],
    ["Attendance", "attendance", ClipboardList],
    ["Exams", "exams", ClipboardList],
    ["Results", "results", BarChart3],
    ["Fees", "fees", ShieldCheck],
    ["Users", "users", UsersRound],
    ["Roles", "roles", ShieldCheck],
    ["Reports", "reports", Video],
    ["Settings", "settings", Settings],
  ] as const).map(([label, path, icon]) => ({ label, path: `/admin/${path}`, icon })),
  PRINCIPAL: ([
    ["Dashboard", "dashboard", LayoutDashboard],
    ["Timetable", "timetable", CalendarDays],
    ["Students", "students", UsersRound],
    ["Teachers", "teachers", UsersRound],
    ["Classes", "classes", BookOpen],
    ["Subjects", "subjects", BookOpen],
    ["Attendance", "attendance", ClipboardList],
    ["Exams", "exams", ClipboardList],
    ["Results", "results", BarChart3],
    ["Reports", "reports", Video],
    ["Settings", "settings", Settings],
  ] as const).map(([label, path, icon]) => ({ label, path: `/principal/${path}`, icon })),
  TEACHER: ([
    ["Dashboard", "dashboard", LayoutDashboard],
    ["Timetable", "timetable", CalendarDays],
    ["My Classes", "classes", BookOpen],
    ["My Students", "students", UsersRound],
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
  const [search, setSearch] = useState("");

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

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
          <label className="search-box">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Classes, assignment, student......."
            />
          </label>
          <div className="top-actions">
            <button aria-label="Notifications" type="button"><Bell size={17} /></button>
            <button className="message-button" aria-label="Messages" type="button"><MessageCircle size={17} /><i /></button>
            <button aria-label="Help" type="button"><CircleHelp size={17} /></button>
          </div>
          <div className="profile">
            <div className="avatar profile-avatar">{getInitials(user.username)}</div>
            <span><strong>{user.username}</strong><small>{user.role}</small></span>
            <ChevronRight size={14} />
          </div>
        </header>
        <Outlet context={{ search }} />
      </section>
    </main>
  );
}

function getInitials(username: string) {
  return username.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}