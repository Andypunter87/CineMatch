import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { C, CATALOGUE_FILMS, getPosterBackground, type CatalogueFilm } from "@/lib/cinema-catalogue";
import { Cine, CineBubble, DaylightScreen, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

interface WatchChoice {
  id: number;
  filmId: number;
  vibe: string | null;
  ts: string | null;
  userId: number | null;
}

function formatDate(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function HistoryCard({ choice, film, posterError, onPosterError }: {
  choice: WatchChoice;
  film: CatalogueFilm;
  posterError: boolean;
  onPosterError: () => void;
}) {
  const posterBg = getPosterBackground(film);

  return (
    <div
      data-testid={`card-history-${choice.id}`}
      style={{
        border: `1px solid ${C.edgeCard}`,
        borderRadius: 14,
        background: C.paper2,
        boxShadow: C.shadowBtn,
        overflow: "hidden",
        display: "flex",
        gap: 0,
      }}
    >
      <div style={{ width: 72, flexShrink: 0, position: "relative" }}>
        {film.posterPath && !posterError ? (
          <img
            data-testid={`img-history-poster-${film.id}`}
            src={`/api/image/poster?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w200${film.posterPath}`)}&title=${encodeURIComponent(film.title)}`}
            alt={film.title}
            onError={onPosterError}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: posterBg, minHeight: 80 }} />
        )}
      </div>

      <div style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div
            data-testid={`text-history-title-${choice.id}`}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              lineHeight: 1.15,
              color: C.ink,
            }}
          >
            {film.title}
          </div>
          <div
            data-testid={`text-history-date-${choice.id}`}
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              color: C.inkLight,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {formatDate(choice.ts)}
          </div>
        </div>

        <div style={{
          fontFamily: FONT_MONO,
          fontSize: 8,
          letterSpacing: ".1em",
          color: C.inkSoft,
          textTransform: "uppercase",
        }}>
          {film.year} · {film.director}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2 }}>
          {choice.vibe && (
            <div style={{
              padding: "2px 8px",
              background: C.yellow,
              border: `1px solid ${C.edge}`,
              borderRadius: 100,
              fontFamily: FONT_BODY,
              fontSize: 10,
              color: C.onAccent,
            }}>
              {choice.vibe}
            </div>
          )}
          <div style={{
            padding: "2px 8px",
            background: C.mint,
            border: `1px solid ${C.edge}`,
            borderRadius: 100,
            fontFamily: FONT_BODY,
            fontSize: 10,
            color: C.onAccent,
          }}>
            {film.streaming}
          </div>
          <div style={{
            padding: "2px 8px",
            background: "transparent",
            border: `1px solid ${C.edge}`,
            borderRadius: 100,
            fontFamily: FONT_BODY,
            fontSize: 10,
            color: C.inkSoft,
          }}>
            {film.runtime}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const [posterErrors, setPosterErrors] = useState<Record<number, boolean>>({});

  const { data: choices, isLoading, isError } = useQuery<WatchChoice[]>({
    queryKey: ["/api/watch-choices"],
    staleTime: 0,
    refetchOnMount: true,
  });

  function handlePosterError(filmId: number) {
    setPosterErrors(prev => ({ ...prev, [filmId]: true }));
  }

  const enriched = (choices || []).map((c) => ({
    choice: c,
    film: CATALOGUE_FILMS.find((f) => f.id === c.filmId) ?? null,
  })).filter((e) => e.film !== null) as { choice: WatchChoice; film: CatalogueFilm }[];

  return (
    <DaylightScreen>
      <div style={{ padding: "16px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          data-testid="button-back"
          onClick={() => setLocation("/")}
          style={{ background: "none", border: "none", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.inkSoft, padding: 0, cursor: "pointer" }}
        >← back</button>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: ".1em", color: C.inkSoft, textTransform: "uppercase" }}>
          recent picks
        </div>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 27,
          lineHeight: 1.05,
          margin: 0,
          color: C.ink,
        }}>your history</h1>
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 13,
          color: C.inkSoft,
          marginTop: 6,
          marginBottom: 0,
          lineHeight: 1.35,
        }}>films you chose to watch</p>
      </div>

      <div style={{ flex: 1, padding: "0 20px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} data-testid={`skeleton-history-${i}`} style={{
                height: 90,
                borderRadius: 14,
                border: `1px solid ${C.edgeCard}`,
                background: C.paper2,
                opacity: 0.5,
              }} />
            ))}
          </div>
        )}

        {isError && (
          <div
            data-testid="error-history"
            style={{
              border: `1px solid ${C.edgeCard}`,
              borderRadius: 14,
              padding: "16px 20px",
              background: C.paper2,
              boxShadow: C.shadowChip,
              textAlign: "center",
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.inkSoft,
            }}
          >
            couldn't load your history — try refreshing.
          </div>
        )}

        {!isLoading && !isError && enriched.length === 0 && (
          <div style={{
            border: `1px dashed ${C.edgeDash}`,
            borderRadius: 14,
            padding: "24px 20px",
            textAlign: "center",
            background: C.paper2,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 18, color: C.ink, marginBottom: 6 }}>
              no picks yet
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.inkSoft, lineHeight: 1.4, marginBottom: 16 }}>
              once you spin the slot machine and pick something to watch, it'll show up here.
            </div>
            <button
              data-testid="button-go-pick"
              onClick={() => setLocation("/slot")}
              style={{
                padding: "12px 20px",
                border: `1px solid ${C.yellow}`,
                borderRadius: 100,
                background: C.yellow,
                color: C.onAccent,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                whiteSpace: "nowrap",
                cursor: "pointer",
                boxShadow: C.shadowBtn,
              }}
            >spin the slot machine →</button>
          </div>
        )}

        {!isLoading && !isError && enriched.map(({ choice, film }) => (
          <HistoryCard
            key={choice.id}
            choice={choice}
            film={film}
            posterError={!!posterErrors[film.id]}
            onPosterError={() => handlePosterError(film.id)}
          />
        ))}

        {!isLoading && !isError && enriched.length > 0 && (
          <div style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            marginTop: 4,
          }}>
            <Cine size={26} />
            <CineBubble style={{ fontSize: 12 }}>
              {enriched.length} pick{enriched.length !== 1 ? "s" : ""} so far — i'm learning what you love 🎬
            </CineBubble>
          </div>
        )}
      </div>
    </DaylightScreen>
  );
}
