export function StatCard({ value, label, note }: { value: string | number; label: string; note?: string }) {
  return <div className="card stat"><div className="stat-value">{value}</div><div><div className="stat-label">{label}</div>{note && <div className="stat-note">{note}</div>}</div></div>;
}
