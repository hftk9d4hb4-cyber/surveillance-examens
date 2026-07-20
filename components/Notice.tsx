export function Notice({ type = "info", children }: { type?: "info" | "success" | "warning" | "error"; children: React.ReactNode }) {
  return <div className={`notice ${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>;
}
