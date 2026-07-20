export function StatusBadge({ label, tone = "blue" }: { label: string; tone?: "blue" | "green" | "amber" | "red" }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}
