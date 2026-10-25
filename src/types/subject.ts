export interface SubjectResponse {
  id: number;
  subjectName: string;
  subjectCode: string;
  subjectDescription: string | null;
  active: boolean;
}

export interface SubjectRequest {
  subjectName: string;
  subjectCode: string;
  description: string;
  active: boolean;
}
