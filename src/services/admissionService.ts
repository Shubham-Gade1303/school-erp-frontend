import axiosClient from "../API/axiosClient";
import type {
  AcademicYear,
  AcademicYearRequest,
  AddressRecord,
  ClassSection,
  DocumentRecord,
  DocumentType,
  FeePayment,
  Standard,
  StudentAdmissionRequest,
  StudentFee,
} from "../types/admission";

export const getAcademicYears = () =>
  axiosClient.get<AcademicYear[]>("/academic-years");
export const getAcademicYearById = (id: number) =>
  axiosClient.get<AcademicYear>(`/academic-years/${id}`);
export const getActiveAcademicYear = () =>
  axiosClient.get<AcademicYear>("/academic-years/active");
export const createAcademicYear = (data: AcademicYearRequest) =>
  axiosClient.post<AcademicYear>("/academic-years", data);
export const updateAcademicYear = (id: number, data: AcademicYearRequest) =>
  axiosClient.put<AcademicYear>(`/academic-years/${id}`, data);
export const deleteAcademicYear = (id: number) =>
  axiosClient.delete<void>(`/academic-years/${id}`);
export const getStandards = () => axiosClient.get<Standard[]>("/standards");
export const getClassSections = (academicYearId: number, standardId: number) =>
  axiosClient.get<ClassSection[]>(
    `/class-sections/academic-year/${academicYearId}/standard/${standardId}`,
  );
export const getStudentAddress = (studentId: number) =>
  axiosClient.get<AddressRecord>(`/student-addresses/student/${studentId}`);
export const createStudentAddress = (data: AddressRecord) =>
  axiosClient.post<AddressRecord>("/student-addresses", data);
export const updateStudentAddress = (id: number, data: AddressRecord) =>
  axiosClient.put<AddressRecord>(`/student-addresses/${id}`, data);
export const getStudentDocuments = (studentId: number) =>
  axiosClient.get<DocumentRecord[]>(`/documents/student/${studentId}`);
export const createDocument = (
  data: { studentId: number; documentType: DocumentType },
  file: File,
  onUploadProgress: (progress: number) => void,
) => {
  const formData = new FormData();
  formData.append("studentId", String(data.studentId));
  formData.append("documentType", data.documentType);
  formData.append("file", file);
  return axiosClient.post<DocumentRecord>("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (event.total) {
        onUploadProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    },
  });
};
export const updateDocument = (
  id: number,
  data: { studentId: number; documentType: DocumentType },
) =>
  axiosClient.put<DocumentRecord>(`/documents/${id}`, data);
export const replaceDocumentFile = (
  id: number,
  file: File,
  onUploadProgress: (progress: number) => void,
) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosClient.put<DocumentRecord>(
    `/documents/${id}/file`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) {
          onUploadProgress(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          );
        }
      },
    },
  );
};
export async function downloadDocumentFile(id: number, fileName: string) {
  const response = await axiosClient.get<Blob>(`/documents/${id}/download`, {
    responseType: "blob",
  });
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
export const deleteDocument = (id: number) =>
  axiosClient.delete<void>(`/documents/${id}`);
export const getStudentFees = (studentId: number, academicYearId: number) =>
  axiosClient.get<StudentFee[]>(
    `/student-fees/student/${studentId}/academic-year/${academicYearId}`,
  );
export const createStudentFee = (data: StudentFee) =>
  axiosClient.post<StudentFee>("/student-fees", data);
export const updateStudentFee = (id: number, data: StudentFee) =>
  axiosClient.put<StudentFee>(`/student-fees/${id}`, data);
export const getFeePayments = (studentFeeId: number) =>
  axiosClient.get<FeePayment[]>(`/fee-payments/student-fee/${studentFeeId}`);
export const createFeePayment = (data: FeePayment) =>
  axiosClient.post<FeePayment>("/fee-payments", data);
export const updateFeePayment = (id: number, data: FeePayment) =>
  axiosClient.put<FeePayment>(`/fee-payments/${id}`, data);
export const createStudentAdmission = (data: StudentAdmissionRequest) =>
  axiosClient.post("/student-admissions", data);
