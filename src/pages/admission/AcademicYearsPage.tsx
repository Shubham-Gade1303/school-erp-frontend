import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlert, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  createAcademicYear,
  deleteAcademicYear,
  getAcademicYears,
  updateAcademicYear,
} from "../../services/admissionService";
import type { AcademicYear, AcademicYearRequest } from "../../types/admission";
import { DeleteAcademicYearDialog } from "./components/DeleteAcademicYearDialog";
import { AcademicYearDialog } from "./components/AcademicYearDialog";
import { getErrorMessage, normalizeList } from "./utils/format";
import "./AcademicYearsPage.css";

export function AcademicYearsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [editor, setEditor] = useState<AcademicYear | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    let active = true;
    getAcademicYears().then((response) => {
      if (active) setAcademicYears(normalizeList<AcademicYear>(response.data));
    }).catch((loadError: unknown) => {
      if (active) setError(getErrorMessage(loadError, "Unable to load academic years."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user?.role]);

  if (user?.role !== "ADMIN") {
    return <main className="academic-years-page"><p className="academic-years-error" role="alert">Academic year management is available to administrators only.</p></main>;
  }

  async function saveAcademicYear(request: AcademicYearRequest) {
    setSaving(true);
    setError("");
    try {
      const response = editor?.id
        ? await updateAcademicYear(editor.id, request)
        : await createAcademicYear(request);
      setAcademicYears((current) => editor?.id
        ? current.map((year) => year.id === response.data.id ? response.data : year)
        : [...current, response.data]);
      setEditor(undefined);
      setNotice(editor?.id ? "Academic year updated." : "Academic year created.");
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Unable to save academic year."));
    } finally {
      setSaving(false);
    }
  }

  async function removeAcademicYear() {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      await deleteAcademicYear(deleteTarget.id);
      setAcademicYears((current) => current.filter((year) => year.id !== deleteTarget.id));
      setDeleteTarget(null);
      setNotice("Academic year deleted.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Unable to delete academic year."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="academic-years-page">
      <header className="academic-years-heading">
        <div>
          <p className="academic-eyebrow">Academic setup</p>
          <h1>Academic Years</h1>
          <p>Create and maintain the academic years used throughout the school.</p>
        </div>
        <button className="academic-primary-button" onClick={() => setEditor(null)} type="button">+ Add Academic Year</button>
      </header>
      {notice && <p className="academic-years-notice" role="status">{notice}</p>}
      {error && <p className="academic-years-error" role="alert"><CircleAlert size={16} /> {error}</p>}
      <section className="academic-years-card">
        <div className="academic-years-card-title"><GraduationCap size={20} /><h2>Academic year records</h2></div>
        {loading ? <p className="academic-years-empty">Loading academic years...</p> : academicYears.length ? (
          <div className="academic-years-table-wrap">
            <table>
              <thead><tr><th>Academic Year</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {academicYears.map((year) => (
                  <tr key={year.id}>
                    <td><strong>{year.academicYear}</strong></td>
                    <td>{year.startDate}</td>
                    <td>{year.endDate}</td>
                    <td><span className={year.active ? "year-status active" : "year-status inactive"}>{year.active ? "Active" : "Inactive"}</span></td>
                    <td><div className="academic-year-actions">
                      <button className="academic-text-button" onClick={() => setEditor(year)} type="button">Edit</button>
                      <button className="academic-text-button danger-text" onClick={() => setDeleteTarget(year)} type="button">Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="academic-years-empty">No academic years found. Add the first academic year to continue.</p>}
      </section>
      <footer className="academic-years-footer">
        <button className="academic-secondary-button" onClick={() => navigate("/admin/admission")} type="button">Back to Admission</button>
      </footer>
      {editor !== undefined && <AcademicYearDialog academicYear={editor} saving={saving} onCancel={() => setEditor(undefined)} onSubmit={(request) => void saveAcademicYear(request)} />}
      {deleteTarget && <DeleteAcademicYearDialog academicYear={deleteTarget} deleting={saving} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeAcademicYear()} />}
    </main>
  );
}
