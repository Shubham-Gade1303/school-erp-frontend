import { useState, type ChangeEvent } from "react";
import { FileText } from "lucide-react";
import type { DocumentDraft, DocumentRecord } from "../../../types/admission";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { RecordEditor } from "../components/RecordEditor";
import { StepIntro } from "../components/StepIntro";
import { formatDate } from "../utils/format";

const documentTypes = ["Birth Certificate", "Proof of Identity", "Proof of Address", "Transfer Certificate", "Previous Academic Record", "Other"];
const maxFileSize = 5 * 1024 * 1024;
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];

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
  onSave: (onUploadProgress: (progress: number) => void) => void;
  onRemove: (document: DocumentRecord) => void;
}) {
  const [fileError, setFileError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    const lowerName = file.name.toLowerCase();
    const validType = allowedMimeTypes.includes(file.type) ||
      allowedExtensions.some((extension) => lowerName.endsWith(extension));
    if (!validType) {
      setFileError("Choose a PDF, JPG, or PNG file.");
      event.target.value = "";
      return;
    }
    if (file.size > maxFileSize) {
      setFileError("The selected file must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setFileError("");
    onDraft({ ...draft, file, documentName: file.name });
  }

  function saveDraft() {
    setUploadProgress(draft?.file ? 0 : null);
    onSave(setUploadProgress);
  }

  return (
    <StepIntro
      icon={<FileText size={19} />}
      title="Documents"
      copy="Upload PDF, JPG, or PNG documents up to 5 MB each."
    >
      <div className="record-list">
        {documents.map((document, index) => (
          <div className="admission-record" key={document.id ?? `${document.documentName}-${index}`}>
            <div className="document-record-content">
              {isImage(document.documentName) ? (
                <img alt="" className="document-thumbnail" src={document.documentUrl} />
              ) : (
                <span aria-label="PDF document" className="document-pdf-icon"><FileText size={20} /></span>
              )}
              <div>
                <strong>{document.documentName}</strong>
                <span>{document.documentType} · {isImage(document.documentName) ? "Image" : "PDF"} · Uploaded {formatDate(document.uploadedDate)}</span>
                {document.documentUrl && <a className="text-button document-view-link" href={document.documentUrl} rel="noopener noreferrer" target="_blank">View</a>}
              </div>
            </div>
            <div className="record-actions">
              <button className="text-button" disabled={saving} onClick={() => { setFileError(""); setUploadProgress(null); onDraft({ ...document, file: undefined }); }} type="button">Replace</button>
              <button className="text-button danger-text" disabled={saving} onClick={() => onRemove(document)} type="button">Remove</button>
            </div>
          </div>
        ))}
      </div>
      {!documents.length && !draft && <EmptyState text="No documents have been added for this student." />}
      {draft ? (
        <RecordEditor title={draft.id ? "Replace document" : "Add document"}>
          <div className="admission-form-grid">
            <Field label="Document Type" required>
              <select value={draft.documentType} onChange={(event) => onDraft({ ...draft, documentType: event.target.value })}>
                <option value="">Select document type</option>
                {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Upload File" required={!draft.id}>
              <input accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={saving} onChange={selectFile} type="file" />
            </Field>
          </div>
          {draft.file ? (
            <p className="file-selection">Selected file: {draft.file.name} ({formatFileSize(draft.file.size)})</p>
          ) : draft.id ? (
            <p className="file-selection">Current file: {draft.documentName}</p>
          ) : null}
          {fileError && <p className="field-error" role="alert">{fileError}</p>}
          {uploadProgress !== null && saving && draft.file && (
            <div aria-label="Upload progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={uploadProgress} className="document-upload-progress" role="progressbar">
              <div style={{ width: `${uploadProgress}%` }} />
              <span>{`Uploading ${uploadProgress}%`}</span>
            </div>
          )}
          <div className="editor-actions">
            <button className="secondary-button" disabled={saving} onClick={saveDraft} type="button">{saving ? draft.file ? "Uploading..." : "Saving..." : "Save document"}</button>
            <button className="text-button" disabled={saving} onClick={() => { setFileError(""); setUploadProgress(null); onDraft(null); }} type="button">Cancel</button>
          </div>
        </RecordEditor>
      ) : (
        <button className="secondary-button" disabled={!studentId || saving} onClick={() => onDraft({
          studentId,
          documentType: "",
          documentName: "",
          documentUrl: "",
          uploadedDate: new Date().toISOString().slice(0, 10),
        })} type="button">Add document</button>
      )}
    </StepIntro>
  );
}

function isImage(fileName: string) {
  return /\.(jpe?g|png)$/i.test(fileName);
}

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
