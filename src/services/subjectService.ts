import axiosClient from "../API/axiosClient";
import type { SubjectRequest, SubjectResponse } from "../types/subject";

const subjectsPath = "/subjects";

export function getAllSubjects() {
  return axiosClient.get<SubjectResponse[]>(subjectsPath);
}

export function getSubjectById(id: number) {
  return axiosClient.get<SubjectResponse>(`${subjectsPath}/${id}`);
}

export function createSubject(request: SubjectRequest) {
  return axiosClient.post<SubjectResponse>(subjectsPath, request);
}

export function updateSubject(id: number, request: SubjectRequest) {
  return axiosClient.put<SubjectResponse>(`${subjectsPath}/${id}`, request);
}

export function deleteSubject(id: number) {
  return axiosClient.delete<void>(`${subjectsPath}/${id}`);
}
