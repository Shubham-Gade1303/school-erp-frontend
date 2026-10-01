import axiosClient from "../API/axiosClient";
import type { StudentRequest, StudentResponse } from "../types/student";

const studentsPath = "/students";

export function getAllStudents() {
  return axiosClient.get<StudentResponse[]>(studentsPath);
}

export function getStudentById(id: number) {
  return axiosClient.get<StudentResponse>(`${studentsPath}/${id}`);
}

export function getStudentByAdmissionNumber(admissionNumber: string) {
  return axiosClient.get<StudentResponse>(`${studentsPath}/admission/${admissionNumber}`);
}

export function getStudentsByClassSection(classSectionId: number) {
  return axiosClient.get<StudentResponse[]>(`${studentsPath}/class-section/${classSectionId}`);
}

export function getActiveStudents() {
  return axiosClient.get<StudentResponse[]>(`${studentsPath}/active`);
}

export function createStudent(request: StudentRequest) {
  return axiosClient.post<StudentResponse>(studentsPath, request);
}

export function updateStudent(id: number, request: StudentRequest) {
  return axiosClient.put<StudentResponse>(`${studentsPath}/${id}`, request);
}

export function deleteStudent(id: number) {
  return axiosClient.delete<void>(`${studentsPath}/${id}`);
}
