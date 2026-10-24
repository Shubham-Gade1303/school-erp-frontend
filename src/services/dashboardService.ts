import axiosClient from "../API/axiosClient";
import type {
  AttendanceToday,
  DashboardSummary,
  FeeCollection,
  SchedulePeriod,
} from "../types/dashboard";
import {
  getAcademicYears,
  getClassSections,
  getStandards,
} from "./admissionService";
import { getAllStudents } from "./studentService";
import { getAllTeachers } from "./teacherService";

export interface DashboardCounts {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [studentsResponse, teachersResponse, academicYearsResponse, standardsResponse] =
    await Promise.all([
      getAllStudents(),
      getAllTeachers(),
      getAcademicYears(),
      getStandards(),
    ]);
  const activeAcademicYear = academicYearsResponse.data.find(
    (academicYear) => academicYear.active,
  );

  const classSections = activeAcademicYear
    ? await Promise.all(
        standardsResponse.data.map((standard) =>
          getClassSections(activeAcademicYear.id, standard.id),
        ),
      )
    : [];

  return {
    totalStudents: studentsResponse.data.length,
    totalTeachers: teachersResponse.data.length,
    totalClasses: classSections.reduce(
      (total, response) =>
        total +
        response.data.filter(
          (section) => !("active" in section) || section.active !== false,
        ).length,
      0,
    ),
  };
}

export async function getDashboardSummary() {
  const response = await axiosClient.get<DashboardSummary>("/dashboard/summary");
  return response.data;
}

export async function getAttendanceToday() {
  const response = await axiosClient.get<AttendanceToday>(
    "/dashboard/attendance-today",
  );
  return response.data;
}

export async function getFeeCollection(month: string) {
  const response = await axiosClient.get<FeeCollection[]>(
    "/dashboard/fee-collection",
    { params: { month } },
  );
  return response.data;
}

export async function getTodaysSchedule() {
  const response = await axiosClient.get<SchedulePeriod[]>(
    "/dashboard/schedule/today",
  );
  return response.data;
}

export async function getActiveAcademicYear() {
  const response = await axiosClient.get<string>("/dashboard/academic-year");
  return response.data;
}
