import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  createDocument,
  createFeePayment,
  createStudentAddress,
  createStudentAdmission,
  createStudentFee,
  deleteDocument,
  getAcademicYears,
  getActiveAcademicYear,
  getClassSections,
  getFeePayments,
  getStandards,
  updateDocument,
  updateFeePayment,
  updateStudentAddress,
  updateStudentFee,
} from "../../../services/admissionService";
import {
  checkAdmissionNumberExists,
  createStudent,
  updateStudent,
} from "../../../services/studentService";
import type {
  AcademicYear,
  AddressRecord,
  ClassSection,
  DocumentDraft,
  DocumentRecord,
  FeePayment,
  Standard,
  StudentAdmissionRequest,
  StudentFee,
} from "../../../types/admission";
import type { StudentRequest, StudentResponse } from "../../../types/student";
import { getErrorMessage, normalizeList } from "../utils/format";
import { uploadDocumentToCloudinary } from "../../../services/cloudinaryService";

export type StudentFormValues = {
  admissionNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
};

export type AdmissionWorkflow = {
  academicYearId: string;
  standardId: string;
  classSectionId: string;
  studentId: string;
  address: AddressRecord | null;
  documents: DocumentRecord[];
  studentFeeId: string;
  admissionDate: string;
  admissionStatus: string;
  remarks: string;
};

export type AdmissionSuccess = {
  identifier: string;
};

const initialWorkflow = (): AdmissionWorkflow => ({
  academicYearId: "",
  standardId: "",
  classSectionId: "",
  studentId: "",
  address: null,
  documents: [],
  studentFeeId: "",
  admissionDate: new Date().toISOString().slice(0, 10),
  admissionStatus: "PENDING",
  remarks: "",
});

const emptyAddress = (studentId: number): AddressRecord => ({
  studentId,
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
});

const emptyStudentForm = (): StudentFormValues => ({
  admissionNumber: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
});

const allowedGenders = ["Male", "Female", "Other"];
const allowedBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function getTodayDate() {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 10);
}

function getAdmissionNumberError(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined;

  const data: unknown = error.response?.data;
  let message = "";
  if (typeof data === "string") {
    message = data;
  } else if (data && typeof data === "object" && "message" in data) {
    const responseMessage = data.message;
    if (typeof responseMessage === "string") message = responseMessage;
  }

  if (error.response?.status === 409 && /admission number/i.test(message)) {
    return "Admission number already exists";
  }

  const match = message.match(/^\s*admissionNumber\s*:\s*(.+?)\s*$/i);
  return match?.[1];
}

export function useAdmissionWorkflow() {
  const [workflow, setWorkflow] = useState<AdmissionWorkflow>(initialWorkflow);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentResponse | null>(null);
  const [studentForm, setStudentForm] =
    useState<StudentFormValues>(emptyStudentForm);
  const [studentFieldErrors, setStudentFieldErrors] = useState<
    Partial<Record<keyof StudentFormValues, string>>
  >({});
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [documentsDraft, setDocumentsDraft] = useState<DocumentDraft | null>(
    null,
  );
  const [feeDraft, setFeeDraft] = useState<StudentFee | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<FeePayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<AdmissionSuccess | null>(null);

  const sectionsRequestId = useRef(0);
  const paymentsRequestId = useRef(0);
  const admissionNumberCheckTimer = useRef<
    ReturnType<typeof window.setTimeout> | undefined
  >(undefined);
  const admissionNumberCheckRequestId = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(admissionNumberCheckTimer.current);
      admissionNumberCheckRequestId.current += 1;
    },
    [],
  );

  useEffect(() => {
    let active = true;
    async function loadAcademicData() {
      setLoading(true);
      setError("");
      try {
        const [yearsResponse, standardsResponse, activeResponse] =
          await Promise.all([
            getAcademicYears(),
            getStandards(),
            getActiveAcademicYear().catch(() => ({ data: null })),
          ]);
        if (!active) return;
        const years = normalizeList<AcademicYear>(yearsResponse.data);
        setAcademicYears(years);
        setStandards(normalizeList<Standard>(standardsResponse.data));
        const activeYear = activeResponse.data;
        if (activeYear) {
          setWorkflow((current) =>
            current.academicYearId
              ? current
              : { ...current, academicYearId: String(activeYear.id) },
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            getErrorMessage(
              loadError,
              "Unable to load academic years and standards.",
            ),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadAcademicData();
    return () => {
      active = false;
    };
  }, []);

  const resetPlacementData = useCallback(() => {
    paymentsRequestId.current += 1;
    setFees([]);
    setPayments([]);
    setDocumentsDraft(null);
    setFeeDraft(null);
    setPaymentDraft(null);
    setStudentFieldErrors({});
  }, []);

  const loadSections = useCallback(
    async (academicYearId: string, standardId: string) => {
      const requestId = ++sectionsRequestId.current;
      if (!academicYearId || !standardId) {
        setSections([]);
        setSectionsLoading(false);
        return;
      }
      setSectionsLoading(true);
      setError("");
      try {
        const response = await getClassSections(
          Number(academicYearId),
          Number(standardId),
        );
        if (requestId === sectionsRequestId.current) {
          setSections(normalizeList<ClassSection>(response.data));
        }
      } catch (loadError) {
        if (requestId === sectionsRequestId.current) {
          setSections([]);
          setError(
            getErrorMessage(loadError, "Unable to load class sections."),
          );
        }
      } finally {
        if (requestId === sectionsRequestId.current) setSectionsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadSections(workflow.academicYearId, workflow.standardId);
  }, [loadSections, workflow.academicYearId, workflow.standardId]);

  useEffect(
    () => () => {
      sectionsRequestId.current += 1;
      paymentsRequestId.current += 1;
    },
    [],
  );

  const changeAcademicYear = useCallback(
    (value: string) => {
      resetPlacementData();
      setWorkflow((current) => ({
        ...current,
        academicYearId: value,
        classSectionId: "",
        studentFeeId: "",
      }));
      setSections([]);
    },
    [resetPlacementData],
  );

  const changeStandard = useCallback(
    (value: string) => {
      resetPlacementData();
      setWorkflow((current) => ({
        ...current,
        standardId: value,
        classSectionId: "",
        studentFeeId: "",
      }));
      setSections([]);
    },
    [resetPlacementData],
  );

  const selectSection = useCallback(
    (value: string) => {
      resetPlacementData();
      setWorkflow((current) => ({
        ...current,
        classSectionId: value,
        studentFeeId: "",
      }));
    },
    [resetPlacementData],
  );

  const loadPayments = useCallback(async (studentFeeId: number) => {
    const requestId = ++paymentsRequestId.current;
    try {
      const response = await getFeePayments(studentFeeId);
      if (requestId === paymentsRequestId.current) {
        setPayments(normalizeList<FeePayment>(response.data));
      }
    } catch (loadError) {
      if (requestId === paymentsRequestId.current) {
        setPayments([]);
        setError(
          getErrorMessage(loadError, "Unable to load payments for this fee."),
        );
      }
    }
  }, []);

  const updateStudentField = useCallback(
    (field: keyof StudentFormValues, value: string) => {
      if (field === "admissionNumber") {
        window.clearTimeout(admissionNumberCheckTimer.current);
        admissionNumberCheckRequestId.current += 1;
      }
      setStudentForm((current) => ({ ...current, [field]: value }));
      setStudentFieldErrors((current) => {
        if (!(field in current)) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const checkAdmissionNumber = useCallback(
    (value: string) => {
      window.clearTimeout(admissionNumberCheckTimer.current);
      const admissionNumber = value.trim();
      if (
        selectedStudent ||
        !admissionNumber ||
        admissionNumber.length > 30 ||
        !/^[A-Za-z0-9/-]+$/.test(admissionNumber)
      ) {
        return;
      }

      const requestId = ++admissionNumberCheckRequestId.current;
      admissionNumberCheckTimer.current = window.setTimeout(async () => {
        try {
          const response = await checkAdmissionNumberExists(
            admissionNumber.toUpperCase(),
          );
          if (requestId !== admissionNumberCheckRequestId.current) return;
          setStudentFieldErrors((current) => ({
            ...current,
            admissionNumber: response.data.exists
              ? "Admission number already exists"
              : current.admissionNumber === "Admission number already exists"
                ? undefined
                : current.admissionNumber,
          }));
        } catch (checkError) {
          if (requestId === admissionNumberCheckRequestId.current) {
            setError(
              getErrorMessage(checkError, "Unable to check admission number."),
            );
          }
        }
      }, 400);
    },
    [selectedStudent],
  );

  const selectFee = useCallback(
    (id: number) => {
      paymentsRequestId.current += 1;
      setWorkflow((current) => ({ ...current, studentFeeId: String(id) }));
      setPayments([]);
      setPaymentDraft(null);
      void loadPayments(id);
    },
    [loadPayments],
  );

  async function runSave(
    operation: () => Promise<void>,
    handleError?: (error: unknown) => boolean,
  ) {
    setSaving(true);
    setError("");
    try {
      await operation();
      return true;
    } catch (saveError) {
      if (!handleError?.(saveError)) {
        setError(getErrorMessage(saveError, "Unable to save this record."));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  const saveStudent = () => {
    const nextErrors: Partial<Record<keyof StudentFormValues, string>> = {};
    const admissionNumber = studentForm.admissionNumber.trim();
    if (!admissionNumber) {
      nextErrors.admissionNumber = "Admission number is required.";
    } else if (admissionNumber.length > 30) {
      nextErrors.admissionNumber = "Maximum 30 characters.";
    } else if (!/^[A-Za-z0-9/-]+$/.test(admissionNumber)) {
      nextErrors.admissionNumber =
        "Only letters, numbers, - and / are allowed.";
    }
    if (!studentForm.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (studentForm.firstName.length > 100)
      nextErrors.firstName = "First name must be 100 characters or fewer.";
    if (studentForm.middleName.length > 100)
      nextErrors.middleName = "Middle name must be 100 characters or fewer.";
    if (!studentForm.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (studentForm.lastName.length > 100)
      nextErrors.lastName = "Last name must be 100 characters or fewer.";
    if (!studentForm.dateOfBirth) {
      nextErrors.dateOfBirth = "Date of birth is required.";
    } else {
      const birthDate = new Date(`${studentForm.dateOfBirth}T00:00:00`);
      if (Number.isNaN(birthDate.getTime())) {
        nextErrors.dateOfBirth = "Enter a valid date of birth.";
      } else if (studentForm.dateOfBirth > getTodayDate()) {
        nextErrors.dateOfBirth = "Date of birth cannot be in the future.";
      }
    }
    if (!studentForm.gender) {
      nextErrors.gender = "Gender is required.";
    } else if (!allowedGenders.includes(studentForm.gender)) {
      nextErrors.gender = "Select a valid gender.";
    }
    if (
      studentForm.bloodGroup &&
      !allowedBloodGroups.includes(studentForm.bloodGroup)
    ) {
      nextErrors.bloodGroup = "Select a valid blood group.";
    }
    if (!workflow.classSectionId) {
      setError(
        "Select a division in the Academic step before saving the student.",
      );
      return Promise.resolve(false);
    }
    setStudentFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return Promise.resolve(false);

    return runSave(
      async () => {
        const request: StudentRequest = {
          admissionNumber: (selectedStudent?.admissionNumber ?? admissionNumber)
            .trim()
            .toUpperCase(),
          firstName: studentForm.firstName.trim(),
          middleName: studentForm.middleName.trim() || undefined,
          lastName: studentForm.lastName.trim(),
          dateOfBirth: studentForm.dateOfBirth,
          gender: studentForm.gender,
          bloodGroup: studentForm.bloodGroup || undefined,
          classSectionId: Number(workflow.classSectionId),
          active: true,
        };
        const response = workflow.studentId
          ? await updateStudent(Number(workflow.studentId), request)
          : await createStudent(request);
        const savedStudent = response.data;
        setSelectedStudent(savedStudent);
        setWorkflow((current) => ({
          ...current,
          studentId: String(savedStudent.id),
          address: current.address ?? emptyAddress(savedStudent.id),
        }));
        setStudentForm({
          admissionNumber: savedStudent.admissionNumber,
          firstName: savedStudent.firstName,
          middleName: savedStudent.middleName ?? "",
          lastName: savedStudent.lastName,
          dateOfBirth: savedStudent.dateOfBirth,
          gender: savedStudent.gender,
          bloodGroup: savedStudent.bloodGroup ?? "",
        });
        setStudentFieldErrors({});
      },
      (saveError) => {
        const admissionNumberError = getAdmissionNumberError(saveError);
        if (!admissionNumberError) return false;
        setStudentFieldErrors((current) => ({
          ...current,
          admissionNumber: admissionNumberError,
        }));
        return true;
      },
    );
  };

  const saveAddress = () =>
    runSave(async () => {
      const address = workflow.address;
      if (
        !address ||
        ![
          address.addressLine,
          address.city,
          address.state,
          address.postalCode,
          address.country,
        ].every((value) => value.trim())
      ) {
        throw new Error("Complete all address fields before saving.");
      }
      const response = address.id
        ? await updateStudentAddress(address.id, address)
        : await createStudentAddress(address);
      setWorkflow((current) => ({ ...current, address: response.data }));
    });

  const saveDocument = (onUploadProgress: (progress: number) => void) =>
    runSave(async () => {
      const draft = documentsDraft;
      if (!draft) return;
      if (
        !draft.documentType ||
        (!draft.id && !draft.file) ||
        (!draft.file && !draft.documentUrl)
      ) {
        throw new Error(
          "Choose a document type and upload a file before saving.",
        );
      }
      const { file, ...documentData } = draft;
      const documentUrl = file
        ? await uploadDocumentToCloudinary(file, onUploadProgress)
        : documentData.documentUrl;
      const request: DocumentRecord = {
        ...documentData,
        documentName: file?.name ?? documentData.documentName,
        documentUrl,
      };
      const response = draft.id
        ? await updateDocument(draft.id, request)
        : await createDocument(request);
      setWorkflow((current) => ({
        ...current,
        documents: current.documents.some(
          (item) => item.id === response.data.id,
        )
          ? current.documents.map((item) =>
              item.id === response.data.id ? response.data : item,
            )
          : [...current.documents, response.data],
      }));
      setDocumentsDraft(null);
    });

  const removeDocument = (document: DocumentRecord) =>
    runSave(async () => {
      if (!document.id) {
        setWorkflow((current) => ({
          ...current,
          documents: current.documents.filter((item) => item !== document),
        }));
        return;
      }
      await deleteDocument(document.id);
      setWorkflow((current) => ({
        ...current,
        documents: current.documents.filter((item) => item.id !== document.id),
      }));
    });

  const saveFee = () =>
    runSave(async () => {
      const draft = feeDraft;
      if (!draft) return;
      if (
        !draft.feeType ||
        draft.amount <= 0 ||
        !draft.dueDate ||
        !draft.status
      ) {
        throw new Error("Complete the required fee fields before saving.");
      }
      const response = draft.id
        ? await updateStudentFee(draft.id, draft)
        : await createStudentFee(draft);
      const savedFee = response.data;
      setFees((current) =>
        current.some((item) => item.id === savedFee.id)
          ? current.map((item) => (item.id === savedFee.id ? savedFee : item))
          : [...current, savedFee],
      );
      setWorkflow((current) => ({
        ...current,
        studentFeeId: String(savedFee.id ?? ""),
      }));
      setFeeDraft(null);
      setPaymentDraft(null);
      setPayments([]);
      if (savedFee.id) void loadPayments(savedFee.id);
    });

  const savePayment = () =>
    runSave(async () => {
      const draft = paymentDraft;
      if (!draft) return;
      if (!draft.paymentDate || draft.amountPaid <= 0 || !draft.paymentMethod) {
        throw new Error("Complete the required payment fields before saving.");
      }
      const fee = fees.find(
        (item) => String(item.id) === workflow.studentFeeId,
      );
      if (!fee) throw new Error("Select a fee before saving a payment.");
      const alreadyPaid = payments
        .filter((payment) => !draft.id || payment.id !== draft.id)
        .reduce((total, payment) => total + Number(payment.amountPaid || 0), 0);
      if (alreadyPaid + Number(draft.amountPaid) > Number(fee.amount)) {
        throw new Error("Payment exceeds the remaining fee balance.");
      }
      const response = draft.id
        ? await updateFeePayment(draft.id, draft)
        : await createFeePayment(draft);
      setPayments((current) =>
        current.some((item) => item.id === response.data.id)
          ? current.map((item) =>
              item.id === response.data.id ? response.data : item,
            )
          : [...current, response.data],
      );
      setPaymentDraft(null);
    });

  async function submitAdmission() {
    if (
      !workflow.studentId ||
      !workflow.academicYearId ||
      !workflow.standardId ||
      !workflow.classSectionId
    ) {
      setError("Complete the academic and student steps before submitting.");
      return false;
    }
    const request: StudentAdmissionRequest = {
      studentId: Number(workflow.studentId),
      academicYearId: Number(workflow.academicYearId),
      standardId: Number(workflow.standardId),
      classSectionId: Number(workflow.classSectionId),
      admissionDate: workflow.admissionDate,
      admissionStatus: workflow.admissionStatus,
      remarks: workflow.remarks || undefined,
    };
    setSaving(true);
    setError("");
    try {
      const response = await createStudentAdmission(request);
      const payload: unknown = response.data;
      let identifier = selectedStudent?.admissionNumber ?? workflow.studentId;
      if (payload && typeof payload === "object") {
        const result = payload as Record<string, unknown>;
        const admissionNumber =
          result.admissionNumber ?? result.admissionId ?? result.id;
        if (admissionNumber != null) identifier = String(admissionNumber);
      }
      setSuccess({ identifier });
      return true;
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Unable to submit the admission."));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function admitAnotherStudent() {
    resetPlacementData();
    setSelectedStudent(null);
    setStudentForm(emptyStudentForm());
    setDocumentsDraft(null);
    setWorkflow((current) => ({
      ...current,
      studentId: "",
      address: null,
      documents: [],
      studentFeeId: "",
      admissionDate: new Date().toISOString().slice(0, 10),
      admissionStatus: "PENDING",
      remarks: "",
    }));
    setSuccess(null);
    setError("");
  }

  return {
    workflow,
    setWorkflow,
    academicYears,
    setAcademicYears,
    standards,
    sections,
    selectedStudent,
    studentForm,
    studentFieldErrors,
    fees,
    payments,
    documentsDraft,
    setDocumentsDraft,
    feeDraft,
    setFeeDraft,
    paymentDraft,
    setPaymentDraft,
    loading,
    sectionsLoading,
    saving,
    error,
    setError,
    success,
    setSuccess,
    changeAcademicYear,
    changeStandard,
    selectSection,
    updateStudentField,
    checkAdmissionNumber,
    saveStudent,
    selectFee,
    saveAddress,
    saveDocument,
    removeDocument,
    saveFee,
    savePayment,
    submitAdmission,
    admitAnotherStudent,
    loadSections,
  };
}
