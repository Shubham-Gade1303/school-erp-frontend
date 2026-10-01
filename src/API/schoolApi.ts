import axiosClient from "./axiosClient";
import type {
  SchoolInformationRequest,
  SchoolInformationResponse,
} from "../types/api";

export const getAllSchools = () =>
  axiosClient.get<SchoolInformationResponse[]>("/school");

export const getSchoolById = (id: number) =>
  axiosClient.get<SchoolInformationResponse>(`/school/${id}`);

export const createSchool = (data: SchoolInformationRequest) =>
  axiosClient.post<SchoolInformationResponse>("/school", data);

export const updateSchool = (id: number, data: SchoolInformationRequest) =>
  axiosClient.put<SchoolInformationResponse>(`/school/${id}`, data);

export const deleteSchool = (id: number) => axiosClient.delete(`/school/${id}`);