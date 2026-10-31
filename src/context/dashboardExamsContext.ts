import { createContext } from "react";
import type { ExamRecord } from "../types/exam";

export interface DashboardExamsState {
  exams: ExamRecord[] | null;
  isLoading: boolean;
  error: string | null;
  loadExams: () => Promise<void>;
  retryExams: () => Promise<void>;
}

export const DashboardExamsContext =
  createContext<DashboardExamsState | null>(null);
