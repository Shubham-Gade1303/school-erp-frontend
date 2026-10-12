import axios from "axios";
import {
  Eye,
  GraduationCap,
  Pencil,
  RefreshCw,
  Search,
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
import { useAuth } from "../../context/AuthContext";
import {
  getAcademicYears,
  getClassSections,
  getStandards,
} from "../../services/admissionService";
import {
  getStudentActivitiesParticipation,
  getStudentById,
  getStudentDirectoryDocuments,
  getStudentDisciplinaryRecords,
  getStudentMarks,
  getStudentPerformance,
  getStudentPromotionHistory,
  getStudentsByClassSection,
  updateStudent,
} from "../../services/studentService";
import type {
  AcademicYear,
  ClassSection,
  DocumentRecord,
  Standard,
} from "../../types/admission";
import type {
  Student,
  StudentActivitiesParticipation,
  StudentDisciplinaryRecord,
  StudentMarks,
  StudentPerformanceSummary,
  StudentPromotionHistory,
  StudentRequest,
} from "../../types/student";

const PAGE_SIZE = 10;
const genders = ["Male", "Female", "Other"];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

type DirectoryStandard = Standard & { displayOrder?: number };
type ActiveClassSection = ClassSection & { active?: boolean };
type ProfileSection =
  | "basic"
  | "marks"
  | "performance"
  | "activities"
  | "discipline"
  | "promotion"
  | "documents";
type ProfileSectionStatus = { loading: boolean; error: string };
type ProfileStatuses = Record<ProfileSection, ProfileSectionStatus>;
type ProfileData = {
  basic: Student | null;
  marks: StudentMarks[];
  performance: StudentPerformanceSummary[];
  activities: StudentActivitiesParticipation[];
  discipline: StudentDisciplinaryRecord[];
  promotion: StudentPromotionHistory[];
  documents: DocumentRecord[];
};

function createProfileStatuses(loading: boolean): ProfileStatuses {
  return {
    basic: { loading, error: "" },
    marks: { loading, error: "" },
    performance: { loading, error: "" },
    activities: { loading, error: "" },
    discipline: { loading, error: "" },
    promotion: { loading, error: "" },
    documents: { loading, error: "" },
  };
}

function createEmptyProfileData(): ProfileData {
  return {
    basic: null,
    marks: [],
    performance: [],
    activities: [],
    discipline: [],
    promotion: [],
    documents: [],
  };
}
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
  const [standards, setStandards] = useState<DirectoryStandard[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(
    null,
  );
  const [sections, setSections] = useState<ActiveClassSection[]>([]);
  const [selectedClassSectionId, setSelectedClassSectionId] = useState<
    number | null
  >(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
  const [isLoadingStandards, setIsLoadingStandards] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [academicYearsError, setAcademicYearsError] = useState("");
  const [standardsError, setStandardsError] = useState("");
  const [sectionsError, setSectionsError] = useState("");
  const [studentsError, setStudentsError] = useState("");

  const [formStudent, setFormStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");

  const [profileStudentId, setProfileStudentId] = useState<number | null>(null);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>(
    createEmptyProfileData,
  );
  const [profileStatuses, setProfileStatuses] = useState<ProfileStatuses>(() =>
    createProfileStatuses(false),
  );

  const sectionsRequestId = useRef(0);
  const studentsRequestId = useRef(0);
  const profileRequestId = useRef(0);
  const academicYearsRequestId = useRef(0);
  const standardsRequestId = useRef(0);
  const sectionsInFlight = useRef<string | null>(null);
  const studentsInFlight = useRef<number | null>(null);
  const academicYearsInFlight = useRef(false);
  const standardsInFlight = useRef(false);
  const profileController = useRef<AbortController | null>(null);

  const canManage = user?.role === "ADMIN" || user?.role === "PRINCIPAL";
  const selectedStandard =
    standards.find((standard) => standard.id === selectedStandardId) ?? null;
  const normalizedSearch = search.trim().toLowerCase();

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        `${getStudentName(student)} ${student.admissionNumber}`
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [normalizedSearch, students],
  );
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
    void loadAcademicYears();
    void loadStandards();
    return () => {
      academicYearsInFlight.current = false;
      standardsInFlight.current = false;
      academicYearsRequestId.current += 1;
      standardsRequestId.current += 1;
      sectionsRequestId.current += 1;
      studentsRequestId.current += 1;
      profileRequestId.current += 1;
      sectionsInFlight.current = null;
      studentsInFlight.current = null;
      profileController.current?.abort();
      profileController.current = null;
    };
  }, []);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function loadAcademicYears() {
    if (academicYearsInFlight.current) return;
    academicYearsInFlight.current = true;
    const requestId = ++academicYearsRequestId.current;
    setIsLoadingAcademicYears(true);
    setAcademicYearsError("");
    try {
      const response = await getAcademicYears();
      if (requestId !== academicYearsRequestId.current) return;
      const years = response.data;
      setAcademicYears(years);
      const nextYearId = years.some((year) => year.id === academicYearId)
        ? academicYearId
        : (years.find((year) => year.active)?.id ?? years[0]?.id ?? null);
      setAcademicYearId(nextYearId);
      if (academicYearId !== null && nextYearId !== academicYearId)
        clearStandardAndSection();
    } catch (loadError) {
      if (requestId !== academicYearsRequestId.current) return;
      setAcademicYearsError(
        getErrorMessage(loadError, "Unable to load academic years."),
      );
      setAcademicYears([]);
      setAcademicYearId(null);
      clearStandardAndSection();
    } finally {
      if (requestId === academicYearsRequestId.current) {
        academicYearsInFlight.current = false;
        setIsLoadingAcademicYears(false);
      }
    }
  }

  async function loadStandards() {
    if (standardsInFlight.current) return;
    standardsInFlight.current = true;
    const requestId = ++standardsRequestId.current;
    setIsLoadingStandards(true);
    setStandardsError("");
    try {
      const response = await getStandards();
      if (requestId !== standardsRequestId.current) return;
      const sortedStandards = sortStandards(response.data);
      setStandards(sortedStandards);
      const hasSelectedStandard = sortedStandards.some(
        (standard) => standard.id === selectedStandardId,
      );
      if (selectedStandardId !== null && !hasSelectedStandard) {
        setSelectedStandardId(null);
        clearSection();
      }
    } catch (loadError) {
      if (requestId !== standardsRequestId.current) return;
      setStandardsError(
        getErrorMessage(loadError, "Unable to load standards."),
      );
      setStandards([]);
      setSelectedStandardId(null);
      clearSection();
    } finally {
      if (requestId === standardsRequestId.current) {
        standardsInFlight.current = false;
        setIsLoadingStandards(false);
      }
    }
  }

  async function loadSectionsForStandard(yearId: number, standardId: number) {
    const requestKey = `${yearId}:${standardId}`;
    if (sectionsInFlight.current === requestKey) return;
    const requestId = ++sectionsRequestId.current;
    sectionsInFlight.current = requestKey;
    setIsLoadingSections(true);
    setSectionsError("");
    setSections([]);
    try {
      const response = await getClassSections(yearId, standardId);
      if (requestId !== sectionsRequestId.current) return;
      setSections(
        response.data.filter(
          (section) => !("active" in section) || section.active !== false,
        ),
      );
    } catch (loadError) {
      if (requestId !== sectionsRequestId.current) return;
      setSections([]);
      setSectionsError(getErrorMessage(loadError, "Unable to load sections."));
    } finally {
      if (requestId === sectionsRequestId.current) {
        sectionsInFlight.current = null;
        setIsLoadingSections(false);
      }
    }
  }

  async function loadStudentsForSection(classSectionId: number) {
    if (studentsInFlight.current === classSectionId) return;
    const requestId = ++studentsRequestId.current;
    studentsInFlight.current = classSectionId;
    setIsLoadingStudents(true);
    setStudentsError("");
    setStudents([]);
    try {
      const response = await getStudentsByClassSection(classSectionId);
      if (requestId !== studentsRequestId.current) return;
      setStudents(response.data);
      setPage(1);
    } catch (loadError) {
      if (requestId !== studentsRequestId.current) return;
      setStudents([]);
      setStudentsError(getErrorMessage(loadError, "Unable to load students."));
    } finally {
      if (requestId === studentsRequestId.current) {
        studentsInFlight.current = null;
        setIsLoadingStudents(false);
      }
    }
  }

  function clearSection() {
    sectionsRequestId.current += 1;
    studentsRequestId.current += 1;
    sectionsInFlight.current = null;
    studentsInFlight.current = null;
    setSections([]);
    setSelectedClassSectionId(null);
    setStudents([]);
    setIsLoadingSections(false);
    setIsLoadingStudents(false);
    setSectionsError("");
    setStudentsError("");
    setSearch("");
    setPage(1);
  }

  function clearStandardAndSection() {
    setSelectedStandardId(null);
    clearSection();
  }

  function handleAcademicYearChange(value: string) {
    const nextYearId = value ? Number(value) : null;
    setAcademicYearId(nextYearId);
    clearStandardAndSection();
    setNotice("");
  }

  function handleStandardSelect(standard: DirectoryStandard) {
    if (academicYearId === null || selectedStandardId === standard.id) return;
    clearSection();
    setSelectedStandardId(standard.id);
    setNotice("");
    void loadSectionsForStandard(academicYearId, standard.id);
  }

  function handleSectionSelect(section: ActiveClassSection) {
    if (selectedClassSectionId === section.id) return;
    studentsRequestId.current += 1;
    studentsInFlight.current = null;
    setSelectedClassSectionId(section.id);
    setStudents([]);
    setStudentsError("");
    setSearch("");
    setPage(1);
    void loadStudentsForSection(section.id);
  }

  function openStudentProfile(student: Student) {
    profileController.current?.abort();
    const controller = new AbortController();
    profileController.current = controller;
    const requestId = ++profileRequestId.current;

    setProfileStudentId(student.id);
    setProfileStudent(student);
    setProfileData(createEmptyProfileData());
    setProfileStatuses(createProfileStatuses(true));

    void loadProfileSection(
      "basic",
      getStudentById(student.id, { signal: controller.signal }),
      requestId,
      controller.signal,
      (data) => {
        setProfileData((current) => ({ ...current, basic: data }));
        setProfileStudent(data);
      },
    );
    void loadProfileSection(
      "marks",
      getStudentMarks(student.id, { signal: controller.signal }),
      requestId,
      controller.signal,
      (response) => {
        const records = Array.isArray(response)
          ? response
          : response.studentMarks;
        setProfileData((current) => ({ ...current, marks: records }));
      },
    );
    void loadProfileSection(
      "performance",
      getStudentPerformance(student.id, { signal: controller.signal }),
      requestId,
      controller.signal,
      (response) => {
        const records = Array.isArray(response)
          ? response
          : response.studentPerformance;
        setProfileData((current) => ({ ...current, performance: records }));
      },
    );
    void loadProfileSection(
      "activities",
      getStudentActivitiesParticipation(student.id, {
        signal: controller.signal,
      }),
      requestId,
      controller.signal,
      (response) => {
        const records = Array.isArray(response)
          ? response
          : response.studentActivitiesParticipation;
        setProfileData((current) => ({ ...current, activities: records }));
      },
    );
    void loadProfileSection(
      "discipline",
      getStudentDisciplinaryRecords(student.id, { signal: controller.signal }),
      requestId,
      controller.signal,
      (response) => {
        const records = Array.isArray(response)
          ? response
          : response.disciplinaryRecords;
        setProfileData((current) => ({ ...current, discipline: records }));
      },
    );
    void loadProfileSection(
      "promotion",
      getStudentPromotionHistory(student.id, { signal: controller.signal }),
      requestId,
      controller.signal,
      (response) => {
        const records = Array.isArray(response)
          ? response
          : response.studentPromotionHistory;
        setProfileData((current) => ({ ...current, promotion: records }));
      },
    );
    void loadProfileSection(
      "documents",
      getStudentDirectoryDocuments(student.id, { signal: controller.signal }),
      requestId,
      controller.signal,
      (records) => {
        setProfileData((current) => ({ ...current, documents: records }));
      },
    );
  }

  async function loadProfileSection<T>(
    section: ProfileSection,
    request: Promise<{ data: T }>,
    requestId: number,
    signal: AbortSignal,
    onSuccess: (data: T) => void,
  ) {
    setProfileStatuses((current) => ({
      ...current,
      [section]: { loading: true, error: "" },
    }));
    try {
      const response = await request;
      if (signal.aborted || requestId !== profileRequestId.current) return;
      onSuccess(response.data);
      setProfileStatuses((current) => ({
        ...current,
        [section]: { loading: false, error: "" },
      }));
    } catch (loadError) {
      if (signal.aborted || requestId !== profileRequestId.current) return;
      setProfileStatuses((current) => ({
        ...current,
        [section]: {
          loading: false,
          error: getErrorMessage(
            loadError,
            `Unable to load ${profileSectionTitle(section).toLowerCase()}.`,
          ),
        },
      }));
    }
  }

  function retryProfileSection(section: ProfileSection) {
    if (
      profileStudentId === null ||
      !profileController.current ||
      profileController.current.signal.aborted
    )
      return;
    const requestId = profileRequestId.current;
    const { signal } = profileController.current;
    switch (section) {
      case "basic":
        void loadProfileSection(
          section,
          getStudentById(profileStudentId, { signal }),
          requestId,
          signal,
          (data) => {
            setProfileData((current) => ({ ...current, basic: data }));
            setProfileStudent(data);
          },
        );
        break;
      case "marks":
        void loadProfileSection(
          section,
          getStudentMarks(profileStudentId, { signal }),
          requestId,
          signal,
          (response) => {
            const records = Array.isArray(response)
              ? response
              : response.studentMarks;
            setProfileData((current) => ({ ...current, marks: records }));
          },
        );
        break;
      case "performance":
        void loadProfileSection(
          section,
          getStudentPerformance(profileStudentId, { signal }),
          requestId,
          signal,
          (response) => {
            const records = Array.isArray(response)
              ? response
              : response.studentPerformance;
            setProfileData((current) => ({ ...current, performance: records }));
          },
        );
        break;
      case "activities":
        void loadProfileSection(
          section,
          getStudentActivitiesParticipation(profileStudentId, { signal }),
          requestId,
          signal,
          (response) => {
            const records = Array.isArray(response)
              ? response
              : response.studentActivitiesParticipation;
            setProfileData((current) => ({ ...current, activities: records }));
          },
        );
        break;
      case "discipline":
        void loadProfileSection(
          section,
          getStudentDisciplinaryRecords(profileStudentId, { signal }),
          requestId,
          signal,
          (response) => {
            const records = Array.isArray(response)
              ? response
              : response.disciplinaryRecords;
            setProfileData((current) => ({ ...current, discipline: records }));
          },
        );
        break;
      case "promotion":
        void loadProfileSection(
          section,
          getStudentPromotionHistory(profileStudentId, { signal }),
          requestId,
          signal,
          (response) => {
            const records = Array.isArray(response)
              ? response
              : response.studentPromotionHistory;
            setProfileData((current) => ({ ...current, promotion: records }));
          },
        );
        break;
      case "documents":
        void loadProfileSection(
          section,
          getStudentDirectoryDocuments(profileStudentId, { signal }),
          requestId,
          signal,
          (records) => {
            setProfileData((current) => ({ ...current, documents: records }));
          },
        );
        break;
    }
  }

  function closeStudentProfile() {
    profileRequestId.current += 1;
    profileController.current?.abort();
    profileController.current = null;
    setProfileStudentId(null);
    setProfileStudent(null);
    setProfileData(createEmptyProfileData());
    setProfileStatuses(createProfileStatuses(false));
  }

  async function handleEditSave(request: StudentRequest) {
    if (!formStudent) return;
    setIsSaving(true);
    setEditError("");
    setNotice("");
    try {
      await updateStudent(formStudent.id, request);
      const sectionId = selectedClassSectionId;
      setFormStudent(null);
      setNotice("Student updated successfully.");
      if (sectionId !== null) await loadStudentsForSection(sectionId);
    } catch (saveError) {
      setEditError(getErrorMessage(saveError, "Unable to update student."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="teacher-management-page student-directory-shell student-directory-redesign">
      <div className="management-heading teacher-page-heading student-directory-heading">
        <div>
          <p className="eyebrow">Student Directory</p>
          <h1>Students</h1>
          <p>Browse students by academic year, standard and section.</p>
        </div>
      </div>

      {notice && (
        <p className="success-message" role="status">
          {notice}
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

      <section className="panel student-directory-filter-card">
        <div className="student-directory-filter-top">
          <label className="student-directory-year-field">
            <span>Academic Year</span>
            <select
              aria-label="Academic year"
              disabled={isLoadingAcademicYears || academicYearsError !== ""}
              onChange={(event) => handleAcademicYearChange(event.target.value)}
              value={academicYearId ?? ""}
            >
              <option value="">
                {isLoadingAcademicYears ? "Loading academic years..." : "Select academic year"}
              </option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>{year.academicYear}</option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button student-directory-refresh"
            disabled={isLoadingAcademicYears || isLoadingStandards}
            onClick={() => {
              void loadAcademicYears();
              void loadStandards();
            }}
            type="button"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {academicYearsError && (
          <DirectoryError
            isRetryDisabled={isLoadingAcademicYears}
            message={academicYearsError}
            onRetry={() => void loadAcademicYears()}
          />
        )}
        {standardsError && (
          <DirectoryError
            isRetryDisabled={isLoadingStandards}
            message={standardsError}
            onRetry={() => void loadStandards()}
          />
        )}

        <div className="student-directory-filter-row">
          <span className="student-directory-filter-label">Standard</span>
          {isLoadingStandards ? (
            <span className="student-directory-filter-state">Loading standards...</span>
          ) : standards.length === 0 ? (
            <span className="student-directory-filter-state">No standards available.</span>
          ) : (
            <div className="student-directory-pills" aria-label="Standards">
              {standards.map((standard) => (
                <button
                  key={standard.id}
                  className={selectedStandardId === standard.id ? "student-directory-pill active" : "student-directory-pill"}
                  disabled={academicYearId === null || isLoadingAcademicYears || Boolean(academicYearsError)}
                  onClick={() => handleStandardSelect(standard)}
                  type="button"
                >
                  {standard.standardName}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="student-directory-filter-row">
          <span className="student-directory-filter-label">Section</span>
          {selectedStandardId === null ? (
            <span className="student-directory-filter-state">Select a standard first.</span>
          ) : sectionsError ? (
            <DirectoryError
              isRetryDisabled={isLoadingSections}
              message={sectionsError}
              onRetry={() => {
                if (academicYearId !== null && selectedStandardId !== null) {
                  void loadSectionsForStandard(academicYearId, selectedStandardId);
                }
              }}
            />
          ) : isLoadingSections ? (
            <span className="student-directory-filter-state">Loading sections...</span>
          ) : sections.length === 0 ? (
            <span className="student-directory-filter-state">No sections available.</span>
          ) : (
            <div className="student-directory-pills" aria-label="Sections">
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={selectedClassSectionId === section.id ? "student-directory-pill active" : "student-directory-pill"}
                  onClick={() => handleSectionSelect(section)}
                  type="button"
                >
                  {section.sectionName}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel student-directory-table-card">
        <div className="student-directory-table-heading">
          <h2>
            {selectedSectionTitle(selectedStandard?.standardName, sections.find((section) => section.id === selectedClassSectionId)?.sectionName)}
          </h2>
          <div className="student-directory-table-tools">
            <label className="search-box student-directory-search">
              <Search size={15} />
              <input
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search students"
                value={search}
              />
            </label>
            <span className="student-directory-result-count">{filteredStudents.length} results</span>
          </div>
        </div>
        {studentsError ? (
          <DirectoryError
            isRetryDisabled={isLoadingStudents}
            message={studentsError}
            onRetry={() => {
              if (selectedClassSectionId !== null) void loadStudentsForSection(selectedClassSectionId);
            }}
          />
        ) : selectedClassSectionId === null ? (
          <p className="student-directory-table-empty">
            {isLoadingAcademicYears
              ? "Loading academic years..."
              : academicYears.length === 0
                ? "No academic years available."
                : academicYearId === null
                  ? "Select an academic year to view students."
                  : isLoadingStandards
                    ? "Loading standards..."
                    : standards.length === 0
                      ? "No standards available."
                      : selectedStandardId === null
                        ? "Select a standard to view students."
                        : "Select a section to view students."}
          </p>
        ) : isLoadingStudents ? (
          <p className="student-directory-table-empty">Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="student-directory-table-empty">
            {students.length === 0 ? "No students found for this section." : "No students match your search."}
          </p>
        ) : (
          <>
            <StudentTable
              canManage={canManage}
              onEdit={(student) => {
                setEditError("");
                setFormStudent(student);
              }}
              onView={openStudentProfile}
              students={visibleStudents}
            />
            {filteredStudents.length > PAGE_SIZE && (
              <div className="student-pagination">
                <span>Page {page} of {totalPages}</span>
                <div>
                  <button className="secondary-button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">Previous</button>
                  <button className="secondary-button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
                </div>
              </div>
            )}
          </>
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
                onClick={() => {
                  setEditError("");
                  setFormStudent(null);
                }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            {editError && (
              <p className="form-error" role="alert">
                {editError}
              </p>
            )}
            <StudentForm
              isSaving={isSaving}
              onCancel={() => {
                setEditError("");
                setFormStudent(null);
              }}
              onSubmit={handleEditSave}
              student={formStudent}
            />
          </section>
        </div>
      )}

      {profileStudentId !== null && (
        <StudentProfileModal
          data={profileData}
          statuses={profileStatuses}
          onRetry={retryProfileSection}
          onClose={closeStudentProfile}
          student={profileStudent}
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
    <article className="stat-card student-summary-card student-directory-stat">
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
}: {
  students: Student[];
  canManage: boolean;
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
}) {
  return (
    <div className="teacher-table-wrap student-directory-table-scroll">
      <table className="teacher-table student-table">
        <thead>
          <tr>
            <th>Admission No.</th>
            <th>Name</th>
            <th>Standard</th>
            <th>Section</th>
            <th>Academic Year</th>
            <th>Gender</th>
            <th>DOB</th>
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
                <td>{student.standardName || "-"}</td>
                <td>{student.sectionName || "-"}</td>
                <td>{student.academicYear || "-"}</td>
                <td>{student.gender || "-"}</td>
                <td>{formatDate(student.dateOfBirth)}</td>
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
                      <Eye size={14} /> View
                    </button>
                    {canManage && (
                      <button
                        aria-label={`Edit ${name}`}
                        onClick={() => onEdit(student)}
                        title="Edit"
                        type="button"
                      >
                        <Pencil size={15} />
                      </button>
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

function StudentProfileModal({
  student,
  data,
  statuses,
  onRetry,
  onClose,
}: {
  student: Student | null;
  data: ProfileData;
  statuses: ProfileStatuses;
  onRetry: (section: ProfileSection) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      style={{ padding: 12 }}
    >
      <section
        aria-labelledby="student-profile-title"
        className="dialog-card student-details-card"
        role="dialog"
        aria-modal="true"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(1200px, 100%)",
          height: "calc(100vh - 24px)",
          maxHeight: "none",
          overflow: "hidden",
          padding: 0,
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            flex: "0 0 auto",
            padding: "18px 22px",
            borderBottom: "1px solid #f0eff1",
            background: "var(--surface)",
          }}
        >
          <div
            className="dialog-heading"
            style={{ alignItems: "center", marginBottom: 0 }}
          >
            <div>
              <p className="eyebrow">Student profile</p>
              <h2 id="student-profile-title">
                {student ? getStudentName(student) : "Student details"}
              </h2>
              {student && (
                <div
                  className="student-profile-meta"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "6px 12px",
                    marginTop: 8,
                    color: "#85818a",
                    fontSize: 12,
                  }}
                >
                  <span>{student.admissionNumber}</span>
                  <span
                    className={
                      student.active
                        ? "status-badge active"
                        : "status-badge inactive"
                    }
                  >
                    {student.active ? "Active" : "Inactive"}
                  </span>
                  <span>
                    {[student.standardName, student.sectionName]
                      .filter(Boolean)
                      .join(" - ")}
                  </span>
                  <span>{student.academicYear || "-"}</span>
                </div>
              )}
            </div>
            <button
              aria-label="Close student profile"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: 20 }}>
          <ProfileSectionCard
            count={data.basic ? 1 : 0}
            className="student-profile-basic-card"
            hideCount
            error={statuses.basic.error}
            isLoading={statuses.basic.loading}
            onRetry={() => onRetry("basic")}
            title="Basic Information"
          >
            {data.basic && (
              <dl className="student-profile-basic-grid">
                <BasicInformationField
                  label="Admission No"
                  value={data.basic.admissionNumber}
                />
                <BasicInformationField
                  label="Full Name"
                  value={getStudentName(data.basic)}
                />
                <BasicInformationField
                  label="DOB"
                  value={formatProfileDate(data.basic.dateOfBirth)}
                />
                <BasicInformationField
                  label="Gender"
                  value={data.basic.gender}
                />
                <BasicInformationField
                  label="Blood Group"
                  value={data.basic.bloodGroup}
                />
                <BasicInformationField
                  label="Academic Year"
                  value={data.basic.academicYear}
                />
                <BasicInformationField
                  label="Standard"
                  value={data.basic.standardName}
                />
                <BasicInformationField
                  label="Section"
                  value={data.basic.sectionName}
                />
                <div className="student-profile-basic-field">
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`student-profile-basic-status ${data.basic.active ? "active" : "inactive"}`}
                    >
                      {data.basic.active ? "Active" : "Inactive"}
                    </span>
                  </dd>
                </div>
              </dl>
            )}
          </ProfileSectionCard>

          <ProfileSectionCard
            count={data.marks.length}
            error={statuses.marks.error}
            isLoading={statuses.marks.loading}
            onRetry={() => onRetry("marks")}
            title="Marks"
          >
            <ProfileTable headers={["Exam", "Subject", "Total", "Obtained"]}>
              {data.marks.map((mark) => (
                <tr key={mark.id}>
                  <td>{mark.examName}</td>
                  <td>{mark.subjectName}</td>
                  <td>{mark.totalMarks}</td>
                  <td>{mark.marksObtained}</td>
                </tr>
              ))}
            </ProfileTable>
          </ProfileSectionCard>

          <ProfileSectionCard
            count={data.performance.length}
            error={statuses.performance.error}
            isLoading={statuses.performance.loading}
            onRetry={() => onRetry("performance")}
            title="Performance Summary"
          >
            <ProfileTable
              headers={["Exam", "Total", "Obtained", "%", "Grade", "Result"]}
            >
              {data.performance.map((summary) => (
                <tr key={summary.id}>
                  <td>{summary.examName}</td>
                  <td>{summary.totalMarks}</td>
                  <td>{summary.marksObtained}</td>
                  <td>{summary.percentage}%</td>
                  <td>{summary.grade}</td>
                  <td>
                    <span
                      className={
                        summary.resultStatus.toUpperCase() === "PASS"
                          ? "status-badge active"
                          : "status-badge inactive"
                      }
                    >
                      {summary.resultStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </ProfileTable>
          </ProfileSectionCard>

          <ProfileSectionCard
            count={data.activities.length}
            error={statuses.activities.error}
            isLoading={statuses.activities.loading}
            onRetry={() => onRetry("activities")}
            title="Activities"
          >
            <ProfileTable
              headers={["Activity", "Participation Date", "Remarks"]}
            >
              {data.activities.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.activityName}</td>
                  <td>{formatDate(activity.participationDate)}</td>
                  <td>{activity.remarks || "-"}</td>
                </tr>
              ))}
            </ProfileTable>
          </ProfileSectionCard>

          <ProfileSectionCard
            count={data.discipline.length}
            error={statuses.discipline.error}
            isLoading={statuses.discipline.loading}
            onRetry={() => onRetry("discipline")}
            title="Disciplinary Records"
          >
            <ProfileTable
              headers={[
                "Incident Date",
                "Type",
                "Description",
                "Action Taken",
                "Remarks",
                "Resolved",
                "Recorded Date",
              ]}
            >
              {data.discipline.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.incidentDate)}</td>
                  <td>{record.incidentType}</td>
                  <td>{record.description}</td>
                  <td>{record.actionTaken}</td>
                  <td>{record.remarks || "-"}</td>
                  <td>
                    <span
                      className={
                        record.resolved
                          ? "status-badge active"
                          : "status-badge inactive"
                      }
                    >
                      {record.resolved ? "Resolved" : "Unresolved"}
                    </span>
                  </td>
                  <td>
                    {record.recordedDate
                      ? formatDate(record.recordedDate)
                      : "-"}
                  </td>
                </tr>
              ))}
            </ProfileTable>
          </ProfileSectionCard>

          <ProfileSectionCard
            count={data.promotion.length}
            error={statuses.promotion.error}
            isLoading={statuses.promotion.loading}
            onRetry={() => onRetry("promotion")}
            title="Promotion History"
          >
            <ProfileTable
              headers={["From", "To", "Promotion Date", "Status", "Remarks"]}
            >
              {data.promotion.map((promotion) => (
                <tr key={promotion.id}>
                  <td>
                    {[
                      promotion.fromAcademicYear,
                      promotion.fromStandard,
                      promotion.fromSection,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </td>
                  <td>
                    {[
                      promotion.toAcademicYear,
                      promotion.toStandard,
                      promotion.toSection,
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </td>
                  <td>{formatDate(promotion.promotionDate)}</td>
                  <td>{promotion.status}</td>
                  <td>{promotion.remarks || "-"}</td>
                </tr>
              ))}
            </ProfileTable>
          </ProfileSectionCard>

          <ProfileSectionCard
            count={data.documents.length}
            error={statuses.documents.error}
            isLoading={statuses.documents.loading}
            onRetry={() => onRetry("documents")}
            title="Documents"
          >
            <ProfileTable headers={["Type", "Name", "Uploaded Date", "Open"]}>
              {data.documents.map((document) => (
                <tr
                  key={
                    document.id ??
                    `${document.documentName}-${document.uploadedDate ?? ""}`
                  }
                >
                  <td>{document.documentType}</td>
                  <td>{document.documentName}</td>
                  <td>
                    {document.uploadedDate
                      ? formatDate(document.uploadedDate)
                      : "-"}
                  </td>
                  <td>
                    {document.documentUrl ? (
                      <a
                        href={document.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </ProfileTable>
          </ProfileSectionCard>
        </div>
      </section>
    </div>
  );
}

function ProfileSectionCard({
  title,
  count,
  isLoading,
  error,
  onRetry,
  hideCount = false,
  className,
  children,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  hideCount?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`panel student-profile-section-card${className ? ` ${className}` : ""}`}
      style={{
        marginBottom: 14,
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--surface)",
      }}
    >
      <div
        className="student-profile-section-heading"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h3>{title}</h3>
        {!hideCount && (
          <span
            className="student-profile-count"
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              color: "var(--brand-strong)",
              background: "var(--brand-light)",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {isLoading ? (
        <p className="empty-state">Loading {title.toLowerCase()}...</p>
      ) : error ? (
        <DirectoryError
          message={error}
          isRetryDisabled={isLoading}
          onRetry={onRetry}
        />
      ) : count === 0 ? (
        <p className="empty-state">No {title.toLowerCase()} available.</p>
      ) : (
        children
      )}
    </section>
  );
}

function BasicInformationField({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="student-profile-basic-field">
      <dt>{label}</dt>
      <dd>{value?.trim() || "-"}</dd>
    </div>
  );
}

function ProfileTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="student-detail-table-wrap">
      <table className="teacher-table student-detail-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function profileSectionTitle(section: ProfileSection) {
  const titles: Record<ProfileSection, string> = {
    basic: "Basic Information",
    marks: "Marks",
    performance: "Performance Summary",
    activities: "Activities",
    discipline: "Disciplinary Records",
    promotion: "Promotion History",
    documents: "Documents",
  };
  return titles[section];
}

function DirectoryError({
  message,
  onRetry,
  isRetryDisabled = false,
}: {
  message: string;
  onRetry: () => void;
  isRetryDisabled?: boolean;
}) {
  return (
    <div className="empty-state" role="alert">
      <p>{message}</p>
      <button
        className="secondary-button"
        disabled={isRetryDisabled}
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}

function StudentForm({
  student,
  isSaving,
  onCancel,
  onSubmit,
}: {
  student: Student;
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
    if (!values.classSectionId || Number(values.classSectionId) <= 0) {
      nextErrors.classSectionId = "Class / section ID is required.";
    }
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
  const requiredLabels = [
    "Admission Number",
    "Class / Section ID",
    "First Name",
    "Last Name",
    "Date of Birth",
    "Gender",
  ];
  return (
    <label className="teacher-field student-field">
      <span>
        {label}
        {requiredLabels.includes(label) ? " *" : ""}
      </span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function getFormState(student: Student): StudentFormState {
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

function getStudentName(student: Student) {
  return [student.firstName, student.middleName, student.lastName]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(" ");
}

function selectedSectionTitle(standardName: string | undefined, sectionName: string | undefined) {
  if (!standardName || !sectionName) return "Student List";
  return `${standardName} Standard - Section ${sectionName}`;
}

function getInitials(student: Student) {
  return `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase();
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB").format(date);
}

function formatProfileDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value ? formatDate(value) : "-";
}

function sortStandards(standards: DirectoryStandard[]) {
  return standards
    .map((standard, index) => ({ standard, index }))
    .sort((first, second) => {
      const firstOrder = first.standard.displayOrder;
      const secondOrder = second.standard.displayOrder;
      if (typeof firstOrder === "number" && typeof secondOrder === "number")
        return firstOrder - secondOrder;
      if (typeof firstOrder === "number") return -1;
      if (typeof secondOrder === "number") return 1;
      return first.index - second.index;
    })
    .map(({ standard }) => standard);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error))
    return error instanceof Error ? error.message : fallback;
  const responseData: unknown = error.response?.data;
  if (typeof responseData === "string" && responseData.trim())
    return responseData;
  if (responseData && typeof responseData === "object") {
    const message =
      Reflect.get(responseData, "message") ??
      Reflect.get(responseData, "error") ??
      Reflect.get(responseData, "detail");
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error.response?.status === 403)
    return "You do not have permission to perform this action.";
  if (error.response?.status && error.response.status >= 500)
    return "The server could not complete this request.";
  if (!error.response) return "Unable to reach the server. Please try again.";
  return fallback;
}
