import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FileText } from "lucide-react";
import type { DocumentRecord } from "../../../types/admission";
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
  draft: DocumentRecord | null;
  saving: boolean;
  onDraft: (draft: DocumentRecord | null) => void;
  onSave: () => void;
  onRemove: (document: DocumentRecord) => void;
}) {
  const [fileError, setFileError] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const readerRef = useRef<FileReader | null>(null);

  useEffect(() => () => readerRef.current?.abort(), []);

  function cancelFileRead() {
    readerRef.current?.abort();
    readerRef.current = null;
    setReadingFile(false);
  }

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
    cancelFileRead();
    const reader = new FileReader();
    readerRef.current = reader;
    setReadingFile(true);
    reader.onerror = () => {
      readerRef.current = null;
      setReadingFile(false);
      setFileError("Unable to read the selected file. Please try again.");
    };
    reader.onload = () => {
      readerRef.current = null;
      setReadingFile(false);
      if (typeof reader.result !== "string") {
        setFileError("Unable to read the selected file. Please try again.");
        return;
      }
      setFileError("");
      onDraft({ ...draft, documentName: file.name, documentUrl: reader.result });
    };
    reader.readAsDataURL(file);
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
            <div>
              <strong>{document.documentName}</strong>
              <span>{document.documentType} · Uploaded {formatDate(document.uploadedDate)}</span>
            </div>
            <div className="record-actions">
              <button className="text-button" disabled={saving} onClick={() => { cancelFileRead(); setFileError(""); onDraft(document); }} type="button">Replace</button>
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
            <Field label="Upload File" required={!draft.documentUrl}>
              <input accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={selectFile} type="file" />
            </Field>
          </div>
          {draft.documentName && <p className="file-selection">Selected file: {draft.documentName}</p>}
          {fileError && <p className="field-error" role="alert">{fileError}</p>}
          <div className="editor-actions">
            <button className="secondary-button" disabled={saving || readingFile} onClick={onSave} type="button">{readingFile ? "Reading file..." : saving ? "Saving..." : "Save document"}</button>
            <button className="text-button" disabled={saving} onClick={() => { cancelFileRead(); setFileError(""); onDraft(null); }} type="button">Cancel</button>
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
