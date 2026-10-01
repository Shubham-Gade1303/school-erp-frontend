import axiosClient from "../API/axiosClient";
import type { TeacherRequest, TeacherResponse } from "../types/teacher";

const teachersPath = "/teachers";

export function getAllTeachers() {
  return axiosClient.get<TeacherResponse[]>(teachersPath);
}

export function getTeacherById(id: number) {
  return axiosClient.get<TeacherResponse>(`${teachersPath}/${id}`);
}

export function getTeacherByUserId(userId: number) {
  return axiosClient.get<TeacherResponse>(`${teachersPath}/user/${userId}`);
}

export function createTeacher(request: TeacherRequest) {
  return axiosClient.post<TeacherResponse>(teachersPath, request);
}

export function updateTeacher(id: number, request: TeacherRequest) {
  const updateRequest = request.password.trim()
    ? request
    : Object.fromEntries(
        Object.entries(request).filter(([key]) => key !== "password"),
      );

  return axiosClient.put<TeacherResponse>(`${teachersPath}/${id}`, updateRequest);
}

export function deleteTeacher(id: number) {
  return axiosClient.delete<void>(`${teachersPath}/${id}`);
}