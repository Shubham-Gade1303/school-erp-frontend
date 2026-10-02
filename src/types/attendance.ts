export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceRecord {
  id: number;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  attendanceDate: string;
  status: string;
  remarks: string;
}

export interface AttendanceRequest {
  studentId: number;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks: string;
}