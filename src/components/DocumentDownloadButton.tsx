import { useState } from "react";
import { downloadDocumentFile } from "../services/admissionService";

export function DocumentDownloadButton({
  documentId,
  fileName,
  className,
  label = "Download",
}: {
  documentId: number;
  fileName: string;
  className?: string;
  label?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setDownloading(true);
    setError("");
    try {
      await downloadDocumentFile(documentId, fileName);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download this document. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <span>
      <button
        className={className}
        disabled={downloading}
        onClick={() => void download()}
        type="button"
      >
        {downloading ? "Downloading..." : label}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
