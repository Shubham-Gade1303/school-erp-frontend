import axios from "axios";
import { Plus, RefreshCw, Search, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createTeacher, deleteTeacher, getAllTeachers, updateTeacher } from "../../services/teacherService";
import type { TeacherRequest, TeacherResponse } from "../../types/teacher";
import { DeleteTeacherDialog } from "../../components/teachers/DeleteTeacherDialog";
import { TeacherDetails } from "../../components/teachers/TeacherDetails";
import { TeacherForm } from "../../components/teachers/TeacherForm";
import { TeacherTable } from "../../components/teachers/TeacherTable";

export function TeachersPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formTeacher, setFormTeacher] = useState<TeacherResponse | null | undefined>(undefined);
  const [detailsTeacher, setDetailsTeacher] = useState<TeacherResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherResponse | null>(null);

  const canManage = user?.role === "ADMIN" || user?.role === "PRINCIPAL";

  async function loadTeachers() {
    setIsLoading(true);
    setError("");
    try {
      const response = await getAllTeachers();
      setTeachers(response.data);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load teachers."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTeachers();
  }, []);

  async function handleSave(request: TeacherRequest) {
    setIsSaving(true);
    setError("");
    try {
      if (formTeacher) await updateTeacher(formTeacher.id, request);
      else await createTeacher(request);
      setFormTeacher(undefined);
      setNotice(formTeacher ? "Teacher updated successfully." : "Teacher created successfully.");
      await loadTeachers();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save teacher."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteTeacher(deleteTarget.id);
      setDeleteTarget(null);
      setNotice("Teacher deleted successfully.");
      await loadTeachers();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Unable to delete teacher."));
    } finally {
      setIsDeleting(false);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredTeachers = teachers.filter((teacher) => teacher.fullName.toLowerCase().includes(normalizedSearch));
  const activeTeachers = teachers.filter((teacher) => teacher.active).length;
  const inactiveTeachers = teachers.length - activeTeachers;

  return (
    <section className="teacher-management-page">
      <div className="management-heading teacher-page-heading">
        <div><p className="eyebrow">Teacher directory</p><h1>Teachers</h1><p>Manage teachers and their information.</p></div>
        {canManage && <button className="primary-button" onClick={() => setFormTeacher(null)} type="button"><Plus size={16} /> Add Teacher</button>}
      </div>
      {notice && <p className="success-message" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="teacher-stat-grid">
        <TeacherStat label="Total Teachers" value={teachers.length} />
        <TeacherStat label="Active Teachers" value={activeTeachers} />
        <TeacherStat label="Inactive Teachers" value={inactiveTeachers} />
      </div>
      <section className="panel teacher-table-panel">
        <div className="teacher-toolbar">
          <label className="search-box teacher-search-box"><Search size={15} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search teachers by name..." value={search} /></label>
          <button className="refresh-link refresh-button" disabled={isLoading} onClick={() => void loadTeachers()} type="button"><RefreshCw size={14} /> Refresh</button>
        </div>
        {isLoading ? <p className="empty-state">Loading teachers...</p> : filteredTeachers.length === 0 ? (
          <div className="empty-state"><p>{normalizedSearch ? "No teachers match your search." : "No teachers found."}</p>{normalizedSearch && <button className="secondary-button" onClick={() => setSearch("")} type="button">Clear Search</button>}</div>
        ) : <TeacherTable canManage={canManage} onDelete={setDeleteTarget} onEdit={setFormTeacher} onView={setDetailsTeacher} teachers={filteredTeachers} />}
      </section>
      {formTeacher !== undefined && <div className="dialog-backdrop" role="presentation"><section aria-labelledby="teacher-form-title" className="dialog-card" role="dialog"><div className="dialog-heading"><div><p className="eyebrow">Teacher directory</p><h2 id="teacher-form-title">{formTeacher ? "Edit Teacher" : "Add Teacher"}</h2></div></div><TeacherForm isSaving={isSaving} onCancel={() => setFormTeacher(undefined)} onSubmit={handleSave} teacher={formTeacher} /></section></div>}
      {detailsTeacher && <TeacherDetails onClose={() => setDetailsTeacher(null)} teacher={detailsTeacher} />}
      {deleteTarget && <DeleteTeacherDialog isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} teacher={deleteTarget} />}
    </section>
  );
}

function TeacherStat({ label, value }: { label: string; value: number }) {
  return <article className="stat-card teacher-summary-card"><div className="stat-icon purple"><UsersRound size={19} /></div><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const responseData = error.response?.data;
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  if (responseData && typeof responseData === "object") {
    const message = responseData.message ?? responseData.error ?? responseData.detail;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error.response?.status === 403) return "You do not have permission to perform this action.";
  if (error.response?.status === 404) return "The requested teacher was not found.";
  if (error.response?.status === 409) return "This teacher conflicts with an existing record.";
  if (error.response?.status === 400) return "Please check the teacher information and try again.";
  if (error.response?.status && error.response.status >= 500) return "The server could not complete this request.";
  if (!error.response) return "Unable to reach the server. Please try again.";
  return fallback;
}
