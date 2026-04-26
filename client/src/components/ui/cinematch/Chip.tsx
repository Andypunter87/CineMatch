import { ReactNode } from "react";

type ChipColor = "pink" | "yellow" | "blue" | "mint" | "lilac" | "coral" | "paper";

interface ChipProps {
  children: ReactNode;
  color?: ChipColor;
  className?: string;
}

const COLOR_MAP: Record<ChipColor, { bg: string; text: string }> = {
  pink:   { bg: "#FF4D8F22", text: "#FF4D8F" },
  yellow: { bg: "#FFC93C33", text: "#8A6200" },
  blue:   { bg: "#4D6EFF22", text: "#4D6EFF" },
  mint:   { bg: "#5FD4A822", text: "#1A7A5E" },
  lilac:  { bg: "#C9A7FF33", text: "#6B3FC4" },
  coral:  { bg: "#FF8C5A22", text: "#C0440A" },
  paper:  { bg: "#F3ECDA",   text: "#1A1A1A" },
};

export function Chip({ children, color = "paper", className = "" }: ChipProps) {
  const { bg, text } = COLOR_MAP[color];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 100,
        background: bg,
        border: "1.5px solid #1A1A1A",
        fontFamily: "Nunito, sans-serif",
        fontWeight: 600,
        fontSize: 12,
        color: text,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
