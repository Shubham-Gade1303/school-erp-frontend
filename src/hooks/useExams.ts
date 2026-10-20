import { useEffect, useMemo, useState } from "react";
import {
  getAcademicYears,
  getExams,
  getStandards,
  getStats,
} from "../API/examApi";
import type { AcademicYear, Standard } from "../types/admission";
import type {
  ExamFilters,
  ExamRecord,
  ExamStats,
} from "../types/exam";
import { normalizeList } from "../pages/admission/utils/format";

interface ExamLookups {
  academicYears: AcademicYear[];
  standards: Standard[];
  error: string;
}

interface ExamData {
  exams: ExamRecord[];
  stats: ExamStats | null;
  error: string;
  loadedKey: string | null;
}

const emptyStats: ExamStats = {
  total: 0,
  upcoming: 0,
  completed: 0,
  resultsPending: 0,
};

export function useExamLookups() {
  const [lookups, setLookups] = useState<ExamLookups>({
    academicYears: [],
    standards: [],
    error: "",
  });
  const [referencesLoaded, setReferencesLoaded] = useState(false);

  useEffect(() => {
    let current = true;
    Promise.all([getAcademicYears(), getStandards()])
      .then(([yearsResponse, standardsResponse]) => {
        if (!current) return;
        setLookups({
          academicYears: normalizeList<AcademicYear>(yearsResponse.data),
          standards: normalizeList<Standard>(standardsResponse.data),
          error: "",
        });
        setReferencesLoaded(true);
      })
      .catch((error: unknown) => {
        if (!current) return;
        setLookups((existing) => ({
          ...existing,
          error: getErrorMessage(error, "Unable to load exam filters."),
        }));
      });

    return () => {
      current = false;
    };
  }, []);

  const classes = useMemo(
    () => {
      return lookups.academicYears
        .flatMap((year) =>
          lookups.standards.map((standard) => ({
            standardId: standard.id,
            label: standard.standardName,
            academicYearId: year.id,
            academicYear: year.academicYear,
          })),
        )
        .sort((first, second) =>
          first.label.localeCompare(second.label, undefined, {
            numeric: true,
          }),
        );
    },
    [lookups.academicYears, lookups.standards],
  );

  return {
    ...lookups,
    classes,
    loading: !referencesLoaded && !lookups.error,
  };
}

export function useExamData(filters: ExamFilters, refreshKey: number) {
  const [data, setData] = useState<ExamData>({
    exams: [],
    stats: null,
    error: "",
    loadedKey: null,
  });
  const { academicYearId, standardId, examId } = filters;
  const requestKey = `${academicYearId ?? ""}:${standardId ?? ""}:${examId ?? ""}:${refreshKey}`;

  useEffect(() => {
    let current = true;
    const requestFilters = { academicYearId, standardId, examId };
    Promise.all([getExams(requestFilters), getStats(requestFilters)])
      .then(([examsResponse, statsResponse]) => {
        if (!current) return;
        setData({
          exams: normalizeList<ExamRecord>(examsResponse.data),
          stats: statsResponse.data,
          error: "",
          loadedKey: requestKey,
        });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setData((existing) => ({
          ...existing,
          error: getErrorMessage(error, "Unable to load examinations."),
          loadedKey: requestKey,
        }));
      });

    return () => {
      current = false;
    };
  }, [
    academicYearId,
    standardId,
    examId,
    requestKey,
    refreshKey,
  ]);

  return {
    ...data,
    stats: data.stats ?? emptyStats,
    loading: data.loadedKey !== requestKey,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const responseData = error.response.data;
    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }
    if (responseData && typeof responseData === "object") {
      const message = "message" in responseData ? responseData.message : null;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
