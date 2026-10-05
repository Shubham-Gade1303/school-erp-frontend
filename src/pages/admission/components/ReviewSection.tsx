import { SummaryGrid } from "./SummaryGrid";

export function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: string[][];
}) {
  return (
    <section className="review-section">
      <h3>{title}</h3>
      <SummaryGrid items={items} />
    </section>
  );
}
