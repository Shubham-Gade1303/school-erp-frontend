export type ExamStatus =
  | "UPCOMING"
  | "ONGOING"
  | "RESULTS_PENDING"
  | "COMPLETED";

export interface ExamRecord {
  id: number;
  examName: string;
  academicYearId: number;
  academicYear: string;
  standardId: number;
  standardName: string;
  startDate: string;
  endDate: string;
  active: boolean;
  status?: ExamStatus | string;
  resultsEntered?: boolean;
}

export interface ExamRequest {
  examName: string;
  academicYearId: number;
  standardId: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface ExamFilters {
  academicYearId?: number;
  standardId?: number;
  examId?: number;
}

export interface ExamStats {
  total: number;
  upcoming: number;
  completed: number;
  resultsPending: number;
}

export interface ExamClassOption {
  standardId: number;
  label: string;
  academicYearId: number;
  academicYear: string;
}

export interface ExamValidationError {
  message: string;
  fieldErrors: Record<string, string>;
}
