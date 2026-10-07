import type { ReactNode } from "react";

export function SummaryGrid({ items }: { items: (string | ReactNode)[][] }) {
  return (
    <dl className="summary-grid">
      {items.map(([label, value], index) => (
        <div key={`${String(label)}-${index}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
