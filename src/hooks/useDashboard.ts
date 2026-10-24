import { useCallback, useEffect, useState } from "react";
import {
  getActiveAcademicYear,
  getAttendanceToday,
  getDashboardSummary,
  getTodaysSchedule,
} from "../services/dashboardService";
import type {
  AttendanceToday,
  DashboardSummary,
  SchedulePeriod,
} from "../types/dashboard";

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

  const load = useCallback(async (request: () => Promise<T>, showLoading = true) => {
    setState((current) => ({
      ...current,
      isLoading: showLoading,
      error: null,
    }));
    try {
      const data = await request();
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: getErrorMessage(error),
      }));
    }
  }, []);

  return [state, load] as const;
}

export function useDashboard() {
  const [summary, loadSummary] = useSection<DashboardSummary>();
  const [attendance, loadAttendance] = useSection<AttendanceToday>();
  const [schedule, loadSchedule] = useSection<SchedulePeriod[]>([]);
  const [academicYear, loadAcademicYear] = useSection<string>();

  const refetchSummary = useCallback(
    (showLoading = true) => loadSummary(getDashboardSummary, showLoading),
    [loadSummary],
  );
  const refetchAttendance = useCallback(
    (showLoading = true) => loadAttendance(getAttendanceToday, showLoading),
    [loadAttendance],
  );
  const refetchSchedule = useCallback(
    (showLoading = true) => loadSchedule(getTodaysSchedule, showLoading),
    [loadSchedule],
  );
  const refetchAcademicYear = useCallback(
    (showLoading = true) =>
      loadAcademicYear(getActiveAcademicYear, showLoading),
    [loadAcademicYear],
  );

  useEffect(() => {
    void Promise.all([
      refetchSummary(),
      refetchAttendance(),
      refetchSchedule(),
      refetchAcademicYear(),
    ]);
  }, [
    refetchAcademicYear,
    refetchAttendance,
    refetchSchedule,
    refetchSummary,
  ]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void Promise.all([refetchSummary(false), refetchAttendance(false)]);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refetchAttendance, refetchSummary]);

  return {
    summary,
    attendance,
    schedule,
    academicYear,
    refetchSummary,
    refetchAttendance,
    refetchSchedule,
    refetchAcademicYear,
  };
}
