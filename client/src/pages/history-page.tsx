import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { C, CATALOGUE_FILMS, getPosterBackground, type CatalogueFilm } from "@/lib/cinema-catalogue";
import { Cine, CineBubble, DaylightScreen, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

// ── API response types ────────────────────────────────────────────────────────

interface WatchChoice {
  id: number;
  filmId: number;
  vibe: string | null;
  ts: string | null;
  userId: number | null;
}

interface WatchlistItem {
  id: number;
  filmId: number;
  filmTitle: string;
  filmYear: number | null;
  filmDirector: string | null;
  filmPosterUrl: string | null;
  filmGenres: string[] | null;
  watched: boolean;
  dateWatched: string | null;
  dateAdded: string | null;
}

// ── Unified history entry ─────────────────────────────────────────────────────

interface HistoryEntry {
  key: string;
  filmId: number;
  ts: string | null; // ISO string for sorting
  source: "slot" | "recommended";
  vibe: string | null; // only for slot picks
  // resolved film data (catalogue wins, watchlist fills gaps)
  title: string;
  year: string | null;
  director: string | null;
  streaming: string | null;
  runtime: string | null;
  posterPath: string | null;
  catalogueFilm: CatalogueFilm | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function mergeHistory(
  choices: WatchChoice[],
  watchlistItems: WatchlistItem[],
): HistoryEntry[] {
  const result: HistoryEntry[] = [];

  // 1. Every slot-machine pick is its own entry (one card per event, even if the
  //    same film was picked multiple times on different occasions).
  const slottedFilmIds = new Set<number>();
  for (const c of choices) {
    const cat = CATALOGUE_FILMS.find((f) => f.id === c.filmId) ?? null;
    slottedFilmIds.add(c.filmId);
    result.push({
      key: `slot-${c.id}`,
      filmId: c.filmId,
      ts: c.ts,
      source: "slot",
      vibe: c.vibe,
      title: cat?.title ?? `Film #${c.filmId}`,
      year: cat ? String(cat.year) : null,
      director: cat?.director ?? null,
      streaming: cat?.streaming ?? null,
      runtime: cat?.runtime ?? null,
      posterPath: cat?.posterPath ?? null,
      catalogueFilm: cat,
    });
  }

  // 2. Watchlist items represent AI-recommendation picks (films the user chose
  //    from the recommendation flow — these are saved regardless of watched flag).
  //    Skip any whose filmId is already represented by a slot-pick entry so we
  //    don't show the same film twice with different source labels.
  for (const w of watchlistItems) {
    if (slottedFilmIds.has(w.filmId)) continue; // deduplicate across sources

    const ts = w.dateWatched ?? w.dateAdded;
    const cat = CATALOGUE_FILMS.find((f) => f.id === w.filmId) ?? null;
    result.push({
      key: `wl-${w.id}`,
      filmId: w.filmId,
      ts,
      source: "recommended",
      vibe: null,
      title: cat?.title ?? w.filmTitle,
      year: cat ? String(cat.year) : w.filmYear ? String(w.filmYear) : null,
      director: cat?.director ?? w.filmDirector ?? null,
      streaming: cat?.streaming ?? null,
      runtime: cat?.runtime ?? null,
      posterPath: cat?.posterPath ?? null,
      catalogueFilm: cat,
    });
  }

  // Sort newest first
  return result.sort((a, b) => {
    if (!a.ts && !b.ts) return 0;
    if (!a.ts) return 1;
    if (!b.ts) return -1;
    return new Date(b.ts).getTime() - new Date(a.ts).getTime();
  });
}

// ── Card component ────────────────────────────────────────────────────────────

function HistoryCard({
  entry,
  posterError,
  onPosterError,
}: {
  entry: HistoryEntry;
  posterError: boolean;
  onPosterError: () => void;
}) {
  const cat = entry.catalogueFilm;
  const posterBg = cat ? getPosterBackground(cat) : C.paper2;

  return (
    <div
      data-testid={`card-history-${entry.key}`}
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
      {/* Poster */}
      <div style={{ width: 72, flexShrink: 0, position: "relative" }}>
        {entry.posterPath && !posterError ? (
          <img
            data-testid={`img-history-poster-${entry.filmId}`}
            src={`/api/image/poster?url=${encodeURIComponent(
              `https://image.tmdb.org/t/p/w200${entry.posterPath}`,
            )}&title=${encodeURIComponent(entry.title)}`}
            alt={entry.title}
            onError={onPosterError}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: posterBg, minHeight: 80 }} />
        )}
      </div>

      {/* Info */}
      <div
        style={{ flex: 1, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}
      >
        {/* Title + date */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div
            data-testid={`text-history-title-${entry.key}`}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 17,
              lineHeight: 1.15,
              color: C.ink,
            }}
          >
            {entry.title}
          </div>
          <div
            data-testid={`text-history-date-${entry.key}`}
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
            {formatDate(entry.ts)}
          </div>
        </div>

        {/* Year · director */}
        {(entry.year || entry.director) && (
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 8,
              letterSpacing: ".1em",
              color: C.inkSoft,
              textTransform: "uppercase",
            }}
          >
            {[entry.year, entry.director].filter(Boolean).join(" · ")}
          </div>
        )}

        {/* Chips */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2 }}>
          {/* Source label */}
          <div
            data-testid={`chip-source-${entry.key}`}
            style={{
              padding: "2px 8px",
              background: entry.source === "slot" ? C.yellow : C.mint,
              border: `1px solid ${C.edge}`,
              borderRadius: 100,
              fontFamily: FONT_BODY,
              fontSize: 10,
              color: C.onAccent,
            }}
          >
            {entry.source === "slot" ? "slot pick" : "recommended"}
          </div>

          {/* Vibe (slot picks only) */}
          {entry.vibe && (
            <div
              style={{
                padding: "2px 8px",
                background: "transparent",
                border: `1px solid ${C.edge}`,
                borderRadius: 100,
                fontFamily: FONT_BODY,
                fontSize: 10,
                color: C.inkSoft,
              }}
            >
              {entry.vibe}
            </div>
          )}

          {/* Streaming */}
          {entry.streaming && (
            <div
              style={{
                padding: "2px 8px",
                background: "transparent",
                border: `1px solid ${C.edge}`,
                borderRadius: 100,
                fontFamily: FONT_BODY,
                fontSize: 10,
                color: C.inkSoft,
              }}
            >
              {entry.streaming}
            </div>
          )}

          {/* Runtime */}
          {entry.runtime && (
            <div
              style={{
                padding: "2px 8px",
                background: "transparent",
                border: `1px solid ${C.edge}`,
                borderRadius: 100,
                fontFamily: FONT_BODY,
                fontSize: 10,
                color: C.inkSoft,
              }}
            >
              {entry.runtime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [, setLocation] = useLocation();
  const [posterErrors, setPosterErrors] = useState<Record<string, boolean>>({});

  const { data: choices, isLoading: loadingChoices, isError: errorChoices } = useQuery<WatchChoice[]>({
    queryKey: ["/api/watch-choices"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: watchlistItems, isLoading: loadingWatchlist, isError: errorWatchlist } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
    staleTime: 0,
    refetchOnMount: true,
    // Returns 401 when not logged in — treat as empty rather than error
    retry: false,
  });

  const isLoading = loadingChoices || loadingWatchlist;
  // Only treat as error if watch-choices failed (watchlist needs auth, may return 401)
  const isError = errorChoices;

  const history = mergeHistory(choices ?? [], watchlistItems ?? []);

  function handlePosterError(key: string) {
    setPosterErrors((prev) => ({ ...prev, [key]: true }));
  }

  return (
    <DaylightScreen>
      <div
        style={{
          padding: "16px 20px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          data-testid="button-back"
          onClick={() => setLocation("/")}
          style={{
            background: "none",
            border: "none",
            fontFamily: FONT_DISPLAY,
            fontWeight: 600,
            fontSize: 15,
            color: C.inkSoft,
            padding: 0,
            cursor: "pointer",
          }}
        >
          ← back
        </button>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: ".1em",
            color: C.inkSoft,
            textTransform: "uppercase",
          }}
        >
          recent picks
        </div>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 27,
            lineHeight: 1.05,
            margin: 0,
            color: C.ink,
          }}
        >
          your history
        </h1>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: C.inkSoft,
            marginTop: 6,
            marginBottom: 0,
            lineHeight: 1.35,
          }}
        >
          films you chose to watch
        </p>
      </div>

      <div
        style={{
          flex: 1,
          padding: "0 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                data-testid={`skeleton-history-${i}`}
                style={{
                  height: 90,
                  borderRadius: 14,
                  border: `1px solid ${C.edgeCard}`,
                  background: C.paper2,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        )}

        {!isLoading && isError && (
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

        {!isLoading && !isError && history.length === 0 && (
          <div
            style={{
              border: `1px dashed ${C.edgeDash}`,
              borderRadius: 14,
              padding: "24px 20px",
              textAlign: "center",
              background: C.paper2,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 18,
                color: C.ink,
                marginBottom: 6,
              }}
            >
              no picks yet
            </div>
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: C.inkSoft,
                lineHeight: 1.4,
                marginBottom: 16,
              }}
            >
              once you spin the slot machine or pick a film from recommendations, it'll show up here.
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
            >
              spin the slot machine →
            </button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          history.map((entry) => (
            <HistoryCard
              key={entry.key}
              entry={entry}
              posterError={!!posterErrors[entry.key]}
              onPosterError={() => handlePosterError(entry.key)}
            />
          ))}

        {!isLoading && !isError && history.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              marginTop: 4,
            }}
          >
            <Cine size={26} />
            <CineBubble style={{ fontSize: 12 }}>
              {history.length} film{history.length !== 1 ? "s" : ""} watched so far — i'm learning what you love 🎬
            </CineBubble>
          </div>
        )}
      </div>
    </DaylightScreen>
  );
}
