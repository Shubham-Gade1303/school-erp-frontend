export interface DashboardSummary {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendancePercentage: number;
  studentsAddedThisWeek: number;
  teachersAddedThisWeek: number;
  classesAddedThisWeek: number;
  attendanceChangeVsLastWeek: number;
}

export interface AttendanceToday {
  present: number;
  absent: number;
  notMarked: number;
  percentage: number;
}

export interface FeeCollection {
  feeType: string;
  totalAmount: number;
  collectedAmount: number;
  percentage: number;
}

export interface SchedulePeriod {
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  sectionName: string;
  room: string | null;
  teacherName: string;
}
