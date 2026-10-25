import axios from "axios";
import {
  BookOpen,
  Check,
  CircleAlert,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  createSubject,
  deleteSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
} from "../../services/subjectService";
import { useAuth } from "../../context/AuthContext";
import type { SubjectRequest, SubjectResponse } from "../../types/subject";
import "./Subjects.css";

type StatusFilter = "all" | "active" | "inactive";
type SubjectField = "subjectName" | "subjectCode" | "description";

export function SubjectsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN";
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectResponse | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [isLoadingSubject, setIsLoadingSubject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SubjectField, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<SubjectResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadSubjects() {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await getAllSubjects();
      setSubjects(response.data);
    } catch (error: unknown) {
      setLoadError(getApiError(error, "Unable to load subjects.").message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;
    getAllSubjects()
      .then((response) => {
        if (isCurrent) setSubjects(response.data);
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(getApiError(error, "Unable to load subjects.").message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const activeCount = subjects.filter((subject) => subject.active).length;
  const inactiveCount = subjects.length - activeCount;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subject) => {
        const matchesSearch =
          subject.subjectName.toLowerCase().includes(normalizedSearch) ||
          subject.subjectCode.toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? subject.active : !subject.active);
        return matchesSearch && matchesStatus;
      }),
    [subjects, normalizedSearch, statusFilter],
  );

  function openCreateForm() {
    setEditingSubject(null);
    setEditingSubjectId(null);
    setFormError("");
    setFieldErrors({});
    setIsLoadingSubject(false);
    setIsFormOpen(true);
  }

  async function openEditForm(subject: SubjectResponse) {
    setIsFormOpen(true);
    setEditingSubject(null);
    setEditingSubjectId(subject.id);
    setIsLoadingSubject(true);
    setFormError("");
    setFieldErrors({});
    try {
      const response = await getSubjectById(subject.id);
      setEditingSubject(response.data);
    } catch (error: unknown) {
      setFormError(getApiError(error, "Unable to load this subject.").message);
    } finally {
      setIsLoadingSubject(false);
    }
  }

  async function saveSubject(request: SubjectRequest) {
    setIsSaving(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingSubjectId !== null) {
        await updateSubject(editingSubjectId, request);
      } else {
        await createSubject(request);
      }
      const wasEditing = editingSubjectId !== null;
      setIsFormOpen(false);
      setNotice(wasEditing ? "Subject updated successfully." : "Subject created successfully.");
      await loadSubjects();
    } catch (error: unknown) {
      const apiError = getApiError(error, "Unable to save the subject.");
      setFormError(apiError.message);
      setFieldErrors(apiError.fieldErrors);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteSubject(deleteTarget.id);
      setNotice("Subject deleted successfully.");
      setDeleteTarget(null);
      await loadSubjects();
    } catch (error: unknown) {
      setDeleteError(getApiError(error, "Unable to delete the subject.").message);
    } finally {
      setIsDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  const hasFilters = normalizedSearch.length > 0 || statusFilter !== "all";

  return (
    <section className="subjects-page">
      <header className="subjects-page-header">
        <div>
          <p className="subjects-eyebrow">Academic setup</p>
          <h1>Subject Management</h1>
          <p className="subjects-subtitle">
            Manage the subjects available across your school.
          </p>
        </div>
        {canManage && (
          <button className="subjects-primary-button" onClick={openCreateForm} type="button">
            <Plus aria-hidden="true" size={17} />
            Add Subject
          </button>
        )}
      </header>

      {notice && (
        <div className="subjects-notice" role="status">
          <Check aria-hidden="true" size={17} />
          <span>{notice}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice("")} type="button">
            <X size={16} />
          </button>
        </div>
      )}

      <section aria-label="Subject totals" className="subjects-stats">
        <SubjectStat icon={<BookOpen size={19} />} label="Total subjects" value={subjects.length} tone="purple" />
        <SubjectStat icon={<Check size={19} />} label="Active subjects" value={activeCount} tone="green" />
        <SubjectStat icon={<CircleAlert size={19} />} label="Inactive subjects" value={inactiveCount} tone="orange" />
      </section>

      <section aria-labelledby="subjects-list-title" className="subjects-panel">
        <div className="subjects-panel-heading">
          <div>
            <h2 id="subjects-list-title">Subject catalogue</h2>
            <p>Browse and manage your school subjects.</p>
          </div>
          <button
            aria-label="Refresh subjects"
            className="subjects-refresh-button"
            disabled={isLoading}
            onClick={() => void loadSubjects()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={15} />
            Refresh
          </button>
        </div>

        <div className="subjects-toolbar">
          <label className="subjects-search">
            <Search aria-hidden="true" size={16} />
            <span className="visually-hidden">Search subjects by name or code</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by subject name or code..."
              type="search"
              value={search}
            />
          </label>
          <label className="subjects-status-filter">
            <Filter aria-hidden="true" size={15} />
            <span className="visually-hidden">Filter subjects by status</span>
            <select
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          {hasFilters && (
            <button className="subjects-clear-button" onClick={clearFilters} type="button">
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="subjects-state" role="status">
            <LoaderCircle aria-hidden="true" className="subjects-spinner" size={23} />
            <span>Loading subjects...</span>
          </div>
        ) : loadError ? (
          <div className="subjects-state subjects-state-error" role="alert">
            <CircleAlert aria-hidden="true" size={22} />
            <p>{loadError}</p>
            <button className="subjects-secondary-button" onClick={() => void loadSubjects()} type="button">
              Try again
            </button>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="subjects-state">
            <div className="subjects-empty-icon"><BookOpen aria-hidden="true" size={22} /></div>
            <h3>{hasFilters ? "No subjects match your filters" : "No subjects yet"}</h3>
            <p>
              {hasFilters
                ? "Try a different search or clear your filters."
                : "Subjects added to your catalogue will appear here."}
            </p>
            {hasFilters ? (
              <button className="subjects-secondary-button" onClick={clearFilters} type="button">
                Clear filters
              </button>
            ) : canManage ? (
              <button className="subjects-secondary-button" onClick={openCreateForm} type="button">
                <Plus size={15} /> Add your first subject
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="subjects-table-wrap">
              <table className="subjects-table">
                <thead>
                  <tr>
                    <th scope="col">Subject name</th>
                    <th scope="col">Subject code</th>
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    {canManage && <th scope="col">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.id}>
                      <td data-label="Subject name">
                        <span className="subjects-name-cell">
                          <span className="subjects-name-icon"><BookOpen aria-hidden="true" size={16} /></span>
                          <strong>{subject.subjectName}</strong>
                        </span>
                      </td>
                      <td data-label="Subject code">
                        <span className="subjects-code">{subject.subjectCode}</span>
                      </td>
                      <td className="subjects-description" data-label="Description">
                        {subject.subjectDescription?.trim() || "—"}
                      </td>
                      <td data-label="Status">
                        <span className={`subjects-status ${subject.active ? "is-active" : "is-inactive"}`}>
                          <span aria-hidden="true" />
                          {subject.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canManage && (
                        <td data-label="Actions">
                          <div className="subjects-row-actions">
                            <button
                              aria-label={`Edit ${subject.subjectName}`}
                              onClick={() => void openEditForm(subject)}
                              type="button"
                            >
                              <Pencil aria-hidden="true" size={15} />
                              <span>Edit</span>
                            </button>
                            <button
                              aria-label={`Delete ${subject.subjectName}`}
                              className="is-danger"
                              onClick={() => {
                                setDeleteTarget(subject);
                                setDeleteError("");
                              }}
                              type="button"
                            >
                              <Trash2 aria-hidden="true" size={15} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="subjects-result-count">
              Showing {filteredSubjects.length} of {subjects.length} subjects
            </p>
          </>
        )}
      </section>

      {isFormOpen && (
        <SubjectFormDialog
          error={formError}
          fieldErrors={fieldErrors}
          isEditing={editingSubjectId !== null}
          isLoadingSubject={isLoadingSubject}
          isSaving={isSaving}
          key={editingSubject?.id ?? (editingSubjectId !== null ? "editing" : "new")}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={saveSubject}
          subject={editingSubject}
        />
      )}
      {deleteTarget && (
        <DeleteSubjectDialog
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          subject={deleteTarget}
        />
      )}
    </section>
  );
}

function SubjectStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "purple" | "green" | "orange";
}) {
  return (
    <article className="subjects-stat-card">
      <span className={`subjects-stat-icon ${tone}`}>{icon}</span>
      <span className="subjects-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </article>
  );
}

function SubjectFormDialog({
  subject,
  isEditing,
  isLoadingSubject,
  isSaving,
  error,
  fieldErrors,
  onCancel,
  onSubmit,
}: {
  subject: SubjectResponse | null;
  isEditing: boolean;
  isLoadingSubject: boolean;
  isSaving: boolean;
  error: string;
  fieldErrors: Partial<Record<SubjectField, string>>;
  onCancel: () => void;
  onSubmit: (request: SubjectRequest) => Promise<void>;
}) {
  const [subjectName, setSubjectName] = useState(subject?.subjectName ?? "");
  const [subjectCode, setSubjectCode] = useState(subject?.subjectCode ?? "");
  const [description, setDescription] = useState(subject?.subjectDescription ?? "");
  const [active, setActive] = useState(subject?.active ?? true);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<SubjectField, string>>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const trimmed = {
      subjectName: subjectName.trim(),
      subjectCode: subjectCode.trim(),
      description: description.trim(),
    };
    const nextErrors: Partial<Record<SubjectField, string>> = {};
    if (!trimmed.subjectName) nextErrors.subjectName = "Subject name is required.";
    else if (trimmed.subjectName.length > 100) nextErrors.subjectName = "Subject name cannot exceed 100 characters.";
    if (!trimmed.subjectCode) nextErrors.subjectCode = "Subject code is required.";
    else if (trimmed.subjectCode.length > 20) nextErrors.subjectCode = "Subject code cannot exceed 20 characters.";
    if (trimmed.description.length > 500) nextErrors.description = "Description cannot exceed 500 characters.";
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    void onSubmit({ ...trimmed, active });
  }

  return (
    <div className="subjects-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSaving) onCancel();
    }} role="presentation">
      <section
        aria-labelledby="subject-form-title"
        aria-modal="true"
        className="subjects-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isSaving) onCancel();
        }}
        role="dialog"
      >
        <div className="subjects-dialog-heading">
          <div>
            <p className="subjects-eyebrow">Subject catalogue</p>
            <h2 id="subject-form-title">{isEditing ? "Edit Subject" : "Add Subject"}</h2>
          </div>
          <button aria-label="Close subject form" disabled={isSaving} onClick={onCancel} type="button">
            <X size={18} />
          </button>
        </div>
        {isLoadingSubject ? (
          <div className="subjects-dialog-loading" role="status">
            <LoaderCircle className="subjects-spinner" size={21} /> Loading subject details...
          </div>
        ) : isEditing && !subject ? (
          <>
            {error && <p className="subjects-form-error" role="alert">{error}</p>}
            <div className="subjects-dialog-actions">
              <button className="subjects-secondary-button" onClick={onCancel} type="button">Close</button>
            </div>
          </>
        ) : (
          <>
            {error && <p className="subjects-form-error" role="alert">{error}</p>}
            <form className="subjects-form" noValidate onSubmit={submit}>
              <SubjectField error={validationErrors.subjectName ?? fieldErrors.subjectName} label="Subject Name" required>
                <input
                  aria-invalid={Boolean(validationErrors.subjectName ?? fieldErrors.subjectName)}
                  autoComplete="off"
                  maxLength={100}
                  onChange={(event) => setSubjectName(event.target.value)}
                  value={subjectName}
                />
              </SubjectField>
              <SubjectField error={validationErrors.subjectCode ?? fieldErrors.subjectCode} label="Subject Code" required>
                <input
                  aria-invalid={Boolean(validationErrors.subjectCode ?? fieldErrors.subjectCode)}
                  autoComplete="off"
                  maxLength={20}
                  onChange={(event) => setSubjectCode(event.target.value)}
                  value={subjectCode}
                />
              </SubjectField>
              <SubjectField error={validationErrors.description ?? fieldErrors.description} label="Description">
                <textarea
                  aria-invalid={Boolean(validationErrors.description ?? fieldErrors.description)}
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  value={description}
                />
                <span className="subjects-character-count">{description.length}/500</span>
              </SubjectField>
              <label className="subjects-active-toggle">
                <input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
                <span>
                  <strong>Active</strong>
                  <small>Make this subject available for use.</small>
                </span>
              </label>
              <div className="subjects-dialog-actions">
                <button className="subjects-secondary-button" disabled={isSaving} onClick={onCancel} type="button">
                  Cancel
                </button>
                <button className="subjects-primary-button" disabled={isSaving} type="submit">
                  {isSaving ? <><LoaderCircle className="subjects-spinner" size={16} /> Saving...</> : isEditing ? "Save Changes" : "Create Subject"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function SubjectField({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="subjects-field">
      <span>{label}{required && " *"}</span>
      {children}
      {error && <small className="subjects-field-error" role="alert">{error}</small>}
    </label>
  );
}

function DeleteSubjectDialog({
  subject,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: {
  subject: SubjectResponse;
  isDeleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="subjects-dialog-backdrop" role="presentation">
      <section aria-labelledby="delete-subject-title" aria-modal="true" className="subjects-dialog subjects-confirm-dialog" role="alertdialog">
        <div className="subjects-dialog-heading">
          <div>
            <p className="subjects-eyebrow">Delete subject</p>
            <h2 id="delete-subject-title">Are you sure?</h2>
          </div>
          <button aria-label="Close confirmation" disabled={isDeleting} onClick={onCancel} type="button">
            <X size={18} />
          </button>
        </div>
        <p className="subjects-delete-copy">
          Delete <strong>{subject.subjectName}</strong> ({subject.subjectCode})? This action cannot be undone.
        </p>
        {error && <p className="subjects-form-error" role="alert">{error}</p>}
        <div className="subjects-dialog-actions">
          <button className="subjects-secondary-button" disabled={isDeleting} onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="subjects-delete-button" disabled={isDeleting} onClick={onConfirm} type="button">
            {isDeleting ? <><LoaderCircle className="subjects-spinner" size={16} /> Deleting...</> : <><Trash2 size={15} /> Delete subject</>}
          </button>
        </div>
      </section>
    </div>
  );
}

function getApiError(
  error: unknown,
  fallback: string,
): { message: string; fieldErrors: Partial<Record<SubjectField, string>> } {
  const fieldErrors: Partial<Record<SubjectField, string>> = {};
  if (!axios.isAxiosError(error)) return { message: fallback, fieldErrors };

  const data: unknown = error.response?.data;
  if (typeof data === "string" && data.trim()) {
    return { message: data, fieldErrors };
  }
  if (isRecord(data)) {
    const nestedErrors = isRecord(data.errors) ? data.errors : isRecord(data.fieldErrors) ? data.fieldErrors : data;
    for (const field of ["subjectName", "subjectCode", "description"] as const) {
      const fieldMessage = nestedErrors[field];
      if (typeof fieldMessage === "string" && fieldMessage.trim()) {
        fieldErrors[field] = fieldMessage;
      } else if (Array.isArray(fieldMessage) && typeof fieldMessage[0] === "string") {
        fieldErrors[field] = fieldMessage[0];
      }
    }
    const message = [data.message, data.error, data.detail].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    if (message) return { message, fieldErrors };
    if (Object.keys(fieldErrors).length > 0) {
      return { message: "Please correct the highlighted subject information.", fieldErrors };
    }
  }

  if (error.response?.status === 403) return { message: "You do not have permission to perform this action.", fieldErrors };
  if (error.response?.status === 404) return { message: "The requested subject was not found.", fieldErrors };
  if (error.response?.status === 409) return { message: "A subject with this name or code already exists.", fieldErrors };
  if (error.response?.status === 400 || error.response?.status === 422) {
    return { message: "Please check the subject information and try again.", fieldErrors };
  }
  if (error.response?.status && error.response.status >= 500) {
    return { message: "The server could not complete this request. Please try again.", fieldErrors };
  }
  if (!error.response) return { message: "Unable to reach the server. Please try again.", fieldErrors };
  return { message: fallback, fieldErrors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
