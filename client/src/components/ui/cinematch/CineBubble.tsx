import { ReactNode } from "react";
import { Cine } from "./Cine";

interface CineBubbleProps {
  children: ReactNode;
  avatarSize?: number;
  mood?: "happy" | "think" | "wink";
  className?: string;
}

export function CineBubble({
  children,
  avatarSize = 40,
  mood = "happy",
  className = "",
}: CineBubbleProps) {
  return (
    <div className={`flex gap-2.5 items-start ${className}`}>
      <Cine size={avatarSize} mood={mood} />
      <Bubble>{children}</Bubble>
    </div>
  );
}

interface BubbleProps {
  children: ReactNode;
  className?: string;
}

export function Bubble({ children, className = "" }: BubbleProps) {
  return (
    <div
      className={className}
      style={{
        background: "#F3ECDA",
        border: "1.5px solid #1A1A1A",
        borderRadius: "4px 16px 16px 16px",
        padding: "10px 14px",
        fontFamily: "Nunito, sans-serif",
        fontSize: 14,
        lineHeight: 1.35,
        color: "#1A1A1A",
        flex: 1,
        boxShadow: "2px 2px 0 #1A1A1A",
      }}
    >
      {children}
    </div>
  );
}
