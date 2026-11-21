import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveAcademicYear,
  getClassSections,
  getStandards,
} from "../services/admissionService";
import { getAttendanceByDate } from "../services/attendanceService";
import { getFeeCollection } from "../services/dashboardService";
import { getAllStudents } from "../services/studentService";
import { getAllTeachers } from "../services/teacherService";
import type { AttendanceRecord } from "../types/attendance";
import type { FeeCollection } from "../types/dashboard";

export interface DashboardSectionState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Unable to load this dashboard section.";
}

function useSection<T>(initialData: T | null = null) {
  const [state, setState] = useState<DashboardSectionState<T>>({
    data: initialData,
    isLoading: true,
    error: null,
  });
  const pendingRequest = useRef<Promise<void> | null>(null);

  const load = useCallback(
    (request: () => Promise<T>, showLoading = true) => {
      if (pendingRequest.current) return pendingRequest.current;
      setState((current) => ({
        ...current,
        isLoading: showLoading,
        error: null,
      }));
      pendingRequest.current = (async () => {
        try {
          const data = await request();
          setState({ data, isLoading: false, error: null });
        } catch (error) {
          setState((current) => ({
            ...current,
            isLoading: false,
            error: getErrorMessage(error),
          }));
        } finally {
          pendingRequest.current = null;
        }
      })();
      return pendingRequest.current;
    },
    [],
  );

  return [state, load] as const;
}

export function useDashboard() {
  const [students, loadStudents] = useSection<number>();
  const [teachers, loadTeachers] = useSection<number>();
  const [classes, loadClasses] = useSection<number>();
  const [attendance, loadAttendance] = useSection<AttendanceRecord[]>();
  const [academicYear, loadAcademicYear] = useSection<string>();
  const [feeCollection, loadFeeCollection] = useSection<FeeCollection[]>();

  const refetchStudents = useCallback(
    (showLoading = true) =>
      loadStudents(async () => (await getAllStudents()).data.length, showLoading),
    [loadStudents],
  );
  const refetchTeachers = useCallback(
    (showLoading = true) =>
      loadTeachers(async () => (await getAllTeachers()).data.length, showLoading),
    [loadTeachers],
  );
  const refetchClasses = useCallback(
    (showLoading = true) =>
      loadClasses(async () => {
        const [academicYearResponse, standardsResponse] = await Promise.all([
          getActiveAcademicYear(),
          getStandards(),
        ]);
        const classSectionResponses = await Promise.all(
          standardsResponse.data.map((standard) =>
            getClassSections(academicYearResponse.data.id, standard.id),
          ),
        );
        return classSectionResponses.reduce(
          (total, response) =>
            total +
            response.data.filter(
              (section) => !("active" in section) || section.active !== false,
            ).length,
          0,
        );
      }, showLoading),
    [loadClasses],
  );
  const refetchAttendance = useCallback(
    (showLoading = true) =>
      loadAttendance(
        async () => (await getAttendanceByDate(getLocalDateString())).data,
        showLoading,
      ),
    [loadAttendance],
  );
  const refetchAcademicYear = useCallback(
    (showLoading = true) =>
      loadAcademicYear(
        async () => {
          const response = await getActiveAcademicYear();
          return response.data.academicYear;
        },
        showLoading,
      ),
    [loadAcademicYear],
  );
  const refetchFeeCollection = useCallback(
    (showLoading = true) =>
      loadFeeCollection(
        () => getFeeCollection(getLocalMonthString()),
        showLoading,
      ),
    [loadFeeCollection],
  );

  useEffect(() => {
    void Promise.all([
      refetchStudents(),
      refetchTeachers(),
      refetchClasses(),
      refetchAttendance(),
      refetchAcademicYear(),
      refetchFeeCollection(),
    ]);
  }, [
    refetchClasses,
    refetchAcademicYear,
    refetchAttendance,
    refetchFeeCollection,
    refetchStudents,
    refetchTeachers,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void Promise.all([
        refetchStudents(false),
        refetchTeachers(false),
        refetchClasses(false),
        refetchAttendance(false),
      ]);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refetchAttendance, refetchClasses, refetchStudents, refetchTeachers]);

  return {
    students,
    teachers,
    attendance,
    academicYear,
    feeCollection,
    classes,
    refetchStudents,
    refetchTeachers,
    refetchAttendance,
    refetchAcademicYear,
    refetchFeeCollection,
    refetchClasses,
  };
}

function getLocalMonthString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function getLocalDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
