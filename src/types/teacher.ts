export interface TeacherResponse {
  id: number;
  userId: number;
  username: string;
  email: string;
  fullName: string;
  employeeCode: string;
  phoneNumber: string;
  active: boolean;
}

export interface TeacherRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  employeeCode?: string;
  phoneNumber?: string;
  active: boolean;
}