export interface StudentRequest {
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  classSectionId: number;
  active: boolean;
}

export interface StudentResponse {
  id: number;
  admissionNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  classSectionId: number;
  sectionName: string;
  standardName: string;
  academicYear: string;
  active: boolean;
}
