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
        background: "#FFC93C",
        border: "2px solid #1A1A1A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Caveat, cursive",
        fontWeight: 700,
        fontSize: size * 0.55,
        color: "#1A1A1A",
        lineHeight: 1,
        boxShadow: "2px 2px 0 #1A1A1A",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {display}
    </div>
  );
}
