import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  GraduationCap,
  LoaderCircle,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getStudentById,
  getStudentsByClassSection,
} from "../../services/studentService";
import {
  createDocument,
  createAcademicYear,
  createFeePayment,
  createStudentAddress,
  createStudentAdmission,
  createStudentFee,
  getAcademicYears,
  getActiveAcademicYear,
  getClassSections,
  getFeePayments,
  getStandards,
  getStudentAddress,
  getStudentDocuments,
  getStudentFees,
  updateDocument,
  updateAcademicYear,
  updateFeePayment,
  updateStudentAddress,
  updateStudentFee,
  deleteAcademicYear,
} from "../../services/admissionService";
import type { StudentResponse } from "../../types/student";
import type {
  AcademicYear,
  AcademicYearRequest,
  AddressRecord,
  ClassSection,
  DocumentRecord,
  FeePayment,
  Standard,
  StudentAdmissionRequest,
  StudentFee,
} from "../../types/admission";
import "./AdmissionPage.css";

const steps = [
  "Academic",
  "Student",
  "Address",
  "Documents",
  "Fees",
  "Payment",
  "Admission",
  "Review",
];
const emptyAddress = (studentId: number): AddressRecord => ({
  studentId,
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
});
const emptyDocument = (studentId: number): DocumentRecord => ({
  studentId,
  documentType: "",
  documentName: "",
  documentUrl: "",
  uploadedDate: "",
});
const emptyFee = (studentId: number, academicYearId: number): StudentFee => ({
  studentId,
  academicYearId,
  feeType: "",
  amount: 0,
  dueDate: "",
  status: "PENDING",
  remarks: "",
});
const emptyPayment = (studentFeeId: number): FeePayment => ({
  studentFeeId,
  paymentDate: "",
  amountPaid: 0,
  paymentMethod: "",
  transactionReference: "",
  receiptNumber: "",
  remarks: "",
});

type Workflow = {
  academicYearId: string;
  standardId: string;
  classSectionId: string;
  studentId: string;
  address: AddressRecord | null;
  documents: DocumentRecord[];
  studentFeeId: string;
  payment: FeePayment | null;
  admissionDate: string;
  admissionStatus: string;
  remarks: string;
};

export function AdmissionPage() {
  const { user } = useAuth();
  const canManageAcademicYears = user?.role === "ADMIN";
  const [step, setStep] = useState(0);
  const [workflow, setWorkflow] = useState<Workflow>({
    academicYearId: "",
    standardId: "",
    classSectionId: "",
    studentId: "",
    address: null,
    documents: [],
    studentFeeId: "",
    payment: null,
    admissionDate: new Date().toISOString().slice(0, 10),
    admissionStatus: "PENDING",
    remarks: "",
  });
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearEditor, setAcademicYearEditor] = useState<
    AcademicYear | null | undefined
  >(undefined);
  const [academicYearToDelete, setAcademicYearToDelete] =
    useState<AcademicYear | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentResponse | null>(null);
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [documentsDraft, setDocumentsDraft] = useState<DocumentRecord | null>(
    null,
  );
  const [feeDraft, setFeeDraft] = useState<StudentFee | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<FeePayment | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentNextAttempted, setStudentNextAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadAcademicData();
  }, []);

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
      const years = normalizeList<AcademicYear>(yearsResponse.data);
      const activeYear = activeResponse.data;
      setAcademicYears(years);
      setStandards(normalizeList<Standard>(standardsResponse.data));
      if (activeYear) {
        setWorkflow((current) =>
          current.academicYearId
            ? current
            : { ...current, academicYearId: String(activeYear.id) },
        );
      }
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          "Unable to load academic years and standards.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveAcademicYear(request: AcademicYearRequest) {
    setSaving(true);
    setError("");
    try {
      const response = academicYearEditor?.id
        ? await updateAcademicYear(academicYearEditor.id, request)
        : await createAcademicYear(request);
      setAcademicYears((current) =>
        academicYearEditor?.id
          ? current.map((year) =>
              year.id === response.data.id ? response.data : year,
            )
          : [...current, response.data],
      );
      setAcademicYearEditor(undefined);
      setNotice(
        academicYearEditor?.id
          ? "Academic year updated successfully."
          : "Academic year created successfully.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save academic year."));
    } finally {
      setSaving(false);
    }
  }

  async function removeAcademicYear() {
    if (!academicYearToDelete) return;
    setSaving(true);
    setError("");
    try {
      await deleteAcademicYear(academicYearToDelete.id);
      setAcademicYears((current) =>
        current.filter((year) => year.id !== academicYearToDelete.id),
      );
      if (workflow.academicYearId === String(academicYearToDelete.id))
        changeAcademicYear("");
      setAcademicYearToDelete(null);
      setNotice("Academic year deleted successfully.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Unable to delete academic year."));
    } finally {
      setSaving(false);
    }
  }

  async function loadSections(academicYearId: string, standardId: string) {
    if (!academicYearId || !standardId) return;
    setLoading(true);
    setSectionsLoading(true);
    setError("");
    try {
      const response = await getClassSections(
        Number(academicYearId),
        Number(standardId),
      );
      setSections(normalizeList<ClassSection>(response.data));
    } catch (loadError) {
      setSections([]);
      setError(getErrorMessage(loadError, "Unable to load class sections."));
    } finally {
      setSectionsLoading(false);
      setLoading(false);
    }
  }

  function changeAcademicYear(value: string) {
    const selectedStandardId = workflow.standardId;
    setWorkflow((current) => ({
      ...current,
      academicYearId: value,
      classSectionId: "",
      studentId: "",
      address: null,
      documents: [],
      studentFeeId: "",
      payment: null,
    }));
    setSections([]);
    setStudents([]);
    setSelectedStudent(null);
    setFees([]);
    setStudentNextAttempted(false);
    if (value && selectedStandardId) {
      void loadSections(value, selectedStandardId);
    }
  }

  function changeStandard(value: string) {
    setWorkflow((current) => ({
      ...current,
      standardId: value,
      classSectionId: "",
      studentId: "",
      address: null,
      documents: [],
      studentFeeId: "",
      payment: null,
    }));
    setSections([]);
    setStudents([]);
    setSelectedStudent(null);
    setFees([]);
    setStudentNextAttempted(false);
    void loadSections(workflow.academicYearId, value);
  }

  async function selectSection(value: string) {
    setWorkflow((current) => ({
      ...current,
      classSectionId: value,
      studentId: "",
      address: null,
      documents: [],
      studentFeeId: "",
      payment: null,
    }));
    setStudents([]);
    setSelectedStudent(null);
    setFees([]);
    setStudentNextAttempted(false);
    if (!value) return;
    setLoading(true);
    setStudentsLoading(true);
    setError("");
    try {
      const response = await getStudentsByClassSection(Number(value));
      setStudents(normalizeList<StudentResponse>(response.data));
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          "Unable to load students for this division.",
        ),
      );
    } finally {
      setStudentsLoading(false);
      setLoading(false);
    }
  }

  async function selectStudent(id: number) {
    const studentFromList = students.find((student) => student.id === id);
    if (studentFromList) {
      setSelectedStudent(studentFromList);
      setWorkflow((current) => ({ ...current, studentId: String(id) }));
    }
    setLoading(true);
    setError("");
    try {
      const [
        studentResponse,
        addressResponse,
        documentsResponse,
        feesResponse,
      ] = await Promise.all([
        getStudentById(id),
        getStudentAddress(id).catch(() => ({ data: null })),
        getStudentDocuments(id).catch(() => ({ data: [] })),
        getStudentFees(id, Number(workflow.academicYearId)).catch(() => ({
          data: [],
        })),
      ]);
      const student = studentResponse.data;
      const address = addressResponse.data;
      const documents = normalizeList<DocumentRecord>(documentsResponse.data);
      const loadedFees = normalizeList<StudentFee>(feesResponse.data);
      setSelectedStudent(student);
      setStudents((current) =>
        current.map((item) => (item.id === student.id ? student : item)),
      );
      setWorkflow((current) => ({
        ...current,
        studentId: String(student.id),
        address: address ? { ...address, studentId: id } : emptyAddress(id),
        documents,
        studentFeeId: loadedFees[0]?.id ? String(loadedFees[0].id) : "",
        payment: null,
      }));
      setFees(loadedFees);
      if (loadedFees[0]?.id) await loadPayments(loadedFees[0].id);
    } catch (loadError) {
      setError(
        getErrorMessage(loadError, "Unable to load the selected student."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments(studentFeeId: number) {
    try {
      const response = await getFeePayments(studentFeeId);
      const payment = normalizeList<FeePayment>(response.data)[0] ?? null;
      setWorkflow((current) => ({ ...current, payment }));
      setPaymentDraft(payment ?? emptyPayment(studentFeeId));
    } catch {
      setWorkflow((current) => ({ ...current, payment: null }));
    }
  }

  async function saveAddress() {
    if (!workflow.address || !isAddressValid(workflow.address))
      throw new Error("Complete all address fields before continuing.");
    const response = workflow.address.id
      ? await updateStudentAddress(workflow.address.id, workflow.address)
      : await createStudentAddress(workflow.address);
    setWorkflow((current) => ({ ...current, address: response.data }));
  }

  async function saveDocument() {
    if (!documentsDraft) return;
    if (
      !documentsDraft.documentType ||
      !documentsDraft.documentName ||
      !documentsDraft.documentUrl
    )
      throw new Error("Complete the document fields before saving.");
    const response = documentsDraft.id
      ? await updateDocument(documentsDraft.id, documentsDraft)
      : await createDocument(documentsDraft);
    setWorkflow((current) => ({
      ...current,
      documents: current.documents.some((item) => item.id === response.data.id)
        ? current.documents.map((item) =>
            item.id === response.data.id ? response.data : item,
          )
        : [...current.documents, response.data],
    }));
    setDocumentsDraft(null);
  }

  async function saveFee() {
    if (!feeDraft) return;
    if (
      !feeDraft.feeType ||
      feeDraft.amount <= 0 ||
      !feeDraft.dueDate ||
      !feeDraft.status
    )
      throw new Error("Complete the required fee fields before saving.");
    const response = feeDraft.id
      ? await updateStudentFee(feeDraft.id, feeDraft)
      : await createStudentFee(feeDraft);
    setFees((current) =>
      current.some((item) => item.id === response.data.id)
        ? current.map((item) =>
            item.id === response.data.id ? response.data : item,
          )
        : [...current, response.data],
    );
    setWorkflow((current) => ({
      ...current,
      studentFeeId: String(response.data.id ?? ""),
    }));
    setFeeDraft(null);
  }

  async function savePayment() {
    if (!paymentDraft) return;
    if (
      !paymentDraft.paymentDate ||
      paymentDraft.amountPaid <= 0 ||
      !paymentDraft.paymentMethod
    )
      throw new Error("Complete the required payment fields before saving.");
    const response = paymentDraft.id
      ? await updateFeePayment(paymentDraft.id, paymentDraft)
      : await createFeePayment(paymentDraft);
    setWorkflow((current) => ({ ...current, payment: response.data }));
    setPaymentDraft(null);
  }

  async function nextStep() {
    setError("");
    setNotice("");
    if (step === 1) {
      setStudentNextAttempted(true);
      if (!workflow.studentId || !selectedStudent) return;
    }
    try {
      if (
        step === 0 &&
        (!workflow.academicYearId ||
          !workflow.standardId ||
          !workflow.classSectionId)
      )
        throw new Error(
          "Select an academic year, standard, and class or division.",
        );
      if (step === 2) await saveAddress();
      if (step === 3) await saveDocument();
      if (step === 4) {
        if (feeDraft) await saveFee();
        else if (!fees.length)
          throw new Error("Add at least one fee before continuing.");
      }
      if (step === 5 && paymentDraft) await savePayment();
      if (step === 6 && (!workflow.admissionDate || !workflow.admissionStatus))
        throw new Error("Admission date and status are required.");
      setStep((current) => Math.min(current + 1, steps.length - 1));
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save this step."));
    }
  }

  async function submitAdmission() {
    if (
      !workflow.studentId ||
      !workflow.academicYearId ||
      !workflow.standardId ||
      !workflow.classSectionId
    ) {
      setError("Complete the academic and student steps before submitting.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const request: StudentAdmissionRequest = {
      studentId: Number(workflow.studentId),
      academicYearId: Number(workflow.academicYearId),
      standardId: Number(workflow.standardId),
      classSectionId: Number(workflow.classSectionId),
      admissionDate: workflow.admissionDate,
      admissionStatus: workflow.admissionStatus,
      remarks: workflow.remarks || undefined,
    };
    try {
      await createStudentAdmission(request);
      setNotice("Admission submitted successfully.");
      setWorkflow({
        academicYearId: "",
        standardId: "",
        classSectionId: "",
        studentId: "",
        address: null,
        documents: [],
        studentFeeId: "",
        payment: null,
        admissionDate: new Date().toISOString().slice(0, 10),
        admissionStatus: "PENDING",
        remarks: "",
      });
      setSelectedStudent(null);
      setSections([]);
      setStudents([]);
      setFees([]);
      setStep(0);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Unable to submit the admission."));
    } finally {
      setSaving(false);
    }
  }

  const visibleStudents = useMemo(
    () =>
      students.filter((student) => {
        const name = getStudentName(student).toLowerCase();
        const search = studentSearch.trim().toLowerCase();
        return (
          !search ||
          name.includes(search) ||
          student.admissionNumber.toLowerCase().includes(search)
        );
      }),
    [students, studentSearch],
  );
  const currentYear = academicYears.find(
    (year) => String(year.id) === workflow.academicYearId,
  );
  const currentStandard = standards.find(
    (standard) => String(standard.id) === workflow.standardId,
  );
  const currentSection = sections.find(
    (section) => String(section.id) === workflow.classSectionId,
  );

  return (
    <section className="admission-page">
      <div className="management-heading admission-heading">
        <div>
          <p className="eyebrow">Enrollment workflow</p>
          <h1>Admission</h1>
          <p>Create and manage student admission</p>
        </div>
        <span className="admission-count">
          <GraduationCap size={17} /> 8-step process
        </span>
      </div>
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error admission-message" role="alert">
          <CircleAlert size={15} /> {error}
        </p>
      )}
      <nav className="admission-stepper" aria-label="Admission steps">
        {steps.map((label, index) => (
          <button
            className={
              index === step
                ? "admission-step active"
                : index < step
                  ? "admission-step complete"
                  : "admission-step"
            }
            disabled={index > step}
            key={label}
            onClick={() => {
              setError("");
              setStep(index);
            }}
            type="button"
          >
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            <b>{label}</b>
          </button>
        ))}
      </nav>
      <section className="panel admission-panel">
        {loading && (
          <div className="admission-loading">
            <LoaderCircle size={15} /> Loading...
          </div>
        )}
        {step === 0 && (
          <AcademicStep
            academicYears={academicYears}
            standards={standards}
            sections={sections}
            workflow={workflow}
            canManage={canManageAcademicYears}
            onAddAcademicYear={() => setAcademicYearEditor(null)}
            onEditAcademicYear={setAcademicYearEditor}
            onDeleteAcademicYear={setAcademicYearToDelete}
            onAcademicYearChange={changeAcademicYear}
            onStandardChange={changeStandard}
            onSectionChange={(value) => void selectSection(value)}
          />
        )}
        {step === 1 && (
          <StudentStep
            standards={standards}
            sections={sections}
            workflow={workflow}
            students={visibleStudents}
            selectedStudent={selectedStudent}
            search={studentSearch}
            selectedDivision={sections.find((section) => String(section.id) === workflow.classSectionId)?.sectionName}
            sectionsLoading={sectionsLoading}
            studentsLoading={studentsLoading}
            validationAttempted={studentNextAttempted}
            onStandardChange={changeStandard}
            onSectionChange={(value) => void selectSection(value)}
            onSearch={setStudentSearch}
            onSelectStudent={(id) => void selectStudent(id)}
          />
        )}
        {step === 2 && (
          <AddressStep
            address={workflow.address}
            onChange={(address) =>
              setWorkflow((current) => ({ ...current, address }))
            }
          />
        )}
        {step === 3 && (
          <DocumentsStep
            studentId={Number(workflow.studentId)}
            documents={workflow.documents}
            draft={documentsDraft}
            onDraft={setDocumentsDraft}
          />
        )}
        {step === 4 && (
          <FeesStep
            studentId={Number(workflow.studentId)}
            academicYearId={Number(workflow.academicYearId)}
            fees={fees}
            draft={feeDraft}
            onDraft={setFeeDraft}
            selectedFeeId={workflow.studentFeeId}
            onSelectFee={(id) => {
              setWorkflow((current) => ({
                ...current,
                studentFeeId: String(id),
              }));
              void loadPayments(id);
            }}
          />
        )}
        {step === 5 && (
          <PaymentStep
            studentFeeId={Number(workflow.studentFeeId)}
            payment={workflow.payment}
            draft={paymentDraft}
            onDraft={setPaymentDraft}
          />
        )}
        {step === 6 && (
          <AdmissionStep
            workflow={workflow}
            onChange={(field, value) =>
              setWorkflow((current) => ({ ...current, [field]: value }))
            }
          />
        )}
        {step === 7 && (
          <ReviewStep
            workflow={workflow}
            student={selectedStudent}
            academicYear={currentYear}
            standard={currentStandard}
            section={currentSection}
            fees={fees}
          />
        )}
      </section>
      {academicYearEditor !== undefined && (
        <AcademicYearDialog
          academicYear={academicYearEditor}
          isSaving={saving}
          onCancel={() => setAcademicYearEditor(undefined)}
          onSubmit={(request) => void saveAcademicYear(request)}
        />
      )}
      {academicYearToDelete && (
        <DeleteAcademicYearDialog
          academicYear={academicYearToDelete}
          isDeleting={saving}
          onCancel={() => setAcademicYearToDelete(null)}
          onConfirm={() => void removeAcademicYear()}
        />
      )}
      <div className="admission-actions">
        <button
          className="secondary-button"
          disabled={step === 0 || saving || loading}
          onClick={() => setStep((current) => current - 1)}
          type="button"
        >
          <ArrowLeft size={15} /> Back
        </button>
        {step === steps.length - 1 ? (
          <button
            className="primary-button"
            disabled={saving}
            onClick={() => void submitAdmission()}
            type="button"
          >
            {saving ? "Submitting..." : "Submit Admission"} <Check size={15} />
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={saving || loading}
            onClick={() => void nextStep()}
            type="button"
          >
            Next <ArrowRight size={15} />
          </button>
        )}
      </div>
    </section>
  );
}

function AcademicStep({
  academicYears,
  standards,
  sections,
  workflow,
  canManage,
  onAddAcademicYear,
  onEditAcademicYear,
  onDeleteAcademicYear,
  onAcademicYearChange,
  onStandardChange,
  onSectionChange,
}: {
  academicYears: AcademicYear[];
  standards: Standard[];
  sections: ClassSection[];
  workflow: Workflow;
  canManage: boolean;
  onAddAcademicYear: () => void;
  onEditAcademicYear: (academicYear: AcademicYear) => void;
  onDeleteAcademicYear: (academicYear: AcademicYear) => void;
  onAcademicYearChange: (value: string) => void;
  onStandardChange: (value: string) => void;
  onSectionChange: (value: string) => void;
}) {
  return (
    <StepIntro
      icon={<GraduationCap size={19} />}
      title="Academic context"
      copy="Choose where this student will be enrolled."
    >
      <div className="admission-form-grid">
        <Field label="Standard" required>
          <select
            value={workflow.standardId}
            onChange={(event) => onStandardChange(event.target.value)}
          >
            <option value="">Select standard</option>
            {standards.map((standard) => (
              <option key={standard.id} value={standard.id}>
                {standard.standardName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Academic Year" required>
          <select
            value={workflow.academicYearId}
            onChange={(event) => onAcademicYearChange(event.target.value)}
          >
            <option value="">Select academic year</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.academicYear}{year.active ? " (Active)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Class / Division" required>
          <select
            disabled={!sections.length}
            value={workflow.classSectionId}
            onChange={(event) => onSectionChange(event.target.value)}
          >
            <option value="">
              {sections.length
                ? "Select division"
                : "Choose year and standard first"}
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.sectionName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="academic-year-management">
        <div className="academic-year-management-heading">
          <div>
            <h3>Academic years</h3>
            <p>Use real academic year records for this admission.</p>
          </div>
          {canManage && <button className="primary-button" onClick={onAddAcademicYear} type="button">+ Add Academic Year</button>}
        </div>
        {academicYears.length === 0 ? <p className="admission-empty">No academic years found.</p> : <div className="academic-year-table"><table><thead><tr><th>Academic Year</th><th>Start Date</th><th>End Date</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead><tbody>{academicYears.map((year) => <tr key={year.id}><td><strong>{year.academicYear}</strong></td><td>{formatDate(year.startDate)}</td><td>{formatDate(year.endDate)}</td><td><span className={year.active ? "status-badge active" : "status-badge inactive"}>{year.active ? "Active" : "Inactive"}</span></td>{canManage && <td><div className="academic-year-actions"><button className="text-button" onClick={() => onEditAcademicYear(year)} type="button">Edit</button><button className="text-button danger-text" onClick={() => onDeleteAcademicYear(year)} type="button">Delete</button></div></td>}</tr>)}</tbody></table></div>}
      </div>
    </StepIntro>
  );
}

function AcademicYearDialog({ academicYear, isSaving, onCancel, onSubmit }: { academicYear: AcademicYear | null; isSaving: boolean; onCancel: () => void; onSubmit: (request: AcademicYearRequest) => void }) {
  const [values, setValues] = useState<AcademicYearRequest>({ academicYear: academicYear?.academicYear ?? "", startDate: academicYear?.startDate ?? "", endDate: academicYear?.endDate ?? "", active: academicYear?.active ?? true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!/^\d{4}-\d{4}$/.test(values.academicYear)) nextErrors.academicYear = "Use the format YYYY-YYYY.";
    if (!values.startDate) nextErrors.startDate = "Start date is required.";
    if (!values.endDate) nextErrors.endDate = "End date is required.";
    if (values.startDate && values.endDate && values.endDate < values.startDate) nextErrors.endDate = "End date cannot be earlier than start date.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(values);
  }

  return <div className="dialog-backdrop" role="presentation"><section aria-labelledby="academic-year-dialog-title" className="dialog-card academic-year-dialog" role="dialog"><div className="dialog-heading"><div><p className="eyebrow">Academic setup</p><h2 id="academic-year-dialog-title">{academicYear ? "Edit Academic Year" : "Add Academic Year"}</h2></div><button aria-label="Close academic year form" onClick={onCancel} type="button">×</button></div><form className="teacher-form" onSubmit={submit}><div className="academic-year-dialog-grid"><DialogField error={errors.academicYear} label="Academic Year"><input maxLength={9} placeholder="2027-2028" value={values.academicYear} onChange={(event) => setValues((current) => ({ ...current, academicYear: event.target.value }))} /></DialogField><DialogField error={errors.startDate} label="Start Date"><input type="date" value={values.startDate} onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))} /></DialogField><DialogField error={errors.endDate} label="End Date"><input type="date" value={values.endDate} onChange={(event) => setValues((current) => ({ ...current, endDate: event.target.value }))} /></DialogField></div><label className="teacher-active-field"><input checked={values.active} onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />Active</label><div className="form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancel</button><button className="primary-button" disabled={isSaving} type="submit">{isSaving ? (academicYear ? "Saving..." : "Creating...") : academicYear ? "Save Academic Year" : "Create Academic Year"}</button></div></form></section></div>;
}

function DialogField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="teacher-field"><span>{label} *</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}

function DeleteAcademicYearDialog({ academicYear, isDeleting, onCancel, onConfirm }: { academicYear: AcademicYear; isDeleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section aria-labelledby="delete-academic-year-title" className="dialog-card compact-dialog" role="dialog"><div className="dialog-heading"><div><p className="eyebrow">Academic setup</p><h2 id="delete-academic-year-title">Delete Academic Year?</h2></div><button aria-label="Close delete confirmation" onClick={onCancel} type="button">×</button></div><p className="dialog-copy">Are you sure you want to delete academic year {academicYear.academicYear}?</p><div className="form-actions"><button className="secondary-button" onClick={onCancel} type="button">Cancel</button><button className="delete-button" disabled={isDeleting} onClick={onConfirm} type="button">{isDeleting ? "Deleting..." : "Delete"}</button></div></section></div>;
}

function StudentStep({
  standards,
  sections,
  workflow,
  students,
  selectedStudent,
  search,
  selectedDivision,
  sectionsLoading,
  studentsLoading,
  validationAttempted,
  onStandardChange,
  onSectionChange,
  onSearch,
  onSelectStudent,
}: {
  standards: Standard[];
  sections: ClassSection[];
  workflow: Workflow;
  students: StudentResponse[];
  selectedStudent: StudentResponse | null;
  search: string;
  selectedDivision?: string;
  sectionsLoading: boolean;
  studentsLoading: boolean;
  validationAttempted: boolean;
  onStandardChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSearch: (value: string) => void;
  onSelectStudent: (id: number) => void;
}) {
  return (
    <StepIntro
      icon={<UserRound size={19} />}
      title="Select an existing student"
      copy={validationAttempted && !selectedStudent ? "Please select a student before continuing." : "Select a student to continue."}
    >
      <div className="admission-subsection">
        <h3>Standards</h3>
        <div className="standard-grid">
          {standards.map((standard) => (
            <button
              className={
                String(standard.id) === workflow.standardId
                  ? "standard-card selected"
                  : "standard-card"
              }
              key={standard.id}
              onClick={() => onStandardChange(String(standard.id))}
              type="button"
            >
              <span>Std</span>
              <strong>{standard.standardName}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="admission-form-grid compact-grid">
        <Field label="Division">
          <select
            disabled={sectionsLoading || !sections.length}
            value={workflow.classSectionId}
            onChange={(event) => onSectionChange(event.target.value)}
          >
            <option value="">
              {sectionsLoading ? "Loading divisions..." : sections.length ? "Select division" : "No divisions available for this standard."}
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.sectionName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="student-picker-toolbar">
        <label className="admission-search">
          <Search size={15} />
          <input
            placeholder="Search name or admission number"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
      </div>
      {studentsLoading ? (
        <EmptyState text="Loading students..." />
      ) : students.length ? (
        <div className="admission-student-table">
          <table>
            <thead>
              <tr>
                <th>Admission No.</th>
                <th>Student Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Division</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  className={
                    selectedStudent?.id === student.id ? "selected-row" : ""
                  }
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                >
                  <td>{student.admissionNumber}</td>
                  <td>
                    <strong>{getStudentName(student)}</strong>
                  </td>
                  <td>{student.gender}</td>
                  <td>{formatDate(student.dateOfBirth)}</td>
                  <td>{student.sectionName}</td>
                  <td>
                    <span
                      className={
                        student.active
                          ? "status-badge active"
                          : "status-badge inactive"
                      }
                    >
                      {student.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          text={workflow.classSectionId
            ? `No students found in Division ${selectedDivision ?? "selected division"}.`
            : "Select a division to load existing students."}
        />
      )}
      {selectedStudent && <SelectedStudent student={selectedStudent} />}
    </StepIntro>
  );
}

function AddressStep({
  address,
  onChange,
}: {
  address: AddressRecord | null;
  onChange: (address: AddressRecord) => void;
}) {
  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Student address"
      copy="Review or complete the address belonging to the selected student."
    >
      {address ? (
        <div className="admission-form-grid">
          {(
            ["addressLine", "city", "state", "postalCode", "country"] as const
          ).map((field) => (
            <Field key={field} label={labelize(field)} required>
              <input
                value={address[field]}
                onChange={(event) =>
                  onChange({ ...address, [field]: event.target.value })
                }
              />
            </Field>
          ))}
        </div>
      ) : (
        <EmptyState text="Select a student first to load address information." />
      )}
    </StepIntro>
  );
}

function DocumentsStep({
  studentId,
  documents,
  draft,
  onDraft,
}: {
  studentId: number;
  documents: DocumentRecord[];
  draft: DocumentRecord | null;
  onDraft: (draft: DocumentRecord | null) => void;
}) {
  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Documents"
      copy="Review existing documents or add a document for this student."
    >
      <div className="record-list">
        {documents.map((document) => (
          <div
            className="admission-record"
            key={document.id ?? document.documentName}
          >
            <div>
              <strong>{document.documentName}</strong>
              <span>
                {document.documentType} · {formatDate(document.uploadedDate)}
              </span>
            </div>
            <button
              className="text-button"
              onClick={() => onDraft(document)}
              type="button"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
      {draft ? (
        <RecordEditor title={draft.id ? "Edit document" : "Add document"}>
          <div className="admission-form-grid">
            <Field label="Document Type" required>
              <input
                value={draft.documentType}
                onChange={(event) =>
                  onDraft({ ...draft, documentType: event.target.value })
                }
              />
            </Field>
            <Field label="Document Name" required>
              <input
                value={draft.documentName}
                onChange={(event) =>
                  onDraft({ ...draft, documentName: event.target.value })
                }
              />
            </Field>
            <Field label="Document URL" required>
              <input
                value={draft.documentUrl}
                onChange={(event) =>
                  onDraft({ ...draft, documentUrl: event.target.value })
                }
              />
            </Field>
          </div>
          <button
            className="secondary-button"
            onClick={() => onDraft(null)}
            type="button"
          >
            Save on Next
          </button>
        </RecordEditor>
      ) : (
        <button
          className="secondary-button"
          disabled={!studentId}
          onClick={() => onDraft(emptyDocument(studentId))}
          type="button"
        >
          Add document
        </button>
      )}
    </StepIntro>
  );
}

function FeesStep({
  studentId,
  academicYearId,
  fees,
  draft,
  selectedFeeId,
  onDraft,
  onSelectFee,
}: {
  studentId: number;
  academicYearId: number;
  fees: StudentFee[];
  draft: StudentFee | null;
  selectedFeeId: string;
  onDraft: (draft: StudentFee | null) => void;
  onSelectFee: (id: number) => void;
}) {
  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Student fees"
      copy="Review fees for the selected student and academic year."
    >
      <div className="admission-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fee Type</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Use for payment</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id}>
                <td>{fee.feeType}</td>
                <td>{formatAmount(fee.amount)}</td>
                <td>{formatDate(fee.dueDate)}</td>
                <td>{fee.status}</td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => fee.id && onSelectFee(fee.id)}
                    type="button"
                  >
                    {String(fee.id) === selectedFeeId ? "Selected" : "Select"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!fees.length && !draft && (
        <EmptyState text="No fees exist for this student and academic year. Add the first fee below." />
      )}
      {draft ? (
        <RecordEditor title={draft.id ? "Edit fee" : "Add fee"}>
          <div className="admission-form-grid">
            <Field label="Fee Type" required>
              <input
                value={draft.feeType}
                onChange={(event) =>
                  onDraft({ ...draft, feeType: event.target.value })
                }
              />
            </Field>
            <Field label="Amount" required>
              <input
                min="0"
                step="0.01"
                type="number"
                value={draft.amount || ""}
                onChange={(event) =>
                  onDraft({ ...draft, amount: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Due Date" required>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  onDraft({ ...draft, dueDate: event.target.value })
                }
              />
            </Field>
            <Field label="Status" required>
              <input
                value={draft.status}
                onChange={(event) =>
                  onDraft({ ...draft, status: event.target.value })
                }
              />
            </Field>
            <Field label="Remarks">
              <input
                value={draft.remarks ?? ""}
                onChange={(event) =>
                  onDraft({ ...draft, remarks: event.target.value })
                }
              />
            </Field>
          </div>
          <button
            className="secondary-button"
            onClick={() => onDraft(null)}
            type="button"
          >
            Save on Next
          </button>
        </RecordEditor>
      ) : (
        <button
          className="secondary-button"
          disabled={!studentId || !academicYearId}
          onClick={() => onDraft(emptyFee(studentId, academicYearId))}
          type="button"
        >
          Add fee
        </button>
      )}
    </StepIntro>
  );
}

function PaymentStep({
  studentFeeId,
  payment,
  draft,
  onDraft,
}: {
  studentFeeId: number;
  payment: FeePayment | null;
  draft: FeePayment | null;
  onDraft: (draft: FeePayment | null) => void;
}) {
  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Payment"
      copy="Review payment details connected to the selected student fee."
    >
      {payment && (
        <SummaryGrid
          items={[
            ["Payment Date", formatDate(payment.paymentDate)],
            ["Amount Paid", formatAmount(payment.amountPaid)],
            ["Payment Method", payment.paymentMethod],
            ["Transaction Reference", payment.transactionReference || "-"],
            ["Receipt Number", payment.receiptNumber || "-"],
            ["Remarks", payment.remarks || "-"],
          ]}
        />
      )}
      {draft ? (
        <RecordEditor title={draft.id ? "Edit payment" : "Add payment"}>
          <div className="admission-form-grid">
            <Field label="Payment Date" required>
              <input
                type="date"
                value={draft.paymentDate}
                onChange={(event) =>
                  onDraft({ ...draft, paymentDate: event.target.value })
                }
              />
            </Field>
            <Field label="Amount Paid" required>
              <input
                min="0"
                step="0.01"
                type="number"
                value={draft.amountPaid || ""}
                onChange={(event) =>
                  onDraft({ ...draft, amountPaid: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Payment Method" required>
              <input
                value={draft.paymentMethod}
                onChange={(event) =>
                  onDraft({ ...draft, paymentMethod: event.target.value })
                }
              />
            </Field>
            <Field label="Transaction Reference">
              <input
                value={draft.transactionReference ?? ""}
                onChange={(event) =>
                  onDraft({
                    ...draft,
                    transactionReference: event.target.value,
                  })
                }
              />
            </Field>
            <Field label="Receipt Number">
              <input
                value={draft.receiptNumber ?? ""}
                onChange={(event) =>
                  onDraft({ ...draft, receiptNumber: event.target.value })
                }
              />
            </Field>
          </div>
          <button
            className="secondary-button"
            onClick={() => onDraft(null)}
            type="button"
          >
            Save on Next
          </button>
        </RecordEditor>
      ) : (
        <button
          className="secondary-button"
          disabled={!studentFeeId}
          onClick={() => onDraft(emptyPayment(studentFeeId))}
          type="button"
        >
          {payment ? "Edit payment" : "Add payment"}
        </button>
      )}
    </StepIntro>
  );
}

function AdmissionStep({
  workflow,
  onChange,
}: {
  workflow: Workflow;
  onChange: (
    field: "admissionDate" | "admissionStatus" | "remarks",
    value: string,
  ) => void;
}) {
  return (
    <StepIntro
      icon={<GraduationCap size={19} />}
      title="Admission record"
      copy="Enter the final admission details. Academic and student values come from earlier steps."
    >
      <div className="admission-form-grid">
        <Field label="Admission Date" required>
          <input
            type="date"
            value={workflow.admissionDate}
            onChange={(event) => onChange("admissionDate", event.target.value)}
          />
        </Field>
        <Field label="Admission Status" required>
          <select
            value={workflow.admissionStatus}
            onChange={(event) =>
              onChange("admissionStatus", event.target.value)
            }
          >
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
        <Field label="Remarks">
          <textarea
            value={workflow.remarks}
            onChange={(event) => onChange("remarks", event.target.value)}
          />
        </Field>
      </div>
    </StepIntro>
  );
}

function ReviewStep({
  workflow,
  student,
  academicYear,
  standard,
  section,
  fees,
}: {
  workflow: Workflow;
  student: StudentResponse | null;
  academicYear?: AcademicYear;
  standard?: Standard;
  section?: ClassSection;
  fees: StudentFee[];
}) {
  const fee = fees.find((item) => String(item.id) === workflow.studentFeeId);
  return (
    <StepIntro
      icon={<Check size={19} />}
      title="Review admission"
      copy="Confirm the complete read-only summary before submitting."
    >
      <ReviewSection
        title="Academic"
        items={[
          ["Academic Year", academicYear?.academicYear || "-"],
          ["Standard", standard?.standardName || "-"],
          ["Division", section?.sectionName || "-"],
        ]}
      />
      <ReviewSection
        title="Student"
        items={[
          ["Admission Number", student?.admissionNumber || "-"],
          ["Student Name", student ? getStudentName(student) : "-"],
          ["Date of Birth", formatDate(student?.dateOfBirth)],
          ["Gender", student?.gender || "-"],
          ["Blood Group", student?.bloodGroup || "-"],
        ]}
      />
      <ReviewSection
        title="Address"
        items={
          workflow.address
            ? [
                ["Address Line", workflow.address.addressLine],
                ["City", workflow.address.city],
                ["State", workflow.address.state],
                ["Postal Code", workflow.address.postalCode],
                ["Country", workflow.address.country],
              ]
            : [["Address", "-"]]
        }
      />
      <ReviewSection
        title="Documents"
        items={workflow.documents.map((document) => [
          document.documentType,
          `${document.documentName} · ${formatDate(document.uploadedDate)}`,
        ])}
      />
      <ReviewSection
        title="Fees"
        items={
          fee
            ? [
                ["Fee Type", fee.feeType],
                ["Amount", formatAmount(fee.amount)],
                ["Due Date", formatDate(fee.dueDate)],
                ["Status", fee.status],
              ]
            : [["Fee", "-"]]
        }
      />
      <ReviewSection
        title="Payment"
        items={
          workflow.payment
            ? [
                ["Payment Date", formatDate(workflow.payment.paymentDate)],
                ["Amount Paid", formatAmount(workflow.payment.amountPaid)],
                ["Payment Method", workflow.payment.paymentMethod],
                [
                  "Transaction Reference",
                  workflow.payment.transactionReference || "-",
                ],
                ["Receipt Number", workflow.payment.receiptNumber || "-"],
              ]
            : [["Payment", "-"]]
        }
      />
      <ReviewSection
        title="Admission"
        items={[
          ["Admission Date", formatDate(workflow.admissionDate)],
          ["Admission Status", workflow.admissionStatus],
          ["Remarks", workflow.remarks || "-"],
        ]}
      />
    </StepIntro>
  );
}

function StepIntro({
  icon,
  title,
  copy,
  children,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <div className="admission-content">
      <div className="admission-title">
        <span>{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
function SelectedStudent({ student }: { student: StudentResponse }) {
  return (
    <div className="selected-student">
      <div className="selected-student-title">
        <strong>Selected Student</strong>
        <span className="status-badge active">
          {student.active ? "Active" : "Inactive"}
        </span>
      </div>
      <SummaryGrid
        items={[
          ["Admission Number", student.admissionNumber],
          ["Student Name", getStudentName(student)],
          ["Date of Birth", formatDate(student.dateOfBirth)],
          ["Gender", student.gender],
          ["Blood Group", student.bloodGroup || "-"],
          ["Class", student.standardName],
          ["Division", student.sectionName],
        ]}
      />
    </div>
  );
}
function ReviewSection({ title, items }: { title: string; items: string[][] }) {
  return (
    <section className="review-section">
      <h3>{title}</h3>
      <SummaryGrid items={items} />
    </section>
  );
}
function SummaryGrid({ items }: { items: string[][] }) {
  return (
    <dl className="summary-grid">
      {items.map(([label, value], index) => (
        <div key={`${label}-${index}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function RecordEditor({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="record-editor">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="admission-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
function EmptyState({ text }: { text: string }) {
  return <p className="admission-empty">{text}</p>;
}
function isAddressValid(address: AddressRecord) {
  return [
    address.addressLine,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].every((value) => value.trim());
}
function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray(data.content)
  )
    return data.content as T[];
  return [];
}
function getStudentName(student: StudentResponse) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}
function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("en-GB").format(
        new Date(`${value.slice(0, 10)}T00:00:00`),
      )
    : "-";
}
function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value || 0);
}
function labelize(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error))
    return error instanceof Error ? error.message : fallback;
  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const message = data.message ?? data.error ?? data.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (!error.response) return "Unable to connect to the server.";
  return fallback;
}
