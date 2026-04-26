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
    fontFamily: "Caveat, cursive",
    fontWeight: 700,
    fontSize,
    borderRadius: 100,
    cursor: disabled ? "default" : "pointer",
    lineHeight: 1,
    letterSpacing: 0.2,
    transition: "transform 0.08s, box-shadow 0.08s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    userSelect: "none",
    ...style,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: disabled ? "#F3ECDA" : "#1A1A1A",
      color: disabled ? "#8A8478" : "#FAF6EE",
      border: `2px solid ${disabled ? "#8A8478" : "#1A1A1A"}`,
      boxShadow: disabled ? "none" : "3px 3px 0 #1A1A1A",
    },
    outline: {
      background: "#FAF6EE",
      color: "#1A1A1A",
      border: "1.5px dashed #1A1A1A",
      boxShadow: "none",
    },
    ghost: {
      background: "transparent",
      color: "#4A4A4A",
      border: "none",
      boxShadow: "none",
    },
  };

  const merged = { ...base, ...variants[variant] };

  const isPressable = !disabled && variant === "primary";

  function press(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isPressable) return;
    e.currentTarget.style.transform = "translate(2px,2px)";
    e.currentTarget.style.boxShadow = "1px 1px 0 #1A1A1A";
  }

  function release(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isPressable) return;
    e.currentTarget.style.transform = "";
    e.currentTarget.style.boxShadow = "3px 3px 0 #1A1A1A";
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
