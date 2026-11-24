import type { ClassSection, AcademicYear, Standard } from "./admission";
import type { SubjectResponse } from "./subject";
import type { ExamRecord } from "./exam";

export type StudentRecordType =
  | "marks"
  | "performance"
  | "activities"
  | "discipline"
  | "promotion";

export interface StudentMarksRecord {
  id: number;
  studentId: number;
  admissionNumber?: string;
  studentName?: string;
  examId: number;
  examName?: string;
  subjectId: number;
  subjectName?: string;
  marksObtained: number;
  maximumMarks?: number;
  totalMarks?: number;
  remarks?: string;
}

export interface StudentMarksRequest {
  studentId: number;
  examId: number;
  subjectId: number;
  marksObtained: number;
  maximumMarks: number;
  remarks?: string;
}

export interface StudentPerformanceRecord {
  id: number;
  studentId: number;
  admissionNumber?: string;
  studentName?: string;
  examId: number;
  examName?: string;
  totalMarks?: number;
  marksObtained?: number;
  percentage?: number;
  grade?: string;
  resultStatus?: string;
}

export interface StudentPerformanceRequest {
  studentId: number;
  examId: number;
}

export interface ActivityOption {
  id: number;
  activityName?: string;
  name?: string;
  activityType?: string;
  active?: boolean;
}

export interface StudentActivityRecord {
  id: number;
  studentId: number;
  studentName?: string;
  activityId: number;
  activityName?: string;
  participationDate: string;
  role?: string;
  result?: string;
  position?: string;
  remarks?: string;
}

export interface StudentActivityRequest {
  studentId: number;
  activityId: number;
  participationDate: string;
  role: string;
  result: string;
  position: string;
  remarks: string;
}

export interface StudentDisciplineRecord {
  id: number;
  studentId: number;
  studentName?: string;
  incidentDate: string;
  incidentType: string;
  description: string;
  actionTaken: string;
  remarks?: string;
  resolved: boolean;
  status?: string;
}

export interface StudentDisciplineRequest {
  studentId: number;
  incidentDate: string;
  incidentType: string;
  description: string;
  actionTaken: string;
  remarks: string;
  resolved: boolean;
}

export interface StudentPromotionRecord {
  id: number;
  studentId: number;
  studentName?: string;
  promotionDate?: string;
  fromAcademicYearId?: number;
  fromAcademicYear?: string;
  fromStandardId?: number;
  fromStandard?: string;
  fromClassSectionId?: number;
  fromSection?: string;
  toAcademicYearId?: number;
  toAcademicYear?: string;
  toStandardId?: number;
  toStandard?: string;
  toClassSectionId?: number;
  toSection?: string;
  status: string;
  remarks?: string;
}

export interface StudentPromotionRequest {
  studentId: number;
  fromAcademicYearId: number;
  fromStandardId: number;
  fromClassSectionId: number;
  toAcademicYearId: number;
  toStandardId: number;
  toClassSectionId: number;
  status: string;
  remarks: string;
}

export type StudentRecord =
  | StudentMarksRecord
  | StudentPerformanceRecord
  | StudentActivityRecord
  | StudentDisciplineRecord
  | StudentPromotionRecord;

export interface StudentRecordOptions {
  exams: ExamRecord[];
  subjects: SubjectResponse[];
  activities: ActivityOption[];
  academicYears: AcademicYear[];
  standards: Standard[];
  classSections: { from: ClassSection[]; to: ClassSection[] };
}
