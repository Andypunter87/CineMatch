type StripeType = "horizontal" | "diagonal" | "vertical" | "burst" | "flame" | "splash" | "neon";

interface FilmPosterProps {
  colors: [string, string, string];
  stripe?: StripeType;
  title?: string;
  year?: number;
  director?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  className?: string;
}

function buildGradient(stripe: StripeType, c1: string, c2: string, c3: string): string {
  switch (stripe) {
    case "horizontal":
      return `repeating-linear-gradient(180deg, ${c1} 0, ${c1} 24px, ${c2} 24px, ${c2} 48px, ${c3} 48px, ${c3} 72px)`;
    case "diagonal":
      return `repeating-linear-gradient(135deg, ${c1} 0, ${c1} 20px, ${c2} 20px, ${c2} 40px, ${c3} 40px, ${c3} 60px)`;
    case "vertical":
      return `repeating-linear-gradient(90deg, ${c1} 0, ${c1} 28px, ${c2} 28px, ${c2} 56px, ${c3} 56px, ${c3} 84px)`;
    case "burst":
      return `radial-gradient(circle at 50% 50%, ${c1} 0%, ${c2} 40%, ${c3} 80%)`;
    case "flame":
      return `linear-gradient(180deg, ${c1} 0%, ${c1} 40%, ${c2} 55%, ${c3} 100%)`;
    case "splash":
      return `radial-gradient(ellipse at 30% 30%, ${c1} 0%, ${c2} 45%, ${c3} 100%)`;
    case "neon":
      return `linear-gradient(135deg, ${c2} 0%, ${c2} 50%, ${c3} 50%, ${c3} 100%)`;
    default:
      return `repeating-linear-gradient(180deg, ${c1} 0, ${c1} 24px, ${c2} 24px, ${c2} 48px, ${c3} 48px, ${c3} 72px)`;
  }
}

export function FilmPoster({
  colors,
  stripe = "horizontal",
  title,
  year,
  director,
  width = 260,
  height = 380,
  style = {},
  className = "",
}: FilmPosterProps) {
  const [c1, c2, c3] = colors;
  const bg = buildGradient(stripe, c1, c2, c3);
  const small = width < 120;

  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: bg,
        borderRadius: 14,
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(36,31,29,.13)",
        boxShadow: "0 6px 18px rgba(36,31,29,.10)",
        flexShrink: 0,
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            position: "absolute",
            left: small ? 6 : 12,
            right: small ? 6 : 12,
            bottom: small ? 6 : 10,
            background: "rgba(255,252,250,0.93)",
            border: "1px solid rgba(36,31,29,.13)",
            borderRadius: 7,
            padding: small ? "4px 6px" : "8px 10px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              fontFamily: "Nunito, sans-serif",
              fontWeight: 700,
              fontSize: small ? 10 : width < 200 ? 14 : 19,
              lineHeight: 1,
              color: "#241F1D",
            }}
          >
            {title}
          </div>
          {(year || director) && !small && (
            <div
              style={{
                fontFamily: "Space Mono, monospace",
                fontSize: 8,
                letterSpacing: "0.08em",
                color: "#4A4A4A",
                marginTop: 3,
                textTransform: "uppercase",
              }}
            >
              {[year, director].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.07) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
