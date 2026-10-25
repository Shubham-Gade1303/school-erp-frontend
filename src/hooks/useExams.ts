import { useEffect, useMemo, useState } from "react";
import {
  getAcademicYears,
  getExams,
  getStandards,
} from "../API/examApi";
import type { AcademicYear, Standard } from "../types/admission";
import type { ExamRecord } from "../types/exam";

interface ExamLookups {
  academicYears: AcademicYear[];
  standards: Standard[];
  academicYearError: string;
  standardsError: string;
  academicYearsLoadedKey: number | null;
  standardsLoadedKey: number | null;
}

interface ExamData {
  exams: ExamRecord[];
  error: string;
  loadedKey: number | null;
}

export function useExamLookups(retryKey: number) {
  const [lookups, setLookups] = useState<ExamLookups>({
    academicYears: [],
    standards: [],
    academicYearError: "",
    standardsError: "",
    academicYearsLoadedKey: null,
    standardsLoadedKey: null,
  });

  useEffect(() => {
    let current = true;
    getAcademicYears()
      .then((response) => {
        if (!current) return;
        const academicYears = readList<AcademicYear>(
          response.data,
          "academic years",
        );
        setLookups((existing) => ({
          ...existing,
          academicYears,
          academicYearError: "",
          academicYearsLoadedKey: retryKey,
        }));
      })
      .catch((error: unknown) => {
        if (!current) return;
        setLookups((existing) => ({
          ...existing,
          academicYearError: getErrorMessage(
            error,
            "Unable to load academic years.",
          ),
          academicYearsLoadedKey: retryKey,
        }));
      });

    getStandards()
      .then((response) => {
        if (!current) return;
        const standards = readList<Standard>(response.data, "standards");
        setLookups((existing) => ({
          ...existing,
          standards,
          standardsError: "",
          standardsLoadedKey: retryKey,
        }));
      })
      .catch((error: unknown) => {
        if (!current) return;
        setLookups((existing) => ({
          ...existing,
          standardsError: getErrorMessage(error, "Unable to load standards."),
          standardsLoadedKey: retryKey,
        }));
      });

    return () => {
      current = false;
    };
  }, [retryKey]);

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
    academicYearsLoading: lookups.academicYearsLoadedKey !== retryKey,
    standardsLoading: lookups.standardsLoadedKey !== retryKey,
    loading:
      lookups.academicYearsLoadedKey !== retryKey ||
      lookups.standardsLoadedKey !== retryKey,
    error: [
      lookups.academicYearsLoadedKey === retryKey
        ? lookups.academicYearError
        : "",
      lookups.standardsLoadedKey === retryKey ? lookups.standardsError : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function useExamData(refreshKey: number) {
  const [data, setData] = useState<ExamData>({
    exams: [],
    error: "",
    loadedKey: null,
  });

  useEffect(() => {
    let current = true;
    getExams()
      .then((response) => {
        if (!current) return;
        setData({
          exams: readList<ExamRecord>(response.data, "examinations"),
          error: "",
          loadedKey: refreshKey,
        });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setData((existing) => ({
          ...existing,
          error: getErrorMessage(error, "Unable to load examinations."),
          loadedKey: refreshKey,
        }));
      });

    return () => {
      current = false;
    };
  }, [refreshKey]);

  return {
    ...data,
    error: data.loadedKey === refreshKey ? data.error : "",
    loading: data.loadedKey !== refreshKey,
  };
}

function readList<T>(data: unknown, resourceName: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray(data.content)
  ) {
    return data.content as T[];
  }
  throw new Error(`The server returned an invalid ${resourceName} response.`);
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
