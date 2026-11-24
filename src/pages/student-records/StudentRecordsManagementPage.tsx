import axios from "axios";
import {
  Award,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../../context/useAuth";
import { getAllStudents } from "../../services/studentService";
import {
  createStudentActivity,
  createStudentDiscipline,
  createStudentMarks,
  createStudentPerformance,
  createStudentPromotion,
  deleteStudentActivity,
  deleteStudentDiscipline,
  deleteStudentMarks,
  deleteStudentPerformance,
  deleteStudentPromotion,
  getRecordClassSections,
  getStudentRecord,
  getStudentRecordOptions,
  updateStudentActivity,
  updateStudentDiscipline,
  updateStudentMarks,
  updateStudentPerformance,
  updateStudentPromotion,
} from "../../services/studentRecordsService";
import type { Student } from "../../types/student";
import type {
  ActivityOption,
  StudentActivityRequest,
  StudentDisciplineRequest,
  StudentMarksRequest,
  StudentPerformanceRequest,
  StudentPromotionRequest,
  StudentRecord,
  StudentRecordOptions,
  StudentRecordType,
} from "../../types/studentRecords";
import "./StudentRecordsManagement.css";

const recordTypes: Array<{
  type: StudentRecordType;
  title: string;
  description: string;
  icon: typeof BarChart3;
}> = [
  { type: "marks", title: "Marks & Grades", description: "Manage examination marks and subject results.", icon: BarChart3 },
  { type: "performance", title: "Performance Summary", description: "Store performance summaries calculated by the backend.", icon: Trophy },
  { type: "activities", title: "Activities & Achievements", description: "Track participation, results and positions.", icon: Award },
  { type: "discipline", title: "Disciplinary Records", description: "Handle sensitive discipline records with care.", icon: ShieldCheck },
  { type: "promotion", title: "Promotion History", description: "Maintain class and section promotion history.", icon: GraduationCap },
];

type RecordCollections = Record<StudentRecordType, StudentRecord[]>;

type RecordErrors = Partial<Record<StudentRecordType, string>>;
type FormValues = Record<string, string>;
type RecordRequest = StudentMarksRequest | StudentPerformanceRequest | StudentActivityRequest | StudentDisciplineRequest | StudentPromotionRequest;

const emptyRecords = (): RecordCollections => ({ marks: [], performance: [], activities: [], discipline: [], promotion: [] });
const emptyOptions: StudentRecordOptions = { exams: [], subjects: [], activities: [], academicYears: [], standards: [], classSections: { from: [], to: [] } };

export function StudentRecordsManagementPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [activeType, setActiveType] = useState<StudentRecordType>("marks");
  const [records, setRecords] = useState<RecordCollections>(emptyRecords);
  const [recordErrors, setRecordErrors] = useState<RecordErrors>({});
  const [options, setOptions] = useState<StudentRecordOptions>(emptyOptions);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [formType, setFormType] = useState<StudentRecordType | null>(null);
  const [editingRecord, setEditingRecord] = useState<StudentRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedStudent = students.find((student) => String(student.id) === selectedStudentId) ?? null;
  const currentRecords = records[activeType];
  const canManage = user?.role === "ADMIN" || user?.role === "PRINCIPAL" || user?.role === "TEACHER";
  const canDelete = user?.role === "ADMIN" || user?.role === "PRINCIPAL";

  useEffect(() => {
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setIsLoadingStudents(true);
    getAllStudents()
      .then((response) => {
        if (active) setStudents(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error: unknown) => {
        if (active) setPageError(getApiError(error, "Unable to load students."));
      })
      .finally(() => {
        if (active) setIsLoadingStudents(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setIsLoadingOptions(true);
    getStudentRecordOptions()
      .then((loaded) => {
        if (active) setOptions({ ...loaded, classSections: { from: [], to: [] } });
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      // oxlint-disable-next-line react/set-state-in-effect
      setRecords(emptyRecords());
      // oxlint-disable-next-line react/set-state-in-effect
      setRecordErrors({});
      return;
    }
    void loadAllRecords(Number(selectedStudentId));
  }, [selectedStudentId]);

  async function loadAllRecords(studentId: number) {
    setIsLoadingRecords(true);
    setRecordErrors({});
    setRecords(emptyRecords());
    const results = await Promise.allSettled(recordTypes.map(async ({ type }) => ({
      type,
      data: await getStudentRecord(type, studentId),
    })));
    const nextRecords = emptyRecords();
    const nextErrors: RecordErrors = {};
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        nextRecords[result.value.type] = extractRecords(result.value.type, result.value.data.data);
      } else {
        const failedType = recordTypes[results.indexOf(result)]?.type;
        if (failedType) nextErrors[failedType] = getApiError(result.reason, `Unable to load ${getRecordTitle(failedType).toLowerCase()}.`);
      }
    });
    setRecords(nextRecords);
    setRecordErrors(nextErrors);
    setIsLoadingRecords(false);
  }

  function openCreate(type = activeType) {
    if (!selectedStudent) {
      setPageError("Select a student before adding a record.");
      return;
    }
    setPageError("");
    setEditingRecord(null);
    setFormType(type);
  }

  function openEdit(record: StudentRecord) {
    setPageError("");
    setEditingRecord(record);
    setFormType(activeType);
  }

  async function saveRecord(request: RecordRequest, recordId?: number) {
    if (!selectedStudent || !formType) return;
    setIsSaving(true);
    setPageError("");
    try {
      await saveByType(formType, request, recordId);
      setFormType(null);
      setEditingRecord(null);
      setNotice(`${getRecordTitle(formType)} ${recordId ? "updated" : "added"} successfully.`);
      await loadAllRecords(selectedStudent.id);
    } catch (error: unknown) {
      setPageError(getApiError(error, `Unable to save the ${getRecordTitle(formType).toLowerCase()} record.`));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !formRecordId(deleteTarget) || !selectedStudent) return;
    setIsDeleting(true);
    setPageError("");
    try {
      await deleteByType(activeType, formRecordId(deleteTarget));
      setDeleteTarget(null);
      setNotice(`${getRecordTitle(activeType)} record deleted successfully.`);
      await loadAllRecords(selectedStudent.id);
    } catch (error: unknown) {
      setPageError(getApiError(error, "Unable to delete this record."));
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return currentRecords;
    return currentRecords.filter((record) => Object.values(record as unknown as Record<string, unknown>).some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [currentRecords, search]);

  return (
    <section className="student-records-management-page">
      <header className="student-records-management-header">
        <div>
          <p className="student-records-kicker">Students</p>
          <h1>Student Records Management</h1>
          <p>Manage academic performance, examination marks, activities, discipline and promotion history.</p>
        </div>
      </header>

      {notice && <div className="student-records-notice" role="status"><Check size={17} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")} type="button"><X size={15} /></button></div>}
      {pageError && <div className="student-records-error" role="alert"><CircleAlert size={17} /><span>{pageError}</span><button onClick={() => { setPageError(""); if (selectedStudent) void loadAllRecords(selectedStudent.id); }} type="button">Dismiss</button></div>}

      <section className="student-records-student-panel panel">
        <div className="student-records-section-heading"><div><p className="student-records-section-kicker">Section A</p><h2>Select a student</h2><p>Choose a student to view and manage all associated records.</p></div><UsersRound size={22} /></div>
        <label className="student-records-student-select"><span>Student</span><select disabled={isLoadingStudents} onChange={(event) => { setSelectedStudentId(event.target.value); setSearch(""); setNotice(""); }} value={selectedStudentId}><option value="">{isLoadingStudents ? "Loading students..." : "Select a student"}</option>{students.map((student) => <option key={student.id} value={student.id}>{getStudentName(student)} · {student.admissionNumber}</option>)}</select><ChevronDown aria-hidden="true" size={16} /></label>
        {selectedStudent ? <StudentSummary student={selectedStudent} /> : <div className="student-records-selection-empty"><UsersRound size={20} /><span>Student details and records will appear after selection.</span></div>}
      </section>

      <section className="student-records-type-section">
        <div className="student-records-section-heading"><div><p className="student-records-section-kicker">Section B</p><h2>Choose a record type</h2><p>Everything is managed from this page; the student profile remains display-only.</p></div></div>
        <div className="student-record-type-grid">
          {recordTypes.map(({ type, title, description, icon: Icon }) => {
            const count = records[type].length;
            const hasError = Boolean(recordErrors[type]);
            return <article className={`student-record-type-card${activeType === type ? " is-active" : ""}`} key={type} onClick={() => { setActiveType(type); setSearch(""); }}>
              <button aria-label={`View ${title}`} className="student-record-type-select" onClick={() => { setActiveType(type); setSearch(""); }} type="button"><span className="student-record-type-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{description}</small></span></button>
              <div className="student-record-type-footer"><span className={hasError ? "has-error" : ""}>{hasError ? "Error" : `${count} record${count === 1 ? "" : "s"}`}</span>{canManage && <button className="student-record-card-add" disabled={!selectedStudent} onClick={(event) => { event.stopPropagation(); openCreate(type); }} type="button"><Plus size={13} /> Add New</button>}</div>
            </article>;
          })}
        </div>
      </section>

      <section className="student-records-management-panel panel">
        <div className="student-records-management-heading"><div><p className="student-records-section-kicker">Section C</p><h2>{getRecordTitle(activeType)}</h2><p>{selectedStudent ? `${getStudentName(selectedStudent)} · ${filteredRecords.length} record${filteredRecords.length === 1 ? "" : "s"}` : "Select a student to manage records."}</p></div>{canManage && <button className="student-records-primary-button" disabled={!selectedStudent} onClick={() => openCreate()} type="button"><Plus size={16} /> Add New</button>}</div>
        {selectedStudent && <div className="student-records-list-toolbar"><label className="student-records-search"><Search size={15} /><span className="visually-hidden">Search records</span><input onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${getRecordTitle(activeType).toLowerCase()}...`} type="search" value={search} /></label><span className="student-records-count-label">{isLoadingRecords ? "Loading..." : `${filteredRecords.length} shown`}</span></div>}
        {isLoadingRecords ? <div className="student-records-state" role="status"><LoaderCircle className="student-records-spinner" size={24} /> Loading student records...</div> : !selectedStudent ? <div className="student-records-state"><ClipboardList size={25} /><span>Select a student above to begin.</span></div> : recordErrors[activeType] ? <div className="student-records-state is-error" role="alert"><CircleAlert size={25} /><span>{recordErrors[activeType]}</span><button className="student-records-secondary-button" onClick={() => void loadAllRecords(selectedStudent.id)} type="button">Retry</button></div> : filteredRecords.length === 0 ? <div className="student-records-state"><ClipboardList size={25} /><span>No {getRecordTitle(activeType).toLowerCase()} records available for this student.</span>{canManage && <button className="student-records-secondary-button" onClick={() => openCreate()} type="button"><Plus size={14} /> Add first record</button>}</div> : <RecordTable canDelete={canDelete} canManage={canManage} records={filteredRecords} type={activeType} onDelete={setDeleteTarget} onEdit={openEdit} />}
      </section>

      {formType && selectedStudent && <StudentRecordDrawer editingRecord={editingRecord} isLoadingOptions={isLoadingOptions} isSaving={isSaving} options={options} student={selectedStudent} type={formType} onCancel={() => { if (!isSaving) { setFormType(null); setEditingRecord(null); } }} onSubmit={saveRecord} />}
      {deleteTarget && <DeleteConfirmation isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />}
    </section>
  );
}

function StudentSummary({ student }: { student: Student }) {
  return <div className="student-records-student-summary"><SummaryItem label="Student Name" value={getStudentName(student)} /><SummaryItem label="Admission Number" value={student.admissionNumber} /><SummaryItem label="Current Standard" value={student.standardName} /><SummaryItem label="Section" value={student.sectionName} /><SummaryItem label="Academic Year" value={student.academicYear} /></div>;
}

function SummaryItem({ label, value }: { label: string; value?: string }) {
  return <div><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function RecordTable({ records, type, canManage, canDelete, onEdit, onDelete }: { records: StudentRecord[]; type: StudentRecordType; canManage: boolean; canDelete: boolean; onEdit: (record: StudentRecord) => void; onDelete: (record: StudentRecord) => void }) {
  const headers = getTableHeaders(type);
  return <div className="student-records-table-wrap"><table className="student-records-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}{canManage && <th>Actions</th>}</tr></thead><tbody>{records.map((record) => <tr key={record.id}>{getTableCells(type, record).map((cell, index) => <td data-label={headers[index]} key={`${record.id}-${headers[index]}`}>{cell || "—"}</td>)}{canManage && <td><div className="student-records-row-actions"><button aria-label="Edit record" onClick={() => onEdit(record)} type="button"><Pencil size={14} /> Edit</button>{canDelete && <button aria-label="Delete record" className="is-danger" onClick={() => onDelete(record)} type="button"><X size={14} /> Delete</button>}</div></td>}</tr>)}</tbody></table></div>;
}

function StudentRecordDrawer({ type, student, options, editingRecord, isSaving, isLoadingOptions, onCancel, onSubmit }: { type: StudentRecordType; student: Student; options: StudentRecordOptions; editingRecord: StudentRecord | null; isSaving: boolean; isLoadingOptions: boolean; onCancel: () => void; onSubmit: (request: RecordRequest, id?: number) => Promise<void> }) {
  const [values, setValues] = useState<FormValues>(() => getInitialValues(type, editingRecord, student.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fromSections, setFromSections] = useState(options.classSections.from);
  const [toSections, setToSections] = useState(options.classSections.to);
  const isEditing = Boolean(editingRecord?.id);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setValues(getInitialValues(type, editingRecord, student.id));
    setErrors({});
  }, [editingRecord, student.id, type]);

  useEffect(() => {
    const yearId = Number(values.fromAcademicYearId);
    const standardId = Number(values.fromStandardId);
    if (type !== "promotion" || !yearId || !standardId) return;
    let active = true;
    getRecordClassSections(yearId, standardId).then((response) => { if (active) setFromSections(response.data); }).catch(() => { if (active) setFromSections([]); });
    return () => { active = false; };
  }, [type, values.fromAcademicYearId, values.fromStandardId]);

  useEffect(() => {
    const yearId = Number(values.toAcademicYearId);
    const standardId = Number(values.toStandardId);
    if (type !== "promotion" || !yearId || !standardId) return;
    let active = true;
    getRecordClassSections(yearId, standardId).then((response) => { if (active) setToSections(response.data); }).catch(() => { if (active) setToSections([]); });
    return () => { active = false; };
  }, [type, values.toAcademicYearId, values.toStandardId]);

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRecord(type, values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    void onSubmit(buildRequest(type, values, student.id), editingRecord?.id);
  }

  return <div className="student-records-drawer-backdrop" role="presentation"><aside aria-labelledby="student-record-drawer-title" aria-modal="true" className="student-records-drawer" role="dialog"><header className="student-records-drawer-header"><div><p className="student-records-kicker">{isEditing ? "Edit record" : "Add new record"}</p><h2 id="student-record-drawer-title">{getRecordTitle(type)}</h2><p>{getStudentName(student)} · {student.admissionNumber}</p></div><button aria-label="Close drawer" disabled={isSaving} onClick={onCancel} type="button"><X size={18} /></button></header><form className="student-records-drawer-form" noValidate onSubmit={submit}>{type === "marks" && <MarksFields errors={errors} isLoadingOptions={isLoadingOptions} options={options} values={values} onChange={updateValue} />}{type === "performance" && <PerformanceFields errors={errors} isLoadingOptions={isLoadingOptions} options={options} values={values} onChange={updateValue} />}{type === "activities" && <ActivityFields errors={errors} isLoadingOptions={isLoadingOptions} options={options.activities} values={values} onChange={updateValue} />}{type === "discipline" && <DisciplineFields errors={errors} values={values} onChange={updateValue} />}{type === "promotion" && <PromotionFields errors={errors} fromSections={fromSections} options={options} toSections={toSections} values={values} onChange={updateValue} />}{Object.values(errors).some(Boolean) && <p className="student-records-form-error" role="alert">Please correct the highlighted fields.</p>}<footer className="student-records-drawer-actions"><button className="student-records-secondary-button" disabled={isSaving} onClick={onCancel} type="button">Cancel</button><button className="student-records-primary-button" disabled={isSaving || (type === "activities" && isLoadingOptions)} type="submit">{isSaving ? <><LoaderCircle className="student-records-spinner" size={15} /> Saving...</> : isEditing ? "Save Changes" : "Add Record"}</button></footer></form></aside></div>;
}

function MarksFields({ values, errors, options, isLoadingOptions, onChange }: FieldProps & { options: StudentRecordOptions; isLoadingOptions: boolean }) {
  return <><Field error={errors.examId} label="Exam" required><select onChange={(event) => onChange("examId", event.target.value)} value={values.examId}><option value="">{isLoadingOptions ? "Loading exams..." : "Select exam"}</option>{options.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.examName} · {exam.academicYear}</option>)}</select></Field><Field error={errors.subjectId} label="Subject" required><select onChange={(event) => onChange("subjectId", event.target.value)} value={values.subjectId}><option value="">{isLoadingOptions ? "Loading subjects..." : "Select subject"}</option>{options.subjects.filter((subject) => subject.active).map((subject) => <option key={subject.id} value={subject.id}>{subject.subjectName}</option>)}</select></Field><div className="student-records-form-grid"><Field error={errors.marksObtained} label="Marks Obtained" required><input min="0" onChange={(event) => onChange("marksObtained", event.target.value)} type="number" value={values.marksObtained} /></Field><Field error={errors.maximumMarks} label="Maximum Marks" required><input min="1" onChange={(event) => onChange("maximumMarks", event.target.value)} type="number" value={values.maximumMarks} /></Field></div><Field error={errors.remarks} label="Remarks"><textarea onChange={(event) => onChange("remarks", event.target.value)} rows={3} value={values.remarks} /></Field></>;
}

function PerformanceFields({ values, errors, options, isLoadingOptions, onChange }: FieldProps & { options: StudentRecordOptions; isLoadingOptions: boolean }) {
  return <><Field error={errors.examId} label="Exam" required><select onChange={(event) => onChange("examId", event.target.value)} value={values.examId}><option value="">{isLoadingOptions ? "Loading exams..." : "Select exam"}</option>{options.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.examName} · {exam.academicYear}</option>)}</select></Field><p className="student-records-calculated-note"><BarChart3 size={15} /> Percentage, grade and result are calculated by the backend from existing marks.</p></>;
}

function ActivityFields({ values, errors, options, isLoadingOptions, onChange }: FieldProps & { options: ActivityOption[]; isLoadingOptions: boolean }) {
  return <><Field error={errors.activityId} label="Activity" required><select onChange={(event) => onChange("activityId", event.target.value)} value={values.activityId}><option value="">{isLoadingOptions ? "Loading activities..." : options.length ? "Select activity" : "No activities available"}</option>{options.filter((activity) => activity.active !== false).map((activity) => <option key={activity.id} value={activity.id}>{activity.activityName ?? activity.name ?? `Activity ${activity.id}`}</option>)}</select></Field><Field error={errors.participationDate} label="Participation Date" required><input onChange={(event) => onChange("participationDate", event.target.value)} type="date" value={values.participationDate} /></Field><div className="student-records-form-grid"><Field error={errors.role} label="Role" required><input onChange={(event) => onChange("role", event.target.value)} placeholder="Participant" value={values.role} /></Field><Field error={errors.result} label="Result" required><input onChange={(event) => onChange("result", event.target.value)} placeholder="Winner / Participant" value={values.result} /></Field></div><Field error={errors.position} label="Position"><input onChange={(event) => onChange("position", event.target.value)} placeholder="First" value={values.position} /></Field><Field error={errors.remarks} label="Remarks"><textarea onChange={(event) => onChange("remarks", event.target.value)} rows={3} value={values.remarks} /></Field></>;
}

function DisciplineFields({ values, errors, onChange }: FieldProps) {
  return <><Field error={errors.incidentDate} label="Incident Date" required><input onChange={(event) => onChange("incidentDate", event.target.value)} type="date" value={values.incidentDate} /></Field><Field error={errors.incidentType} label="Incident Type" required><input onChange={(event) => onChange("incidentType", event.target.value)} value={values.incidentType} /></Field><Field error={errors.description} label="Description" required><textarea onChange={(event) => onChange("description", event.target.value)} rows={4} value={values.description} /></Field><Field error={errors.actionTaken} label="Action Taken" required><input onChange={(event) => onChange("actionTaken", event.target.value)} value={values.actionTaken} /></Field><Field error={errors.remarks} label="Remarks"><textarea onChange={(event) => onChange("remarks", event.target.value)} rows={3} value={values.remarks} /></Field><label className="student-records-checkbox"><input checked={values.resolved === "true"} onChange={(event) => onChange("resolved", String(event.target.checked))} type="checkbox" /><span><strong>Resolved</strong><small>Mark this incident as resolved.</small></span></label></>;
}

function PromotionFields({ values, errors, options, fromSections, toSections, onChange }: FieldProps & { options: StudentRecordOptions; fromSections: { id: number; sectionName: string }[]; toSections: { id: number; sectionName: string }[] }) {
  return <><p className="student-records-form-subheading">Previous placement</p><div className="student-records-form-grid"><IdSelect error={errors.fromAcademicYearId} label="Academic Year" options={options.academicYears.map((year) => ({ id: year.id, label: year.academicYear }))} value={values.fromAcademicYearId} onChange={(value) => onChange("fromAcademicYearId", value)} /><IdSelect error={errors.fromStandardId} label="Standard" options={options.standards.map((standard) => ({ id: standard.id, label: standard.standardName }))} value={values.fromStandardId} onChange={(value) => onChange("fromStandardId", value)} /></div><IdSelect error={errors.fromClassSectionId} label="Class Section" options={fromSections.map((section) => ({ id: section.id, label: section.sectionName }))} value={values.fromClassSectionId} onChange={(value) => onChange("fromClassSectionId", value)} /><p className="student-records-form-subheading">Promoted placement</p><div className="student-records-form-grid"><IdSelect error={errors.toAcademicYearId} label="Academic Year" options={options.academicYears.map((year) => ({ id: year.id, label: year.academicYear }))} value={values.toAcademicYearId} onChange={(value) => onChange("toAcademicYearId", value)} /><IdSelect error={errors.toStandardId} label="Standard" options={options.standards.map((standard) => ({ id: standard.id, label: standard.standardName }))} value={values.toStandardId} onChange={(value) => onChange("toStandardId", value)} /></div><IdSelect error={errors.toClassSectionId} label="Class Section" options={toSections.map((section) => ({ id: section.id, label: section.sectionName }))} value={values.toClassSectionId} onChange={(value) => onChange("toClassSectionId", value)} /><Field error={errors.status} label="Status" required><input onChange={(event) => onChange("status", event.target.value)} placeholder="PROMOTED" value={values.status} /></Field><Field error={errors.remarks} label="Remarks"><textarea onChange={(event) => onChange("remarks", event.target.value)} rows={3} value={values.remarks} /></Field></>;
}

function IdSelect({ label, error, value, options, onChange }: { label: string; error?: string; value: string; options: Array<{ id: number; label: string }>; onChange: (value: string) => void }) {
  return <Field error={error} label={label} required><select onChange={(event) => onChange(event.target.value)} value={value}><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>;
}

type FieldProps = { values: FormValues; errors: Record<string, string>; onChange: (name: string, value: string) => void };

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <label className="student-records-field"><span>{label}{required && " *"}</span>{children}{error && <small role="alert">{error}</small>}</label>;
}

function DeleteConfirmation({ isDeleting, onCancel, onConfirm }: { isDeleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="student-records-dialog-backdrop" role="presentation"><section aria-modal="true" className="student-records-confirm-dialog" role="alertdialog"><div><p className="student-records-kicker">Delete record</p><h2>Are you sure?</h2><p>This record will be permanently removed.</p></div><div className="student-records-drawer-actions"><button className="student-records-secondary-button" disabled={isDeleting} onClick={onCancel} type="button">Cancel</button><button className="student-records-delete-button" disabled={isDeleting} onClick={onConfirm} type="button">{isDeleting ? "Deleting..." : "Delete record"}</button></div></section></div>;
}

async function saveByType(type: StudentRecordType, request: RecordRequest, id?: number) {
  if (type === "marks") return id ? updateStudentMarks(id, request as StudentMarksRequest) : createStudentMarks(request as StudentMarksRequest);
  if (type === "performance") return id ? updateStudentPerformance(id, request as StudentPerformanceRequest) : createStudentPerformance(request as StudentPerformanceRequest);
  if (type === "activities") return id ? updateStudentActivity(id, request as StudentActivityRequest) : createStudentActivity(request as StudentActivityRequest);
  if (type === "discipline") return id ? updateStudentDiscipline(id, request as StudentDisciplineRequest) : createStudentDiscipline(request as StudentDisciplineRequest);
  return id ? updateStudentPromotion(id, request as StudentPromotionRequest) : createStudentPromotion(request as StudentPromotionRequest);
}

async function deleteByType(type: StudentRecordType, id: number) {
  if (type === "marks") return deleteStudentMarks(id);
  if (type === "performance") return deleteStudentPerformance(id);
  if (type === "activities") return deleteStudentActivity(id);
  if (type === "discipline") return deleteStudentDiscipline(id);
  return deleteStudentPromotion(id);
}

function getInitialValues(type: StudentRecordType, record: StudentRecord | null, studentId: number): FormValues {
  const data = (record ?? {}) as unknown as Record<string, unknown>;
  const value = (key: string, fallback = "") => String(data[key] ?? fallback);
  if (type === "marks") return { studentId: String(studentId), examId: value("examId"), subjectId: value("subjectId"), marksObtained: value("marksObtained"), maximumMarks: value("maximumMarks", value("totalMarks")), remarks: value("remarks") };
  if (type === "performance") return { studentId: String(studentId), examId: value("examId") };
  if (type === "activities") return { studentId: String(studentId), activityId: value("activityId"), participationDate: value("participationDate"), role: value("role"), result: value("result"), position: value("position"), remarks: value("remarks") };
  if (type === "discipline") return { studentId: String(studentId), incidentDate: value("incidentDate"), incidentType: value("incidentType"), description: value("description"), actionTaken: value("actionTaken"), remarks: value("remarks"), resolved: value("resolved", "false") };
  return { studentId: String(studentId), fromAcademicYearId: value("fromAcademicYearId"), fromStandardId: value("fromStandardId"), fromClassSectionId: value("fromClassSectionId"), toAcademicYearId: value("toAcademicYearId"), toStandardId: value("toStandardId"), toClassSectionId: value("toClassSectionId"), status: value("status"), remarks: value("remarks") };
}

function validateRecord(type: StudentRecordType, values: FormValues) {
  const errors: Record<string, string> = {};
  if (type === "marks") {
    if (!values.examId) errors.examId = "Exam is required.";
    if (!values.subjectId) errors.subjectId = "Subject is required.";
    const marks = Number(values.marksObtained);
    const maximum = Number(values.maximumMarks);
    if (!values.marksObtained || !Number.isFinite(marks) || marks < 0) errors.marksObtained = "Marks obtained are required.";
    if (!values.maximumMarks || !Number.isFinite(maximum) || maximum <= 0) errors.maximumMarks = "Maximum marks must be greater than zero.";
    if (Number.isFinite(marks) && Number.isFinite(maximum) && marks > maximum) errors.marksObtained = "Marks obtained cannot exceed maximum marks.";
  }
  if (type === "performance" && !values.examId) errors.examId = "Exam is required.";
  if (type === "activities") for (const field of ["activityId", "participationDate", "role", "result"]) if (!values[field]?.trim()) errors[field] = `${field === "activityId" ? "Activity" : field} is required.`;
  if (type === "discipline") for (const field of ["incidentDate", "incidentType", "description", "actionTaken"]) if (!values[field]?.trim()) errors[field] = `${field} is required.`;
  if (type === "promotion") for (const field of ["fromAcademicYearId", "fromStandardId", "fromClassSectionId", "toAcademicYearId", "toStandardId", "toClassSectionId", "status"]) if (!values[field]?.trim()) errors[field] = `${field.replace(/Id$/, "")} is required.`;
  return errors;
}

function buildRequest(type: StudentRecordType, values: FormValues, studentId: number): RecordRequest {
  if (type === "marks") return { studentId, examId: Number(values.examId), subjectId: Number(values.subjectId), marksObtained: Number(values.marksObtained), maximumMarks: Number(values.maximumMarks), remarks: values.remarks.trim() };
  if (type === "performance") return { studentId, examId: Number(values.examId) };
  if (type === "activities") return { studentId, activityId: Number(values.activityId), participationDate: values.participationDate, role: values.role.trim(), result: values.result.trim(), position: values.position.trim(), remarks: values.remarks.trim() };
  if (type === "discipline") return { studentId, incidentDate: values.incidentDate, incidentType: values.incidentType.trim(), description: values.description.trim(), actionTaken: values.actionTaken.trim(), remarks: values.remarks.trim(), resolved: values.resolved === "true" };
  return { studentId, fromAcademicYearId: Number(values.fromAcademicYearId), fromStandardId: Number(values.fromStandardId), fromClassSectionId: Number(values.fromClassSectionId), toAcademicYearId: Number(values.toAcademicYearId), toStandardId: Number(values.toStandardId), toClassSectionId: Number(values.toClassSectionId), status: values.status.trim(), remarks: values.remarks.trim() };
}

function extractRecords(type: StudentRecordType, data: unknown): StudentRecord[] {
  if (Array.isArray(data)) return data as StudentRecord[];
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  const keys: Record<StudentRecordType, string[]> = { marks: ["studentMarks", "marks"], performance: ["studentPerformance", "performance"], activities: ["studentActivitiesParticipation", "activities"], discipline: ["disciplinaryRecords", "discipline"], promotion: ["studentPromotionHistory", "promotionHistory"] };
  for (const key of keys[type]) if (Array.isArray(object[key])) return object[key] as StudentRecord[];
  return "id" in object ? [object as unknown as StudentRecord] : [];
}

function getTableHeaders(type: StudentRecordType) {
  if (type === "marks") return ["Exam", "Subject", "Marks Obtained", "Maximum Marks", "Remarks"];
  if (type === "performance") return ["Exam", "Percentage", "Grade", "Result"];
  if (type === "activities") return ["Activity", "Participation Date", "Role", "Result", "Position", "Remarks"];
  if (type === "discipline") return ["Incident Date", "Type", "Description", "Action Taken", "Remarks", "Status"];
  return ["From Academic Year", "From Standard", "From Section", "To Academic Year", "To Standard", "To Section", "Status", "Remarks"];
}

function getTableCells(type: StudentRecordType, record: StudentRecord): string[] {
  const value = (key: string, fallback = "") => String((record as unknown as Record<string, unknown>)[key] ?? fallback);
  if (type === "marks") return [value("examName"), value("subjectName"), value("marksObtained"), value("maximumMarks", value("totalMarks")), value("remarks")];
  if (type === "performance") return [value("examName"), value("percentage"), value("grade"), value("resultStatus")];
  if (type === "activities") return [value("activityName", value("activityId")), formatDate(value("participationDate")), value("role"), value("result"), value("position"), value("remarks")];
  if (type === "discipline") return [formatDate(value("incidentDate")), value("incidentType"), value("description"), value("actionTaken"), value("remarks"), value("status", value("resolved") === "true" ? "Resolved" : "Unresolved")];
  return [value("fromAcademicYear"), value("fromStandard"), value("fromSection"), value("toAcademicYear"), value("toStandard"), value("toSection"), value("status"), value("remarks")];
}

function getRecordTitle(type: StudentRecordType) {
  return recordTypes.find((recordType) => recordType.type === type)?.title ?? "Student Record";
}

function getStudentName(student: Student) {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formRecordId(record: StudentRecord) {
  return record.id;
}

function getApiError(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback;
  const data: unknown = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;
    const message = [object.message, object.error, object.detail].find((item): item is string => typeof item === "string" && Boolean(item.trim()));
    if (message) return message;
  }
  if (error.response?.status === 403) return "You do not have permission to perform this action.";
  if (!error.response) return "Unable to reach the server. Please try again.";
  return fallback;
}
