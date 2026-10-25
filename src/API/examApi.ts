import axiosClient from "./axiosClient";
import type { AcademicYear, ClassSection, Standard } from "../types/admission";
import type {
  ExamRecord,
  ExamRequest,
} from "../types/exam";

export const getExams = () => axiosClient.get<ExamRecord[]>("/exams");

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
