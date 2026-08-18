interface CineProps {
  size?: number;
  mood?: "happy" | "think" | "wink";
  className?: string;
}

export function Cine({ size = 36, mood = "happy", className = "" }: CineProps) {
  const display = mood === "wink" ? ";)" : mood === "think" ? ":/" : "C";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#F6C85A",
        border: "1px solid rgba(36,31,29,.13)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Nunito, sans-serif",
        fontWeight: 800,
        fontSize: size * 0.46,
        color: "#241F1D",
        lineHeight: 1,
        boxShadow: "0 3px 10px rgba(36,31,29,.12)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {display}
    </div>
  );
}
