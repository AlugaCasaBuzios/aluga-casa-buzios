interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}

export default function Badge({
  children,
  variant = "default",
}: BadgeProps) {
  const styles = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    error: "bg-rose-100 text-rose-800",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  );
}
