import axiosClient from "./axiosClient";
import type { AcademicYear, ClassSection, Standard } from "../types/admission";
import type {
  ExamFilters,
  ExamRecord,
  ExamRequest,
  ExamStats,
} from "../types/exam";

export const getExams = (filters: ExamFilters = {}) =>
  axiosClient.get<ExamRecord[]>("/exams", { params: filters });

export const getStats = (filters: ExamFilters = {}) =>
  axiosClient.get<ExamStats>("/exams/stats", { params: filters });

export const createExam = (data: ExamRequest) =>
  axiosClient.post<ExamRecord>("/exams", data);

export const updateExam = (id: number, data: ExamRequest) =>
  axiosClient.put<ExamRecord>(`/exams/${id}`, data);

export const deleteExam = (id: number) =>
  axiosClient.delete<void>(`/exams/${id}`);

export const getAcademicYears = () =>
  axiosClient.get<AcademicYear[]>("/academic-years");

export const getStandards = () => axiosClient.get<Standard[]>("/standards");

export const getClassSections = (academicYearId: number, standardId: number) =>
  axiosClient.get<ClassSection[]>(
    `/class-sections/academic-year/${academicYearId}/standard/${standardId}`,
  );
