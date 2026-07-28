interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "rounded-2xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500";

  const variantStyles = {
    primary: "bg-sky-700 text-white hover:bg-sky-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props} />
  );
}
