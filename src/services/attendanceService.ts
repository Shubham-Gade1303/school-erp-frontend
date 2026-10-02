import axiosClient from "../API/axiosClient";
import type { AttendanceRecord, AttendanceRequest } from "../types/attendance";

export function getAttendanceByDate(attendanceDate: string) {
  return axiosClient.get<AttendanceRecord[]>(`/attendance/date/${attendanceDate}`);
}

export function createAttendance(request: AttendanceRequest) {
  return axiosClient.post<AttendanceRecord>("/attendance", request);
}

export function updateAttendance(id: number, request: AttendanceRequest) {
  return axiosClient.put<AttendanceRecord>(`/attendance/${id}`, request);
}