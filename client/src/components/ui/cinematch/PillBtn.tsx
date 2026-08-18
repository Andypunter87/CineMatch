import { ButtonHTMLAttributes, ReactNode } from "react";

interface PillBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function PillBtn({
  children,
  variant = "primary",
  size = "md",
  disabled,
  style,
  ...rest
}: PillBtnProps) {
  const pad =
    size === "sm" ? "9px 20px" : size === "lg" ? "16px 32px" : "13px 28px";
  const fontSize = size === "sm" ? 17 : size === "lg" ? 24 : 20;

  const base: React.CSSProperties = {
    padding: pad,
    fontFamily: "Nunito, sans-serif",
    fontWeight: 700,
    fontSize: Math.round(fontSize * 0.75),
    borderRadius: 100,
    cursor: disabled ? "default" : "pointer",
    lineHeight: 1,
    letterSpacing: 0.2,
    transition: "transform .22s cubic-bezier(.2,1.5,.4,1), box-shadow .22s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    userSelect: "none",
    ...style,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: disabled ? "#FFFCFA" : "#F6C85A",
      color: disabled ? "#9A9089" : "#241F1D",
      border: `1px solid ${disabled ? "rgba(36,31,29,.12)" : "#F6C85A"}`,
      boxShadow: disabled ? "none" : "0 4px 14px rgba(36,31,29,.12)",
    },
    outline: {
      background: "transparent",
      color: "#241F1D",
      border: "1px dashed rgba(36,31,29,.2)",
      boxShadow: "none",
    },
    ghost: {
      background: "transparent",
      color: "#6B625C",
      border: "none",
      boxShadow: "none",
    },
  };

  const merged = { ...base, ...variants[variant] };

  const isPressable = !disabled && variant === "primary";

  function press(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isPressable) return;
    e.currentTarget.style.transform = "scale(.96)";
    e.currentTarget.style.boxShadow = "0 2px 8px rgba(36,31,29,.10)";
  }

  function release(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isPressable) return;
    e.currentTarget.style.transform = "";
    e.currentTarget.style.boxShadow = "0 4px 14px rgba(36,31,29,.12)";
  }

  return (
    <button
      disabled={disabled}
      style={merged}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      {...rest}
    >
      {children}
    </button>
  );
}
