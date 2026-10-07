import { SummaryGrid } from "./SummaryGrid";
import type { ReactNode } from "react";

export function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: (string | ReactNode)[][];
}) {
  return (
    <section className="review-section">
      <h3>{title}</h3>
      <SummaryGrid items={items} />
    </section>
  );
}
