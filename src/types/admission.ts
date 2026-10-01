export interface AcademicYear {
  id: number;
  academicYear: string;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicYearRequest {
  academicYear: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface Standard {
  id: number;
  standardName: string;
}

export interface ClassSection {
  id: number;
  sectionName: string;
  standardId?: number;
  academicYearId?: number;
}

export interface AddressRecord {
  id?: number;
  studentId: number;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface DocumentRecord {
  id?: number;
  studentId: number;
  documentType: string;
  documentName: string;
  documentUrl: string;
  uploadedDate?: string;
}

export interface StudentFee {
  id?: number;
  studentId: number;
  academicYearId: number;
  feeType: string;
  amount: number;
  dueDate: string;
  status: string;
  remarks?: string;
}

export interface FeePayment {
  id?: number;
  studentFeeId: number;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  transactionReference?: string;
  receiptNumber?: string;
  remarks?: string;
}

export interface StudentAdmissionRequest {
  studentId: number;
  academicYearId: number;
  standardId: number;
  classSectionId: number;
  admissionDate: string;
  admissionStatus: string;
  remarks?: string;
}
