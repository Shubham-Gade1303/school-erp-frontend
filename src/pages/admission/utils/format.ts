import axios from "axios";
import type { StudentResponse } from "../../../types/student";

export function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("en-GB").format(date);
}

export function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number.isFinite(value) ? value : 0);
}

export function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray(data.content)
  ) {
    return data.content as T[];
  }
  return [];
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }
  const data: unknown = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const response = data as Record<string, unknown>;
    const message = response.message ?? response.error ?? response.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (!error.response) return "Unable to connect to the server.";
  return fallback;
}

export function getStudentName(student: StudentResponse) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}
