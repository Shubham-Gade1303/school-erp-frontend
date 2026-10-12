import axiosClient from "../API/axiosClient";
import type { DocumentRecord } from "../types/admission";
import type {
  StudentActivitiesParticipation,
  StudentDisciplinaryRecord,
  StudentMarks,
  StudentPerformanceSummary,
  StudentPromotionHistory,
  StudentRequest,
  StudentResponse,
} from "../types/student";

const studentsPath = "/students";
type RequestOptions = { signal?: AbortSignal };

export function getAllStudents() {
  return axiosClient.get<StudentResponse[]>(studentsPath);
}

export function getStudentById(id: number, options?: RequestOptions) {
  return axiosClient.get<StudentResponse>(`${studentsPath}/${id}`, options);
}

export function getStudentByAdmissionNumber(admissionNumber: string) {
  return axiosClient.get<StudentResponse>(
    `${studentsPath}/admission/${admissionNumber}`,
  );
}

export function checkAdmissionNumberExists(value: string) {
  return axiosClient.get<{ exists: boolean }>(
    `${studentsPath}/admission-number/exists`,
    {
      params: { value },
    },
  );
}

export function getStudentsByClassSection(
  classSectionId: number,
  options?: RequestOptions,
) {
  return axiosClient.get<StudentResponse[]>(
    `${studentsPath}/class-section/${classSectionId}`,
    options,
  );
}

export function getStudentMarks(studentId: number, options?: RequestOptions) {
  return axiosClient.get<StudentMarks[] | { studentMarks: StudentMarks[] }>(
    `/student-marks/student/${studentId}`,
    options,
  );
}

export function getStudentPerformance(
  studentId: number,
  options?: RequestOptions,
) {
  return axiosClient.get<
    | StudentPerformanceSummary[]
    | { studentPerformance: StudentPerformanceSummary[] }
  >(`/student-performance/student/${studentId}`, options);
}

export function getStudentActivitiesParticipation(
  studentId: number,
  options?: RequestOptions,
) {
  return axiosClient.get<
    | StudentActivitiesParticipation[]
    | { studentActivitiesParticipation: StudentActivitiesParticipation[] }
  >(`/student-activities-participation/student/${studentId}`, options);
}

export function getStudentDisciplinaryRecords(
  studentId: number,
  options?: RequestOptions,
) {
  return axiosClient.get<
    | StudentDisciplinaryRecord[]
    | { disciplinaryRecords: StudentDisciplinaryRecord[] }
  >(`/disciplinary-records/student/${studentId}`, options);
}

export function getStudentPromotionHistory(
  studentId: number,
  options?: RequestOptions,
) {
  return axiosClient.get<
    | StudentPromotionHistory[]
    | { studentPromotionHistory: StudentPromotionHistory[] }
  >(`/student-promotion-history/student/${studentId}`, options);
}

export function getStudentDirectoryDocuments(
  studentId: number,
  options?: RequestOptions,
) {
  return axiosClient.get<DocumentRecord[]>(
    `/documents/student/${studentId}`,
    options,
  );
}

export function getActiveStudents() {
  return axiosClient.get<StudentResponse[]>(`${studentsPath}/active`);
}

export function createStudent(request: StudentRequest) {
  return axiosClient.post<StudentResponse>(studentsPath, request);
}

export function updateStudent(id: number, request: StudentRequest) {
  return axiosClient.put<StudentResponse>(`${studentsPath}/${id}`, request);
}

export function deleteStudent(id: number) {
  return axiosClient.delete<void>(`${studentsPath}/${id}`);
}
