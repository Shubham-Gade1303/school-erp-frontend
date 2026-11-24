export interface StudentRequest {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  classSectionId: number;
  active: boolean;
}

export interface Student {
  id: number;
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  classSectionId: number;
  sectionName: string;
  standardName: string;
  academicYear: string;
  active: boolean;
}

export type StudentResponse = Student;

export interface StudentMarks {
  id: number;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  examId: number;
  examName: string;
  subjectId: number;
  subjectName: string;
  totalMarks: number;
  maximumMarks?: number;
  marksObtained: number;
  remarks?: string;
}

export interface StudentPerformanceSummary {
  id: number;
  studentId: number;
  admissionNumber: string;
  studentName: string;
  examId: number;
  examName: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  grade: string;
  resultStatus: string;
}

export interface StudentActivitiesParticipation {
  id: number;
  studentId: number;
  studentName: string;
  activityId: number;
  activityName: string;
  participationDate: string;
  role?: string;
  result?: string;
  position?: string;
  remarks: string;
}

export interface StudentDisciplinaryRecord {
  id: number;
  studentId: number;
  studentName: string;
  incidentType: string;
  incidentDate: string;
  description: string;
  actionTaken: string;
  remarks?: string;
  resolved: boolean;
  recordedDate?: string;
}

export interface StudentPromotionHistory {
  id: number;
  studentId: number;
  studentName: string;
  promotionDate: string;
  fromAcademicYear: string;
  fromAcademicYearId?: number;
  toAcademicYear: string;
  toAcademicYearId?: number;
  fromStandard: string;
  fromStandardId?: number;
  toStandard: string;
  toStandardId?: number;
  fromSection: string;
  fromClassSectionId?: number;
  toSection: string;
  toClassSectionId?: number;
  status: string;
  remarks: string;
}
