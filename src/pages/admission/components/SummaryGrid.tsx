export function SummaryGrid({ items }: { items: string[][] }) {
  return (
    <dl className="summary-grid">
      {items.map(([label, value], index) => (
        <div key={`${label}-${index}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
