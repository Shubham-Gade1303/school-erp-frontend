import axiosClient from "../API/axiosClient";
import type {
  AttendanceToday,
  DashboardSummary,
  FeeCollection,
  SchedulePeriod,
} from "../types/dashboard";

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
