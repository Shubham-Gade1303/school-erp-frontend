import { Check, LoaderCircle, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  getAcademicYears,
  getClassSections,
  getStandards,
} from "../services/admissionService";
import {
  createAttendance,
  getAttendanceByDate,
  updateAttendance,
} from "../services/attendanceService";
import { getStudentsByClassSection } from "../services/studentService";
import type {
  AttendanceRecord,
  AttendanceRequest,
  AttendanceStatus,
} from "../types/attendance";
import type { StudentResponse } from "../types/student";
import type { AcademicYear, ClassSection, Standard } from "../types/admission";
import "./AttendancePage.css";

interface AttendanceDraft {
  id?: number;
  status: AttendanceStatus;
  remarks: string;
}

type AttendanceByStudent = Record<number, AttendanceDraft>;

export function AttendancePage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedStandardId, setSelectedStandardId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(getLocalDate);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [hasLoadedStudents, setHasLoadedStudents] = useState(false);
  const [attendanceByStudent, setAttendanceByStudent] =
    useState<AttendanceByStudent>({});
  const [search, setSearch] = useState("");
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isAttendanceReady, setIsAttendanceReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isCurrent = true;

    Promise.allSettled([getAcademicYears(), getStandards()]).then((results) => {
      if (!isCurrent) return;

      const [yearsResult, standardsResult] = results;
      const failures: string[] = [];

      if (yearsResult.status === "fulfilled") {
        setAcademicYears(yearsResult.value.data);
      } else {
        failures.push("Unable to load academic years.");
      }

      if (standardsResult.status === "fulfilled") {
        setStandards(standardsResult.value.data);
      } else {
        failures.push("Unable to load standards.");
      }

      setError(failures.join(" "));
      setIsLoadingFilters(false);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAcademicYearId || !selectedStandardId) {
      setSections([]);
      return;
    }

    let isCurrent = true;
    setIsLoadingSections(true);
    setSections([]);

    getClassSections(Number(selectedAcademicYearId), Number(selectedStandardId))
      .then(({ data }) => {
        if (isCurrent) setSections(data);
      })
      .catch(() => {
        if (isCurrent) {
          setError("Unable to load class sections. Please try again.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingSections(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedAcademicYearId, selectedStandardId]);

  useEffect(() => {
    if (!hasLoadedStudents) return;

    let isCurrent = true;
    setIsAttendanceReady(false);
    setIsLoadingAttendance(true);

    getAttendanceByDate(attendanceDate)
      .then(({ data }) => {
        if (!isCurrent) return;
        setAttendanceByStudent(buildAttendanceState(students, data));
        setIsAttendanceReady(true);
        setError("");
      })
      .catch(() => {
        if (isCurrent) {
          setError(
            "Unable to load saved attendance for this date. Saving is disabled until attendance can be checked.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoadingAttendance(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [attendanceDate, hasLoadedStudents, students]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) =>
      `${getStudentName(student)} ${student.admissionNumber}`
        .toLowerCase()
        .includes(query),
    );
  }, [search, students]);

  const presentCount = students.reduce(
    (count, student) =>
      count + (attendanceByStudent[student.id]?.status === "PRESENT" ? 1 : 0),
    0,
  );
  const absentCount = students.length - presentCount;

  function clearLoadedClass() {
    setStudents([]);
    setHasLoadedStudents(false);
    setAttendanceByStudent({});
    setIsAttendanceReady(false);
    setSearch("");
    setNotice("");
  }

  function handleAcademicYearChange(value: string) {
    setSelectedAcademicYearId(value);
    setSelectedStandardId("");
    setSelectedSectionId("");
    setSections([]);
    clearLoadedClass();
    setError("");
  }

  function handleStandardChange(value: string) {
    setSelectedStandardId(value);
    setSelectedSectionId("");
    clearLoadedClass();
    setError("");
  }

  function handleSectionChange(value: string) {
    setSelectedSectionId(value);
    clearLoadedClass();
    setError("");
  }

  function handleDateChange(value: string) {
    setAttendanceDate(value);
    setNotice("");
    setError("");
    if (hasLoadedStudents) {
      setAttendanceByStudent(defaultAttendanceState(students));
      setIsAttendanceReady(false);
    }
  }

  async function handleLoadStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSectionId || !attendanceDate) return;

    setIsLoadingStudents(true);
    setError("");
    setNotice("");
    clearLoadedClass();

    try {
      const { data } = await getStudentsByClassSection(
        Number(selectedSectionId),
      );
      setStudents(data);
      setAttendanceByStudent(defaultAttendanceState(data));
      setHasLoadedStudents(true);
    } catch {
      setError(
        "Unable to load students for this class section. Please try again.",
      );
    } finally {
      setIsLoadingStudents(false);
    }
  }

  function setStudentStatus(studentId: number, status: AttendanceStatus) {
    setAttendanceByStudent((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        status,
        remarks: current[studentId]?.remarks ?? "",
      },
    }));
    setNotice("");
  }

  function markAllPresent() {
    setAttendanceByStudent((current) =>
      Object.fromEntries(
        students.map((student) => [
          student.id,
          {
            ...current[student.id],
            status: "PRESENT" as const,
            remarks: current[student.id]?.remarks ?? "",
          },
        ]),
      ),
    );
    setNotice("");
  }

  async function handleSaveAttendance() {
    if (!students.length || !isAttendanceReady || isSaving) return;

    setIsSaving(true);
    setError("");
    setNotice("");

    const results = await Promise.allSettled(
      students.map((student) => {
        const saved = attendanceByStudent[student.id];
        const request: AttendanceRequest = {
          studentId: student.id,
          attendanceDate,
          status: saved?.status ?? "PRESENT",
          remarks: saved?.remarks ?? "",
        };

        return saved?.id
          ? updateAttendance(saved.id, request)
          : createAttendance(request);
      }),
    );

    const failedCount = results.filter(
      (result) => result.status === "rejected",
    ).length;
    const successfulRecords = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value.data] : [],
    );
    setAttendanceByStudent((current) =>
      mergeSavedRecords(current, successfulRecords),
    );

    try {
      const { data } = await getAttendanceByDate(attendanceDate);
      setAttendanceByStudent(buildAttendanceState(students, data));
      setIsAttendanceReady(true);

      if (failedCount) {
        setError(
          `Attendance was not saved for ${failedCount} ${failedCount === 1 ? "student" : "students"}. Successful records were refreshed; review the list and try again.`,
        );
      } else {
        setNotice("Attendance saved successfully.");
      }
    } catch {
      setIsAttendanceReady(failedCount === 0);
      setError(
        failedCount
          ? `Attendance was not fully saved: ${failedCount} ${failedCount === 1 ? "student request failed" : "student requests failed"}. The saved records could not be refreshed; load students again before retrying.`
          : "Attendance was saved, but the saved records could not be refreshed. Load students again before saving more changes.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="content-page attendance-page">
      <header className="attendance-page-header">
        <div>
          <h1>Attendance</h1>
          <p>Take and manage daily student attendance</p>
        </div>
      </header>

      {error && (
        <p className="attendance-alert attendance-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="attendance-alert attendance-success" role="status">
          {notice}
        </p>
      )}

      <form
        className="panel attendance-filter-panel"
        onSubmit={handleLoadStudents}
      >
        <div className="attendance-filter-grid">
          <label className="attendance-field">
            <span>Date</span>
            <input
              type="date"
              value={attendanceDate}
              onChange={(event) => handleDateChange(event.target.value)}
              disabled={isSaving}
              required
            />
          </label>

          <label className="attendance-field">
            <span>Academic Year</span>
            <select
              value={selectedAcademicYearId}
              onChange={(event) => handleAcademicYearChange(event.target.value)}
              disabled={isLoadingFilters || isSaving}
              required
            >
              <option value="">Select academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.academicYear}
                </option>
              ))}
            </select>
          </label>

          <label className="attendance-field">
            <span>Standard</span>
            <select
              value={selectedStandardId}
              onChange={(event) => handleStandardChange(event.target.value)}
              disabled={!selectedAcademicYearId || isLoadingFilters || isSaving}
              required
            >
              <option value="">Select standard</option>
              {standards.map((standard) => (
                <option key={standard.id} value={standard.id}>
                  {standard.standardName}
                </option>
              ))}
            </select>
          </label>

          <label className="attendance-field">
            <span>Division / Class Section</span>
            <select
              value={selectedSectionId}
              onChange={(event) => handleSectionChange(event.target.value)}
              disabled={!selectedStandardId || isLoadingSections || isSaving}
              required
            >
              <option value="">
                {isLoadingSections ? "Loading sections..." : "Select division"}
              </option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.sectionName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="attendance-filter-actions">
          {isLoadingFilters && (
            <span className="attendance-loading">
              <LoaderCircle size={15} /> Loading options
            </span>
          )}
          <button
            className="attendance-primary-button"
            type="submit"
            disabled={!selectedSectionId || isLoadingStudents || isSaving}
          >
            {isLoadingStudents ? (
              <>
                <LoaderCircle size={16} /> Loading Students...
              </>
            ) : (
              "Load Students"
            )}
          </button>
        </div>
      </form>

      {hasLoadedStudents && students.length > 0 && (
        <>
          <div
            className="attendance-summary-grid"
            aria-label="Attendance summary"
          >
            <article className="panel attendance-summary-card">
              <span>Total Students</span>
              <strong>{students.length}</strong>
            </article>
            <article className="panel attendance-summary-card attendance-summary-present">
              <span>Present</span>
              <strong>{presentCount}</strong>
            </article>
            <article className="panel attendance-summary-card attendance-summary-absent">
              <span>Absent</span>
              <strong>{absentCount}</strong>
            </article>
          </div>

          <section className="panel attendance-table-panel">
            <div className="attendance-table-toolbar">
              <div>
                <h2>Student Attendance</h2>
                <p>
                  {isLoadingAttendance
                    ? "Loading saved attendance..."
                    : `${students.length} students`}
                </p>
              </div>
              <div className="attendance-table-actions">
                <label className="attendance-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search students"
                    aria-label="Search by student name or admission number"
                  />
                </label>
                <button
                  className="attendance-secondary-button"
                  type="button"
                  onClick={markAllPresent}
                  disabled={isSaving || isLoadingAttendance}
                >
                  <Check size={15} /> Mark All Present
                </button>
              </div>
            </div>

            {visibleStudents.length ? (
              <div className="attendance-table-scroll">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Student Name</th>
                      <th scope="col">Admission Number</th>
                      <th scope="col">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student, index) => {
                      const status =
                        attendanceByStudent[student.id]?.status ?? "PRESENT";
                      return (
                        <tr key={student.id}>
                          <td>{index + 1}</td>
                          <td className="attendance-student-name">
                            {getStudentName(student)}
                          </td>
                          <td>{student.admissionNumber}</td>
                          <td>
                            <div
                              className="attendance-status-control"
                              role="group"
                              aria-label={`Attendance for ${getStudentName(student)}`}
                            >
                              <button
                                className={
                                  status === "PRESENT"
                                    ? "is-present is-selected"
                                    : "is-present"
                                }
                                type="button"
                                aria-pressed={status === "PRESENT"}
                                onClick={() =>
                                  setStudentStatus(student.id, "PRESENT")
                                }
                                disabled={isSaving || isLoadingAttendance}
                              >
                                Present
                              </button>
                              <button
                                className={
                                  status === "ABSENT"
                                    ? "is-absent is-selected"
                                    : "is-absent"
                                }
                                type="button"
                                aria-pressed={status === "ABSENT"}
                                onClick={() =>
                                  setStudentStatus(student.id, "ABSENT")
                                }
                                disabled={isSaving || isLoadingAttendance}
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="attendance-empty-state">
                No students match your search.
              </p>
            )}

            <footer className="attendance-save-footer">
              <span>
                {isLoadingAttendance
                  ? "Checking existing records..."
                  : "Review attendance before saving."}
              </span>
              <button
                className="attendance-primary-button"
                type="button"
                onClick={handleSaveAttendance}
                disabled={
                  !isAttendanceReady ||
                  isLoadingAttendance ||
                  isSaving ||
                  !students.length
                }
              >
                {isSaving ? (
                  <>
                    <LoaderCircle size={16} /> Saving...
                  </>
                ) : (
                  "Save Attendance"
                )}
              </button>
            </footer>
          </section>
        </>
      )}

      {hasLoadedStudents && students.length === 0 && (
        <section className="panel attendance-empty-panel">
          <UsersRound size={22} />
          <p>No students found for this class section.</p>
        </section>
      )}

      {!hasLoadedStudents && !isLoadingStudents && (
        <section className="panel attendance-empty-panel">
          <UsersRound size={22} />
          <p>Select Academic Year, Standard and Division to load students.</p>
        </section>
      )}
    </section>
  );
}

function defaultAttendanceState(
  students: StudentResponse[],
): AttendanceByStudent {
  return Object.fromEntries(
    students.map((student) => [student.id, { status: "PRESENT", remarks: "" }]),
  );
}

function buildAttendanceState(
  students: StudentResponse[],
  records: AttendanceRecord[],
): AttendanceByStudent {
  const recordsByStudent = new Map(
    records.map((record) => [record.studentId, record]),
  );

  return Object.fromEntries(
    students.map((student) => {
      const record = recordsByStudent.get(student.id);
      return [
        student.id,
        record
          ? {
              id: record.id,
              status: normalizeStatus(record.status),
              remarks: record.remarks ?? "",
            }
          : { status: "PRESENT", remarks: "" },
      ];
    }),
  );
}

function mergeSavedRecords(
  current: AttendanceByStudent,
  records: AttendanceRecord[],
): AttendanceByStudent {
  const next = { ...current };
  records.forEach((record) => {
    next[record.studentId] = {
      id: record.id,
      status: normalizeStatus(record.status),
      remarks: record.remarks ?? "",
    };
  });
  return next;
}

function normalizeStatus(status: string): AttendanceStatus {
  return status.toUpperCase() === "ABSENT" ? "ABSENT" : "PRESENT";
}

function getStudentName(student: StudentResponse) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

function getLocalDate() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}
