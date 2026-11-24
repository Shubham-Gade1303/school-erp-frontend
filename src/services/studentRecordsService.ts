import axiosClient from "../API/axiosClient";
import { getClassSections, getAcademicYears, getStandards } from "./admissionService";
import { getExams } from "../API/examApi";
import { getAllSubjects } from "./subjectService";
import type {
  ActivityOption,
  StudentActivityRequest,
  StudentActivityRecord,
  StudentDisciplineRequest,
  StudentDisciplineRecord,
  StudentMarksRecord,
  StudentMarksRequest,
  StudentPerformanceRecord,
  StudentPerformanceRequest,
  StudentPromotionRecord,
  StudentPromotionRequest,
  StudentRecordType,
} from "../types/studentRecords";

const resourcePaths: Record<StudentRecordType, string> = {
  marks: "/student-marks",
  performance: "/student-performance",
  activities: "/student-activities-participation",
  discipline: "/disciplinary-records",
  promotion: "/student-promotion-history",
};

const studentRecordPaths: Record<StudentRecordType, string> = {
  marks: "/student-marks/student",
  performance: "/student-performance/student",
  activities: "/student-activities-participation/student",
  discipline: "/disciplinary-records/student",
  promotion: "/student-promotion-history/student",
};

export function getStudentRecord(type: StudentRecordType, studentId: number) {
  return axiosClient.get<unknown>(`${studentRecordPaths[type]}/${studentId}`);
}

export function createStudentMarks(request: StudentMarksRequest) {
  return axiosClient.post<StudentMarksRecord>(resourcePaths.marks, request);
}

export function updateStudentMarks(id: number, request: StudentMarksRequest) {
  return axiosClient.put<StudentMarksRecord>(`${resourcePaths.marks}/${id}`, request);
}

export function deleteStudentMarks(id: number) {
  return axiosClient.delete<void>(`${resourcePaths.marks}/${id}`);
}

export function createStudentPerformance(request: StudentPerformanceRequest) {
  return axiosClient.post<StudentPerformanceRecord>(resourcePaths.performance, request);
}

export function updateStudentPerformance(id: number, request: StudentPerformanceRequest) {
  return axiosClient.put<StudentPerformanceRecord>(`${resourcePaths.performance}/${id}`, request);
}

export function deleteStudentPerformance(id: number) {
  return axiosClient.delete<void>(`${resourcePaths.performance}/${id}`);
}

export function createStudentActivity(request: StudentActivityRequest) {
  return axiosClient.post<StudentActivityRecord>(resourcePaths.activities, request);
}

export function updateStudentActivity(id: number, request: StudentActivityRequest) {
  return axiosClient.put<StudentActivityRecord>(`${resourcePaths.activities}/${id}`, request);
}

export function deleteStudentActivity(id: number) {
  return axiosClient.delete<void>(`${resourcePaths.activities}/${id}`);
}

export function createStudentDiscipline(request: StudentDisciplineRequest) {
  return axiosClient.post<StudentDisciplineRecord>(resourcePaths.discipline, request);
}

export function updateStudentDiscipline(id: number, request: StudentDisciplineRequest) {
  return axiosClient.put<StudentDisciplineRecord>(`${resourcePaths.discipline}/${id}`, request);
}

export function deleteStudentDiscipline(id: number) {
  return axiosClient.delete<void>(`${resourcePaths.discipline}/${id}`);
}

export function createStudentPromotion(request: StudentPromotionRequest) {
  return axiosClient.post<StudentPromotionRecord>(resourcePaths.promotion, request);
}

export function updateStudentPromotion(id: number, request: StudentPromotionRequest) {
  return axiosClient.put<StudentPromotionRecord>(`${resourcePaths.promotion}/${id}`, request);
}

export function deleteStudentPromotion(id: number) {
  return axiosClient.delete<void>(`${resourcePaths.promotion}/${id}`);
}

export function getActivityOptions() {
  return axiosClient.get<ActivityOption[]>("/activities");
}

export async function getStudentRecordOptions() {
  const [exams, subjects, activities, academicYears, standards] = await Promise.allSettled([
    getExams(),
    getAllSubjects(),
    getActivityOptions(),
    getAcademicYears(),
    getStandards(),
  ]);

  return {
    exams: exams.status === "fulfilled" ? exams.value.data : [],
    subjects: subjects.status === "fulfilled" ? subjects.value.data : [],
    activities: activities.status === "fulfilled" ? activities.value.data : [],
    academicYears: academicYears.status === "fulfilled" ? academicYears.value.data : [],
    standards: standards.status === "fulfilled" ? standards.value.data : [],
  };
}

export function getRecordClassSections(academicYearId: number, standardId: number) {
  return getClassSections(academicYearId, standardId);
}
