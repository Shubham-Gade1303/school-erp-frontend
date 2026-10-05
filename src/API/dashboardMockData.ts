import type { DashboardData, UserRole } from "../types/api";

const commonActivity = [
  {
    title: "John Doe",
    detail: "UI/UX Design Assignment",
    meta: "01:09 am",
    tone: "success" as const,
  },
  {
    title: "Flores, Juanita",
    detail: "Web Development Assignment",
    meta: "02:10 pm",
    tone: "warning" as const,
  },
  {
    title: "You created a new assignment",
    detail: "SEO Assignment",
    meta: "08:20 pm",
    tone: "assignment" as const,
  },
  {
    title: "Miles, Esther",
    detail: "Content Creator Assignment",
    meta: "01:34 pm",
    tone: "success" as const,
  },
];

const roleDashboardData: Record<UserRole, DashboardData> = {
  ADMIN: {
    stats: [
      { label: "Total Students", value: "273", tone: "cyan", icon: "students" },
      {
        label: "Total Teachers",
        value: "42",
        tone: "purple",
        icon: "teachers",
      },
      { label: "Total Classes", value: "18", tone: "orange", icon: "classes" },
      { label: "Attendance", value: "94%", tone: "red", icon: "attendance" },
    ],
    sections: [
      {
        title: "Student Enrollment",
        action: "View Report",
        type: "list",
        items: [
          {
            title: "New admissions",
            detail: "This academic year",
            meta: "+18",
          },
          {
            title: "Pending applications",
            detail: "Awaiting review",
            meta: "07",
          },
        ],
      },
      {
        title: "Attendance Overview",
        action: "View Details",
        type: "list",
        items: [
          {
            title: "Today's attendance",
            detail: "Across all classes",
            meta: "94%",
          },
          {
            title: "Absent students",
            detail: "Requires follow-up",
            meta: "16",
          },
        ],
      },
      {
        title: "Recent Students",
        action: "View All",
        type: "activity",
        items: commonActivity.slice(0, 3),
      },
      {
        title: "Recent Activities",
        action: "View All",
        type: "activity",
        items: commonActivity,
      },
      {
        title: "Upcoming Events",
        action: "View Calendar",
        type: "list",
        items: [
          {
            title: "Parent-teacher meeting",
            detail: "Main auditorium",
            meta: "Tomorrow",
          },
          { title: "Term examination", detail: "All classes", meta: "12 Jun" },
        ],
      },
    ],
  },
  PRINCIPAL: {
    stats: [
      { label: "Total Students", value: "273", tone: "cyan", icon: "students" },
      {
        label: "Total Teachers",
        value: "42",
        tone: "purple",
        icon: "teachers",
      },
      { label: "Attendance", value: "94%", tone: "red", icon: "attendance" },
      {
        label: "Average Result",
        value: "78%",
        tone: "orange",
        icon: "results",
      },
    ],
    sections: [
      {
        title: "Attendance Trend",
        action: "View Details",
        type: "list",
        items: [
          { title: "This week", detail: "School average", meta: "94%" },
          { title: "Last week", detail: "School average", meta: "92%" },
        ],
      },
      {
        title: "Academic Performance",
        action: "View Report",
        type: "list",
        items: [
          { title: "Average result", detail: "All subjects", meta: "78%" },
          { title: "Top performing class", detail: "Class 10 A", meta: "86%" },
        ],
      },
      {
        title: "Class Performance",
        action: "View Classes",
        type: "list",
        items: [
          { title: "Class 10 A", detail: "Average attendance", meta: "96%" },
          { title: "Class 9 B", detail: "Average attendance", meta: "93%" },
        ],
      },
      {
        title: "Recent Activities",
        action: "View All",
        type: "activity",
        items: commonActivity,
      },
      {
        title: "Upcoming Events",
        action: "View Calendar",
        type: "list",
        items: [
          {
            title: "Staff meeting",
            detail: "Conference room",
            meta: "Today, 04:00 pm",
          },
          { title: "School assembly", detail: "Main ground", meta: "Monday" },
        ],
      },
    ],
  },
  TEACHER: {
    stats: [
      { label: "My Classes", value: "12", tone: "purple", icon: "classes" },
      { label: "My Students", value: "273", tone: "cyan", icon: "students" },
      {
        label: "Assignments",
        value: "56",
        tone: "orange",
        icon: "assignments",
      },
      { label: "Attendance", value: "94%", tone: "red", icon: "attendance" },
    ],
    sections: [
      {
        title: "Recent Activity",
        action: "View All",
        type: "activity",
        items: commonActivity,
      },
      {
        title: "Upcoming Classes",
        action: "View Calendar",
        type: "list",
        items: [
          { title: "UI/UX Design", detail: "Class 01", meta: "09:30 PM" },
          {
            title: "Front-end Development",
            detail: "Class 02",
            meta: "10:15 PM",
          },
          {
            title: "Back-end Development",
            detail: "Class 03",
            meta: "11:00 PM",
          },
        ],
      },
      {
        title: "Today's Schedule",
        action: "View Calendar",
        type: "list",
        items: [
          { title: "Project Management", detail: "Class 04", meta: "12:00 PM" },
          { title: "Office hours", detail: "Staff room", meta: "02:00 PM" },
        ],
      },
      {
        title: "Assignment Status",
        action: "View Assignments",
        type: "list",
        items: [
          { title: "Submitted", detail: "This week", meta: "38" },
          { title: "Pending review", detail: "Needs attention", meta: "18" },
        ],
      },
    ],
  },
};

export function getDashboardMockData(role: UserRole): DashboardData {
  return roleDashboardData[role];
};
