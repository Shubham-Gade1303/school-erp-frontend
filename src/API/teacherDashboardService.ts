import { getAllTeachers } from "./teacherApi";
import type { TeacherDashboardRecord } from "../types/api";

const identityKeys = ["username", "email", "name", "fullName", "userName"];

export async function loadTeacherRecord(username: string) {
  const { data } = await getAllTeachers();
  const normalizedUsername = username.trim().toLowerCase();
  const teacher = data.find((record) =>
    identityKeys.some((key) =>
      String((record as TeacherDashboardRecord)[key] ?? "").trim().toLowerCase() === normalizedUsername,
    ),
  );

  return (teacher as TeacherDashboardRecord | undefined) ?? null;
}