import { useState, type ChangeEvent } from "react";
import { FileText } from "lucide-react";
import { DocumentDownloadButton } from "../../../components/DocumentDownloadButton";
import {
  DOCUMENT_TYPES,
  type DocumentDraft,
  type DocumentRecord,
} from "../../../types/admission";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { RecordEditor } from "../components/RecordEditor";
import { StepIntro } from "../components/StepIntro";
import { formatDate } from "../utils/format";

const maxFileSize = 1 * 1024 * 1024;
const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];

export function DocumentsStep({
  studentId,
  documents,
  draft,
  saving,
  onDraft,
  onSave,
  onRemove,
}: {
  studentId: number;
  documents: DocumentRecord[];
  draft: DocumentDraft | null;
  saving: boolean;
  onDraft: (draft: DocumentDraft | null) => void;
  onSave: (onUploadProgress: (progress: number) => void) => Promise<boolean>;
  onRemove: (document: DocumentRecord) => void;
}) {
  const [fileError, setFileError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    const savedDocument = draft.id
      ? documents.find((document) => document.id === draft.id)
      : undefined;
    if (savedDocument && savedDocument.documentType !== draft.documentType) {
      setFileError("Save the document type change before replacing its file.");
      event.target.value = "";
      return;
    }
    const lowerName = file.name.toLowerCase();
    const extension = allowedExtensions.find((item) =>
      lowerName.endsWith(item),
    );
    const validType =
      extension !== undefined &&
      (!file.type || allowedMimeTypes.includes(file.type));
    if (!validType) {
      setFileError("Choose a valid PDF, JPG, or PNG file.");
      event.target.value = "";
      return;
    }
    if (file.size > maxFileSize) {
      setFileError("The selected file must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFileError("");
    onDraft({ ...draft, file, fileName: file.name });
  }

  async function saveDraft() {
    if (saving || !draft) return;
    setUploadProgress(draft.file ? 0 : null);
    const saved = await onSave(setUploadProgress);
    if (saved) {
      setFileError("");
      setUploadProgress(null);
    }
  }

  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Documents"
      copy="Upload PDF, JPG, or PNG documents up to 1 MB each."
    >
      <div className="record-list">
        {documents.map((document, index) => (
          <div
            className="admission-record"
            key={document.id ?? `${document.fileName}-${index}`}
          >
            <div className="document-record-content">
              <span
                aria-label={
                  document.contentType.startsWith("image/")
                    ? "Image document"
                    : "PDF document"
                }
                className="document-pdf-icon"
              >
                <FileText size={20} />
              </span>
              <div>
                <strong>{document.fileName}</strong>
                <span>
                  {document.documentType} ·{" "}
                  {document.contentType.startsWith("image/") ? "Image" : "PDF"}{" "}
                  · Uploaded {formatDate(document.uploadedAt)}
                </span>
                <DocumentDownloadButton
                  className="text-button document-view-link"
                  documentId={document.id}
                  fileName={document.fileName}
                  label="View"
                />
              </div>
            </div>
            <div className="record-actions">
              <button
                className="text-button"
                disabled={saving}
                onClick={() => {
                  setFileError("");
                  setUploadProgress(null);
                  onDraft({ ...document, file: undefined });
                }}
                type="button"
              >
                Replace
              </button>
              <button
                className="text-button danger-text"
                disabled={saving}
                onClick={() => onRemove(document)}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      {!documents.length && !draft && (
        <EmptyState text="No documents have been added for this student." />
      )}
      {draft ? (
        <RecordEditor title={draft.id ? "Replace document" : "Add document"}>
          <div className="admission-form-grid">
            <Field label="Document Type" required>
              <select
                value={draft.documentType}
                disabled={saving || Boolean(draft.id && draft.file)}
                onChange={(event) =>
                  onDraft({
                    ...draft,
                    documentType: event.target.value as DocumentDraft["documentType"],
                  })
                }
              >
                <option value="">Select document type</option>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Upload File" required={!draft.id}>
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={saving}
                required={!draft.id}
                onChange={selectFile}
                type="file"
              />
            </Field>
          </div>
          {draft.file ? (
            <p className="file-selection">
              Selected file: {draft.file.name} ({formatFileSize(draft.file.size)})
            </p>
          ) : draft.id ? (
            <p className="file-selection">Current file: {draft.fileName}</p>
          ) : null}
          {fileError && (
            <p className="field-error" role="alert">
              {fileError}
            </p>
          )}
          {uploadProgress !== null && saving && draft.file && (
            <div
              aria-label="Upload progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={uploadProgress}
              className="document-upload-progress"
              role="progressbar"
            >
              <div style={{ width: `${uploadProgress}%` }} />
              <span>{`Uploading ${uploadProgress}%`}</span>
            </div>
          )}
          <div className="editor-actions">
            <button
              className="secondary-button"
              disabled={saving}
              onClick={saveDraft}
              type="button"
            >
              {saving
                ? draft.file
                  ? "Uploading..."
                  : "Saving..."
                : "Save document"}
            </button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => {
                setFileError("");
                setUploadProgress(null);
                onDraft(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </RecordEditor>
      ) : (
        <button
          className="secondary-button"
          disabled={!studentId || saving}
          onClick={() =>
            onDraft({
              studentId,
              documentType: "",
            })
          }
          type="button"
        >
          Add document
        </button>
      )}
    </StepIntro>
  );
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
