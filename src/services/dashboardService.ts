import axios from "axios";
import axiosClient from "../API/axiosClient";
import type { FeeCollection } from "../types/dashboard";
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

async function loadDashboardResource<T>(
  resource: string,
  request: Promise<T>,
): Promise<T> {
  try {
    return await request;
  } catch (error) {
    const detail = axios.isAxiosError(error)
      ? error.response?.status
        ? `HTTP ${error.response.status}`
        : error.message
      : error instanceof Error
        ? error.message
        : "Unknown error";
    throw new Error(`Unable to load ${resource}: ${detail}.`, { cause: error });
  }
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [
    studentsResponse,
    teachersResponse,
    academicYearsResponse,
    standardsResponse,
  ] = await Promise.all([
    loadDashboardResource("students", getAllStudents()),
    loadDashboardResource("teachers", getAllTeachers()),
    loadDashboardResource("academic years", getAcademicYears()),
    loadDashboardResource("standards", getStandards()),
  ]);
  const activeAcademicYear = academicYearsResponse.data.find(
    (academicYear) => academicYear.active,
  );

  const classSections = activeAcademicYear
    ? await Promise.all(
        standardsResponse.data.map((standard) =>
          loadDashboardResource(
            `class sections for ${standard.standardName}`,
            getClassSections(activeAcademicYear.id, standard.id),
          ),
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

export async function getFeeCollection(month: string) {
  const response = await axiosClient.get<FeeCollection[]>(
    "/dashboard/fee-collection",
    { params: { month } },
  );
  return response.data;
}
