import axios from "axios";
import {
  Eye,
  GraduationCap,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import axiosClient from "../../API/axiosClient";
import { useAuth } from "../../context/AuthContext";
import {
  getAcademicYears,
  getClassSections,
  getFeePayments,
  getStandards,
  getStudentAddress,
  getStudentDocuments,
  getStudentFees,
} from "../../services/admissionService";
import {
  deleteStudent,
  getStudentsByClassSection,
  getStudentById,
  updateStudent,
} from "../../services/studentService";
import type {
  AcademicYear,
  AddressRecord,
  ClassSection,
  DocumentRecord,
  FeePayment,
  Standard,
  StudentFee,
} from "../../types/admission";
import type { StudentRequest, StudentResponse } from "../../types/student";

const PAGE_SIZE = 10;
const genders = ["Male", "Female", "Other"];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type StatusFilter = "all" | "active" | "inactive";
type StandardWithDisplayOrder = Standard & { displayOrder?: number };
type ActiveClassSection = ClassSection & { active?: boolean };

type StudentAdmissionRecord = {
  id?: number;
  studentId?: number;
  academicYear?: string;
  standardName?: string;
  sectionName?: string;
  admissionDate?: string;
  admissionStatus?: string;
  remarks?: string;
};

type StudentDetailState = {
  student: StudentResponse;
  address: AddressRecord | null;
  documents: DocumentRecord[];
  admission: StudentAdmissionRecord | null;
  fees: StudentFee[];
  paymentsByFeeId: Map<number, FeePayment[]>;
};

type StudentFormState = {
  admissionNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  classSectionId: string;
  active: boolean;
};

export function StudentsPage() {
  const { user } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(
    null,
  );
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<
    number | null
  >(null);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [isLoadingStandards, setIsLoadingStandards] = useState(true);
  const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [sectionsLoadFailed, setSectionsLoadFailed] = useState(false);
  const [studentsLoadFailed, setStudentsLoadFailed] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formStudent, setFormStudent] = useState<StudentResponse | null>(null);
  const [detailState, setDetailState] = useState<StudentDetailState | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<StudentResponse | null>(
    null,
  );
  const sectionsRequestId = useRef(0);
  const studentsRequestId = useRef(0);

  const canManage = user?.role === "ADMIN" || user?.role === "PRINCIPAL";
  const selectedStandard =
    standards.find((standard) => standard.id === selectedStandardId) ?? null;
  const selectedAcademicYear =
    academicYears.find((year) => year.id === academicYearId) ?? null;
  const selectedSection =
    sections.find((section) => section.id === selectedClassSectionId) ?? null;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ");
      const matchesSearch = `${fullName} ${student.admissionNumber}`
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesStatus =
        status === "all" ||
        (status === "active" ? student.active : !student.active);
      return matchesSearch && matchesStatus;
    });
  }, [normalizedSearch, students, status]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE),
  );
  const visibleStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const activeStudents = students.filter((student) => student.active).length;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function loadAcademicData() {
    setIsLoadingAcademicYears(true);
    setIsLoadingStandards(true);
    setError("");
    const [yearsResult, standardsResult] = await Promise.allSettled([
      getAcademicYears(),
      getStandards(),
    ]);
    const failures: string[] = [];
    let nextAcademicYearId = academicYearId;

    if (yearsResult.status === "fulfilled") {
      const years = normalizeList<AcademicYear>(yearsResult.value.data);
      setAcademicYears(years);
      const selectedYear = years.find((year) => year.id === academicYearId);
      const activeYear = years.find((year) => year.active);
      nextAcademicYearId = (selectedYear ?? activeYear ?? years[0])?.id ?? null;
      setAcademicYearId(nextAcademicYearId);
    } else {
      failures.push("Unable to load academic years.");
    }

    let hasSelectedStandard = selectedStandardId !== null;
    if (standardsResult.status === "fulfilled") {
      const nextStandards = sortStandards(
        normalizeList<StandardWithDisplayOrder>(standardsResult.value.data),
      );
      setStandards(nextStandards);
      hasSelectedStandard = nextStandards.some(
        (standard) => standard.id === selectedStandardId,
      );
      if (!hasSelectedStandard) {
        setSelectedStandardId(null);
        setSelectedClassSectionId(null);
        setSections([]);
        setStudents([]);
      }
    } else {
      failures.push("Unable to load standards.");
    }

    setError(failures.join(" "));
    setIsLoadingAcademicYears(false);
    setIsLoadingStandards(false);

    if (
      failures.length === 0 &&
      nextAcademicYearId &&
      selectedStandardId !== null &&
      hasSelectedStandard
    ) {
      await loadSectionsForStandard(selectedStandardId, nextAcademicYearId);
    }
  }

  useEffect(() => {
    void loadAcademicData();
  }, []);

  async function loadSectionsForStandard(standardId: number, yearId: number) {
    const requestId = ++sectionsRequestId.current;
    setIsLoadingSections(true);
    setSectionsLoadFailed(false);
    setError("");
    setSections([]);
    try {
      const response = await getClassSections(yearId, standardId);
      if (requestId !== sectionsRequestId.current) return;
      const nextSections = normalizeList<ActiveClassSection>(response.data)
        .filter((section) => section.active !== false);
      setSections(nextSections);
      if (
        selectedClassSectionId !== null &&
        nextSections.some((section) => section.id === selectedClassSectionId)
      ) {
        await loadStudentsForSection(selectedClassSectionId);
      } else {
        ++studentsRequestId.current;
        setSelectedClassSectionId(null);
        setStudents([]);
        setIsLoadingStudents(false);
        setStudentsLoadFailed(false);
        setSearch("");
        setStatus("all");
        setPage(1);
      }
    } catch (loadError) {
      if (requestId !== sectionsRequestId.current) return;
      setSections([]);
      setSelectedClassSectionId(null);
      ++studentsRequestId.current;
      setStudents([]);
      setIsLoadingStudents(false);
      setSectionsLoadFailed(true);
      setError(
        getErrorMessage(
          loadError,
          "Unable to load sections. Please try again.",
        ),
      );
    } finally {
      if (requestId === sectionsRequestId.current) {
        setIsLoadingSections(false);
      }
    }
  }

  async function loadStudentsForSection(classSectionId: number) {
    const requestId = ++studentsRequestId.current;
    setIsLoadingStudents(true);
    setStudentsLoadFailed(false);
    setError("");
    setNotice("");
    setStudents([]);
    try {
      const response = await getStudentsByClassSection(classSectionId);
      if (requestId !== studentsRequestId.current) return;
      setStudents(normalizeList<StudentResponse>(response.data));
    } catch (loadError) {
      if (requestId !== studentsRequestId.current) return;
      setStudents([]);
      setStudentsLoadFailed(true);
      setError(
        getErrorMessage(loadError, "Unable to load students. Please try again."),
      );
    } finally {
      if (requestId === studentsRequestId.current) {
        setIsLoadingStudents(false);
        setPage(1);
      }
    }
  }

  async function handleEditSave(request: StudentRequest) {
    if (!formStudent) return;
    setIsSaving(true);
    setError("");
    try {
      await updateStudent(formStudent.id, request);
      setFormStudent(null);
      setNotice("Student updated successfully.");
      if (selectedClassSectionId) {
        await loadStudentsForSection(selectedClassSectionId);
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to update student."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      setNotice("Student deleted successfully.");
      if (selectedClassSectionId) {
        await loadStudentsForSection(selectedClassSectionId);
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Unable to delete student."));
    } finally {
      setIsDeleting(false);
    }
  }

  async function openStudentDetails(student: StudentResponse) {
    setIsLoadingDetails(true);
    setError("");
    try {
      const [
        studentResponse,
        addressResponse,
        documentsResponse,
        feeResponse,
        admissionResponse,
      ] = await Promise.all([
        getStudentById(student.id).catch(() => ({ data: student }) as any),
        getStudentAddress(student.id).catch(() => ({ data: null }) as any),
        getStudentDocuments(student.id).catch(() => ({ data: [] }) as any),
        axiosClient
          .get<StudentFee[]>(`/student-fees/student/${student.id}`)
          .catch(async () =>
            academicYearId
              ? await getStudentFees(student.id, academicYearId)
              : ({ data: [] as StudentFee[] } as any),
          ),
        axiosClient
          .get<
            StudentAdmissionRecord[]
          >(`/student-admissions/student/${student.id}`)
          .catch(() => ({ data: [] as StudentAdmissionRecord[] }) as any),
      ]);

      const loadedStudent = (studentResponse.data ??
        student) as StudentResponse;
      const loadedAddress = (addressResponse.data ??
        null) as AddressRecord | null;
      const loadedDocuments = normalizeList<DocumentRecord>(
        documentsResponse.data,
      );
      const loadedFees = normalizeList<StudentFee>(feeResponse.data);
      const loadedAdmissions = normalizeList<StudentAdmissionRecord>(
        admissionResponse.data,
      );

      const paymentResults = await Promise.all(
        loadedFees.map(async (fee) => {
          if (!fee.id) return [] as FeePayment[];
          return getFeePayments(fee.id)
            .catch(() => ({ data: [] }))
            .then((response) => normalizeList<FeePayment>(response.data));
        }),
      );

      const paymentsByFeeId = new Map<number, FeePayment[]>();
      loadedFees.forEach((fee, index) => {
        if (fee.id) {
          paymentsByFeeId.set(fee.id, paymentResults[index] ?? []);
        }
      });

      setDetailState({
        student: loadedStudent,
        address: loadedAddress,
        documents: loadedDocuments,
        admission: loadedAdmissions[0] ?? null,
        fees: loadedFees,
        paymentsByFeeId,
      });
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          "Unable to load student details. Please try again.",
        ),
      );
    } finally {
      setIsLoadingDetails(false);
    }
  }

  function handleStandardSelect(standard: Standard) {
    ++sectionsRequestId.current;
    ++studentsRequestId.current;
    setSelectedStandardId(standard.id);
    setSelectedClassSectionId(null);
    setSections([]);
    setSectionsLoadFailed(false);
    setStudents([]);
    setIsLoadingSections(false);
    setIsLoadingStudents(false);
    setStudentsLoadFailed(false);
    setSearch("");
    setStatus("all");
    setPage(1);
    if (academicYearId !== null) {
      void loadSectionsForStandard(standard.id, academicYearId);
    }
  }

  function handleSectionSelect(section: ClassSection) {
    setSelectedClassSectionId(section.id);
    setStudents([]);
    setStudentsLoadFailed(false);
    setSearch("");
    setStatus("all");
    setPage(1);
    if (section.id) {
      void loadStudentsForSection(section.id);
    }
  }

  return (
    <section className="teacher-management-page student-directory-shell">
      <div className="management-heading teacher-page-heading">
        <div>
          <p className="eyebrow">Student directory</p>
          <h1>Students</h1>
          <p>Browse students by academic year, standard and section.</p>
        </div>
      </div>

      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="student-stat-grid">
        <StudentStat
          icon={<UsersRound size={18} />}
          label="Selected Students"
          value={students.length}
        />
        <StudentStat
          icon={<GraduationCap size={18} />}
          label="Active Students"
          value={activeStudents}
        />
        <StudentStat
          icon={<UsersRound size={18} />}
          label="Inactive Students"
          value={students.length - activeStudents}
        />
        <StudentStat
          icon={<GraduationCap size={18} />}
          label="Standards"
          value={standards.length}
        />
      </div>

      <section className="panel teacher-table-panel student-directory-panel">
        <div className="student-select-header">
          <div>
            <p className="eyebrow">Academic year</p>
            <h2>
              {selectedAcademicYear?.academicYear ?? "Select academic year"}
            </h2>
          </div>
          <button
            className="refresh-link refresh-button"
            disabled={isLoadingAcademicYears || isLoadingStandards}
            onClick={() => void loadAcademicData()}
            type="button"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {isLoadingStandards || isLoadingAcademicYears ? (
          <p className="empty-state">
            {isLoadingAcademicYears ? "Loading academic years..." : "Loading standards..."}
          </p>
        ) : (
          <div className="student-standard-grid">
            {standards.map((standard) => (
              <button
                key={standard.id}
                className={
                  selectedStandardId === standard.id
                    ? "student-standard-card active"
                    : "student-standard-card"
                }
                onClick={() => handleStandardSelect(standard)}
                disabled={academicYearId === null || isLoadingAcademicYears}
                type="button"
              >
                <span className="student-standard-card-number">
                  {standard.standardName}
                </span>
                <span className="student-standard-card-label">Standard</span>
              </button>
            ))}
          </div>
        )}

        {!selectedStandardId && !isLoadingStandards && (
          <p className="empty-state">Select a standard to view students.</p>
        )}

        {selectedStandardId !== null && (
          <>
            <div className="student-selection-title">
              <h3>
                {selectedStandard?.standardName ?? "Standard"} Standard
                {selectedSection ? ` - ${selectedSection.sectionName}` : ""}
              </h3>
            </div>

            {isLoadingSections ? (
              <p className="empty-state">Loading sections...</p>
            ) : sectionsLoadFailed ? null : sections.length === 0 ? (
              <p className="empty-state">
                No sections available for this standard.
              </p>
            ) : (
              <div className="student-section-grid">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    className={
                      selectedClassSectionId === section.id
                        ? "student-section-card active"
                        : "student-section-card"
                    }
                    onClick={() => handleSectionSelect(section)}
                    type="button"
                  >
                    {section.sectionName}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selectedClassSectionId !== null && (
          <div className="student-table-panel">
            <div className="teacher-toolbar student-toolbar">
              <label className="search-box teacher-search-box student-search-box">
                <Search size={15} />
                <input
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by name or admission number"
                  value={search}
                />
              </label>
              <select
                aria-label="Filter students by status"
                onChange={(event) => {
                  setStatus(event.target.value as StatusFilter);
                  setPage(1);
                }}
                value={status}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {isLoadingStudents ? (
              <p className="empty-state">Loading students...</p>
            ) : studentsLoadFailed ? null : filteredStudents.length === 0 ? (
              <p className="empty-state">
                {students.length === 0
                  ? "No students found for this section."
                  : "No students match the selected filters."}
              </p>
            ) : (
              <>
                <StudentTable
                  canManage={canManage}
                  onDelete={setDeleteTarget}
                  onEdit={setFormStudent}
                  onView={openStudentDetails}
                  students={visibleStudents}
                />
                {filteredStudents.length > PAGE_SIZE && (
                  <div className="student-pagination">
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <div>
                      <button
                        className="secondary-button"
                        disabled={page === 1}
                        onClick={() => setPage((current) => current - 1)}
                        type="button"
                      >
                        Previous
                      </button>
                      <button
                        className="secondary-button"
                        disabled={page === totalPages}
                        onClick={() => setPage((current) => current + 1)}
                        type="button"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {formStudent && (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby="student-form-title"
            className="dialog-card"
            role="dialog"
          >
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Student details</p>
                <h2 id="student-form-title">Edit Student</h2>
              </div>
              <button
                aria-label="Close student form"
                onClick={() => setFormStudent(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <StudentForm
              isSaving={isSaving}
              onCancel={() => setFormStudent(null)}
              onSubmit={handleEditSave}
              student={formStudent}
            />
          </section>
        </div>
      )}

      {detailState && (
        <StudentDetailsModal
          onClose={() => setDetailState(null)}
          student={detailState.student}
          address={detailState.address}
          documents={detailState.documents}
          admission={detailState.admission}
          fees={detailState.fees}
          paymentsByFeeId={detailState.paymentsByFeeId}
          isLoading={isLoadingDetails}
        />
      )}

      {deleteTarget && (
        <DeleteStudentDialog
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          student={deleteTarget}
        />
      )}
    </section>
  );
}

function StudentStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="stat-card student-summary-card">
      <div className="stat-icon purple">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function StudentTable({
  students,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  students: StudentResponse[];
  canManage: boolean;
  onView: (student: StudentResponse) => void;
  onEdit: (student: StudentResponse) => void;
  onDelete: (student: StudentResponse) => void;
}) {
  return (
    <div className="teacher-table-wrap">
      <table className="teacher-table student-table">
        <thead>
          <tr>
            <th>Admission No.</th>
            <th>Student Name</th>
            <th>DOB</th>
            <th>Gender</th>
            <th>Blood Group</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const name = getStudentName(student);
            return (
              <tr key={student.id}>
                <td>{student.admissionNumber}</td>
                <td>
                  <div className="student-identity">
                    <span className="student-avatar">
                      {getInitials(student)}
                    </span>
                    <strong>{name}</strong>
                  </div>
                </td>
                <td>{formatDate(student.dateOfBirth)}</td>
                <td>{student.gender}</td>
                <td>{student.bloodGroup || "-"}</td>
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
                <td>
                  <div className="table-actions">
                    <button
                      aria-label={`View ${name}`}
                      onClick={() => onView(student)}
                      title="View"
                      type="button"
                    >
                      <Eye size={15} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          aria-label={`Edit ${name}`}
                          onClick={() => onEdit(student)}
                          title="Edit"
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Delete ${name}`}
                          className="danger-action"
                          onClick={() => onDelete(student)}
                          title="Delete"
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StudentForm({
  student,
  isSaving,
  onCancel,
  onSubmit,
}: {
  student: StudentResponse;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (request: StudentRequest) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<StudentFormState>(() =>
    getFormState(student),
  );

  useEffect(() => {
    setValues(getFormState(student));
    setErrors({});
  }, [student]);

  function updateField(field: keyof StudentFormState, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!values.admissionNumber.trim())
      nextErrors.admissionNumber = "Admission number is required.";
    if (!values.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!values.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!values.dateOfBirth)
      nextErrors.dateOfBirth = "Date of birth is required.";
    if (!values.gender) nextErrors.gender = "Gender is required.";
    if (!values.classSectionId || Number(values.classSectionId) <= 0)
      nextErrors.classSectionId = "Class / section ID is required.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      admissionNumber: values.admissionNumber.trim(),
      firstName: values.firstName.trim(),
      middleName: values.middleName.trim() || undefined,
      lastName: values.lastName.trim(),
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      bloodGroup: values.bloodGroup || undefined,
      classSectionId: Number(values.classSectionId),
      active: values.active,
    });
  }

  return (
    <form className="teacher-form" onSubmit={(event) => void submit(event)}>
      <div className="student-form-section">
        <p className="eyebrow">Admission information</p>
        <div className="teacher-form-grid">
          <StudentField label="Admission Number" error={errors.admissionNumber}>
            <input
              maxLength={30}
              onChange={(event) =>
                updateField("admissionNumber", event.target.value)
              }
              value={values.admissionNumber}
            />
          </StudentField>
          <StudentField
            label="Class / Section ID"
            error={errors.classSectionId}
          >
            <input
              inputMode="numeric"
              min="1"
              onChange={(event) =>
                updateField("classSectionId", event.target.value)
              }
              placeholder="Enter class section ID"
              type="number"
              value={values.classSectionId}
            />
          </StudentField>
        </div>
      </div>

      <div className="student-form-section">
        <p className="eyebrow">Personal information</p>
        <div className="teacher-form-grid">
          <StudentField label="First Name" error={errors.firstName}>
            <input
              maxLength={100}
              onChange={(event) => updateField("firstName", event.target.value)}
              value={values.firstName}
            />
          </StudentField>
          <StudentField label="Middle Name">
            <input
              maxLength={100}
              onChange={(event) =>
                updateField("middleName", event.target.value)
              }
              value={values.middleName}
            />
          </StudentField>
          <StudentField label="Last Name" error={errors.lastName}>
            <input
              maxLength={100}
              onChange={(event) => updateField("lastName", event.target.value)}
              value={values.lastName}
            />
          </StudentField>
          <StudentField label="Date of Birth" error={errors.dateOfBirth}>
            <input
              onChange={(event) =>
                updateField("dateOfBirth", event.target.value)
              }
              type="date"
              value={values.dateOfBirth}
            />
          </StudentField>
          <StudentField label="Gender" error={errors.gender}>
            <select
              onChange={(event) => updateField("gender", event.target.value)}
              value={values.gender}
            >
              <option value="">Select gender</option>
              {genders.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </StudentField>
          <StudentField label="Blood Group">
            <select
              onChange={(event) =>
                updateField("bloodGroup", event.target.value)
              }
              value={values.bloodGroup}
            >
              <option value="">Select blood group</option>
              {bloodGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </StudentField>
        </div>
      </div>

      <div className="student-form-section">
        <p className="eyebrow">Status</p>
        <div className="teacher-form-grid">
          <StudentField label="Active status">
            <select
              onChange={(event) =>
                updateField("active", event.target.value === "true")
              }
              value={String(values.active)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </StudentField>
        </div>
      </div>

      <div className="form-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function StudentField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="teacher-field student-field">
      <span>
        {label}
        {[
          "Admission Number",
          "Class / Section ID",
          "First Name",
          "Last Name",
          "Date of Birth",
          "Gender",
        ].includes(label)
          ? " *"
          : ""}
      </span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function StudentDetailsModal({
  student,
  address,
  documents,
  admission,
  fees,
  paymentsByFeeId,
  isLoading,
  onClose,
}: {
  student: StudentResponse;
  address: AddressRecord | null;
  documents: DocumentRecord[];
  admission: StudentAdmissionRecord | null;
  fees: StudentFee[];
  paymentsByFeeId: Map<number, FeePayment[]>;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="student-details-title"
        className="dialog-card student-details-card"
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Student details</p>
            <h2 id="student-details-title">{getStudentName(student)}</h2>
            <p className="dialog-copy">
              {student.admissionNumber} •{" "}
              {student.active ? "Active" : "Inactive"}
            </p>
          </div>
          <button
            aria-label="Close student details"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <p className="empty-state">Loading student details...</p>
        ) : (
          <>
            <div className="student-detail-section">
              <p className="eyebrow">Personal information</p>
              <dl className="teacher-details-grid">
                <Detail label="Student ID" value={String(student.id)} />
                <Detail
                  label="Admission Number"
                  value={student.admissionNumber}
                />
                <Detail label="First Name" value={student.firstName} />
                <Detail label="Middle Name" value={student.middleName || "-"} />
                <Detail label="Last Name" value={student.lastName} />
                <Detail label="Full Name" value={getStudentName(student)} />
                <Detail
                  label="Date of Birth"
                  value={formatDate(student.dateOfBirth)}
                />
                <Detail label="Gender" value={student.gender} />
                <Detail label="Blood Group" value={student.bloodGroup || "-"} />
                <Detail
                  label="Active Status"
                  value={student.active ? "Active" : "Inactive"}
                />
              </dl>
            </div>

            <div className="student-detail-section">
              <p className="eyebrow">Academic information</p>
              <dl className="teacher-details-grid">
                <Detail
                  label="Academic Year"
                  value={
                    student.academicYear ||
                    resolveAdmissionValue(admission, "academicYear") ||
                    "-"
                  }
                />
                <Detail
                  label="Standard"
                  value={
                    student.standardName ||
                    resolveAdmissionValue(admission, "standard") ||
                    "-"
                  }
                />
                <Detail
                  label="Division / Section"
                  value={
                    student.sectionName ||
                    resolveAdmissionValue(admission, "classSection") ||
                    "-"
                  }
                />
                <Detail
                  label="Class Section ID"
                  value={
                    student.classSectionId
                      ? String(student.classSectionId)
                      : "-"
                  }
                />
                <Detail
                  label="Class Section Status"
                  value={student.active ? "Active" : "Inactive"}
                />
              </dl>
            </div>

            <div className="student-detail-section">
              <p className="eyebrow">Address</p>
              {address ? (
                <dl className="teacher-details-grid">
                  <Detail
                    label="Address Line"
                    value={address.addressLine || "-"}
                  />
                  <Detail label="City" value={address.city || "-"} />
                  <Detail label="State" value={address.state || "-"} />
                  <Detail
                    label="Postal Code"
                    value={address.postalCode || "-"}
                  />
                  <Detail label="Country" value={address.country || "-"} />
                </dl>
              ) : (
                <p className="empty-state">No address information available.</p>
              )}
            </div>

            <div className="student-detail-section">
              <p className="eyebrow">Documents</p>
              {documents.length === 0 ? (
                <p className="empty-state">No documents available.</p>
              ) : (
                <div className="student-detail-table-wrap">
                  <table className="teacher-table student-detail-table">
                    <thead>
                      <tr>
                        <th>Document Type</th>
                        <th>Document Name</th>
                        <th>Document URL</th>
                        <th>Uploaded Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((document) => (
                        <tr
                          key={
                            document.id ??
                            `${document.documentName}-${document.uploadedDate}`
                          }
                        >
                          <td>{document.documentType || "-"}</td>
                          <td>{document.documentName || "-"}</td>
                          <td>
                            {document.documentUrl ? (
                              <a
                                href={document.documentUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                View
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            {document.uploadedDate
                              ? formatDate(document.uploadedDate)
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="student-detail-section">
              <p className="eyebrow">Admission</p>
              {admission ? (
                <dl className="teacher-details-grid">
                  <Detail
                    label="Admission ID"
                    value={admission.id ? String(admission.id) : "-"}
                  />
                  <Detail
                    label="Academic Year"
                    value={
                      resolveAdmissionValue(admission, "academicYear") || "-"
                    }
                  />
                  <Detail
                    label="Standard"
                    value={resolveAdmissionValue(admission, "standard") || "-"}
                  />
                  <Detail
                    label="Class / Division"
                    value={
                      resolveAdmissionValue(admission, "classSection") || "-"
                    }
                  />
                  <Detail
                    label="Admission Date"
                    value={
                      admission.admissionDate
                        ? formatDate(admission.admissionDate)
                        : "-"
                    }
                  />
                  <Detail
                    label="Admission Status"
                    value={admission.admissionStatus || "-"}
                  />
                  <Detail label="Remarks" value={admission.remarks || "-"} />
                </dl>
              ) : (
                <p className="empty-state">
                  No admission information available.
                </p>
              )}
            </div>

            <div className="student-detail-section">
              <p className="eyebrow">Fees</p>
              {fees.length === 0 ? (
                <p className="empty-state">No fee records available.</p>
              ) : (
                <div className="student-detail-table-wrap">
                  <table className="teacher-table student-detail-table">
                    <thead>
                      <tr>
                        <th>Fee Type</th>
                        <th>Amount</th>
                        <th>Academic Year</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee) => (
                        <tr key={fee.id ?? `${fee.feeType}-${fee.dueDate}`}>
                          <td>{fee.feeType || "-"}</td>
                          <td>
                            {fee.amount
                              ? `₹ ${Number(fee.amount).toLocaleString("en-IN")}`
                              : "-"}
                          </td>
                          <td>{student.academicYear || "-"}</td>
                          <td>{fee.dueDate ? formatDate(fee.dueDate) : "-"}</td>
                          <td>{fee.status || "-"}</td>
                          <td>{fee.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="student-detail-section">
              <p className="eyebrow">Payments</p>
              {fees.length === 0 ? (
                <p className="empty-state">No payment records available.</p>
              ) : (
                fees.map((fee) => {
                  const payments = fee.id
                    ? (paymentsByFeeId.get(fee.id) ?? [])
                    : [];
                  return (
                    <div
                      key={fee.id ?? `${fee.feeType}-payments`}
                      className="student-payment-block"
                    >
                      <h4>{fee.feeType || "Fee"}</h4>
                      {payments.length === 0 ? (
                        <p className="empty-state">
                          No payment records available.
                        </p>
                      ) : (
                        <div className="student-detail-table-wrap">
                          <table className="teacher-table student-detail-table">
                            <thead>
                              <tr>
                                <th>Payment Date</th>
                                <th>Amount Paid</th>
                                <th>Payment Method</th>
                                <th>Transaction Reference</th>
                                <th>Receipt Number</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.map((payment) => (
                                <tr
                                  key={
                                    payment.id ??
                                    `${payment.receiptNumber ?? "payment"}-${payment.paymentDate}`
                                  }
                                >
                                  <td>
                                    {payment.paymentDate
                                      ? formatDate(payment.paymentDate)
                                      : "-"}
                                  </td>
                                  <td>
                                    {payment.amountPaid
                                      ? `₹ ${Number(payment.amountPaid).toLocaleString("en-IN")}`
                                      : "-"}
                                  </td>
                                  <td>{payment.paymentMethod || "-"}</td>
                                  <td>{payment.transactionReference || "-"}</td>
                                  <td>{payment.receiptNumber || "-"}</td>
                                  <td>{payment.remarks || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function DeleteStudentDialog({
  student,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  student: StudentResponse;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="delete-student-title"
        className="dialog-card compact-dialog"
        role="dialog"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Delete student</p>
            <h2 id="delete-student-title">Delete Student?</h2>
          </div>
          <button
            aria-label="Close confirmation"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <p className="dialog-copy">
          Are you sure you want to delete {getStudentName(student)}? This action
          cannot be undone.
        </p>
        <div className="form-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="delete-button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isDeleting ? "Deleting..." : "Delete Student"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function resolveAdmissionValue(
  admission: StudentAdmissionRecord | null,
  key: "academicYear" | "standard" | "classSection",
) {
  if (!admission) return "";

  if (key === "academicYear") return admission.academicYear ?? "";
  if (key === "standard") return admission.standardName ?? "";
  return admission.sectionName ?? "";
}

function getFormState(student: StudentResponse): StudentFormState {
  return {
    admissionNumber: student.admissionNumber ?? "",
    firstName: student.firstName ?? "",
    middleName: student.middleName ?? "",
    lastName: student.lastName ?? "",
    dateOfBirth: student.dateOfBirth ?? "",
    gender: student.gender ?? "",
    bloodGroup: student.bloodGroup ?? "",
    classSectionId: String(student.classSectionId ?? ""),
    active: student.active ?? true,
  };
}

function getStudentName(student: StudentResponse) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

function getInitials(student: StudentResponse) {
  return `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase();
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB").format(date);
}

function normalizeList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function sortStandards(standards: StandardWithDisplayOrder[]) {
  if (!standards.every((standard) => typeof standard.displayOrder === "number")) {
    return standards;
  }
  return [...standards].sort(
    (first, second) => first.displayOrder! - second.displayOrder!,
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error))
    return error instanceof Error ? error.message : fallback;
  const responseData = error.response?.data;
  if (typeof responseData === "string" && responseData.trim())
    return responseData;
  if (responseData && typeof responseData === "object") {
    const message =
      responseData.message ?? responseData.error ?? responseData.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error.response?.status === 401)
    return "Your session has expired. Please login again.";
  if (error.response?.status === 403)
    return "You do not have permission to view students.";
  if (error.response?.status === 404)
    return "The students endpoint was not found.";
  if (error.response?.status && error.response.status >= 500)
    return "Unable to load students. Please try again.";
  if (!error.response) return "Unable to connect to the server.";
  return fallback;
}
