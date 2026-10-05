import type { ReactNode } from "react";

export function RecordEditor({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="record-editor">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
