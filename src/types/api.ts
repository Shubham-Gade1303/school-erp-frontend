export type UserRole = "ADMIN" | "PRINCIPAL" | "TEACHER";

import type { TeacherResponse } from "./teacher";

export type { TeacherRequest, TeacherResponse } from "./teacher";
export type { StudentRequest, StudentResponse } from "./student";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
}

export interface AuthUser {
  username: string;
  role: UserRole;
}

export interface TeacherDashboardRecord extends TeacherResponse {
  [key: string]: unknown;
}

export type DashboardSectionType = "activity" | "list";

export interface DashboardStat {
  label: string;
  value: string;
  tone: "purple" | "cyan" | "orange" | "red";
  icon: string;
}

export interface DashboardItem {
  title: string;
  detail: string;
  meta: string;
  tone?: "success" | "warning" | "assignment";
}

export interface DashboardSection {
  title: string;
  action: string;
  type: DashboardSectionType;
  items: DashboardItem[];
}

export interface DashboardData {
  stats: DashboardStat[];
  sections: DashboardSection[];
}

export interface SchoolInformationRequest {
  schoolName: string;
  schoolCode: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  principalName?: string;
  establishedDate?: string;
}

export interface SchoolInformationResponse extends SchoolInformationRequest {
  id: number;
  createdAt: string;
  updatedAt: string;
}

