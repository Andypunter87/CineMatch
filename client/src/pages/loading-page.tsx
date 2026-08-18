import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { C, CATALOGUE_FILMS, matchFilms, matchFilmsGroup, type CatalogueFilm } from "@/lib/cinema-catalogue";
import { fetchSpinnerFilms } from "@/lib/spinner-recommendations";
import { DaylightScreen, MicroLabel, FONT_DISPLAY, FONT_BODY } from "@/components/daylight";

const STATUS_LINES = [
  'reading the room…',
  'checking your streamers…',
  'weighing tonight\u2019s mood…',
  'trimming the maybes…',
  'almost there…',
];

export default function LoadingPage() {
  const [, setLocation] = useLocation();
  const [dot, setDot] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [posterError, setPosterError] = useState(false);
  const [topFilm, setTopFilm] = useState<CatalogueFilm | null>(null);

  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 350);
    const s = setInterval(() => setStatusIdx(i => Math.min(i + 1, STATUS_LINES.length - 1)), 4000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);

  useEffect(() => {
    // Strict-Mode-safe: each effect invocation subscribes to the (shared,
    // module-level deduped) request; cleanup only stops this invocation
    // from acting on the result — it never kills the request itself.
    let cancelled = false;

    const reels = (() => {
      try { return JSON.parse(localStorage.getItem('cinematch_reels') || '[]'); } catch { return []; }
    })();
    const isGroup = localStorage.getItem('cinematch_is_group') === '1';

    function finish(films: CatalogueFilm[], source: 'ai' | 'catalogue') {
      if (cancelled) return;
      localStorage.setItem('cinematch_films', JSON.stringify(films));
      localStorage.setItem('cinematch_source', source);
      setTopFilm(films[0] || null);
      // brief beat so the "best match" card is visible before the deck
      setTimeout(() => { if (!cancelled) setLocation('/films'); }, 900);
    }

    fetchSpinnerFilms(reels, isGroup)
      .then(films => finish(films, 'ai'))
      .catch(err => {
        console.warn('AI recommendations unavailable, falling back to catalogue:', err);
        const fallback = isGroup
          ? matchFilmsGroup(reels, { cosy: 60, thinky: 55, funny: 65, tense: 40, romantic: 55 })
          : matchFilms(reels);
        finish(fallback.length ? fallback : CATALOGUE_FILMS.slice(0, 5), 'catalogue');
      });

    return () => { cancelled = true; };
  }, [setLocation]);

  const dots = '.'.repeat(dot + 1);
  const [c1, c2, c3] = topFilm?.colors || [C.pink, C.yellow, C.blue];
  const stripeBg = `repeating-linear-gradient(180deg,${c1} 0 8px,${c2} 8px 16px,${c3} 16px 24px)`;

  return (
    <DaylightScreen style={{ justifyContent: 'center', alignItems: 'center', padding: '0 32px', gap: 24 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: C.yellow, border: '1px solid rgba(36,31,29,.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28,
        color: C.onAccent, boxShadow: C.shadowPanel,
      }}>C</div>

      <div style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: 24,
        lineHeight: 1.1,
        color: C.ink,
        textAlign: 'center',
      }}>
        finding something perfect{dots}
      </div>

      <div data-testid="text-loading-status" style={{
        fontFamily: FONT_BODY,
        fontSize: 14,
        color: C.inkSoft,
        textAlign: 'center',
        lineHeight: 1.4,
        marginTop: -14,
      }}>{topFilm ? 'got it!' : STATUS_LINES[statusIdx]}</div>

      {topFilm && (
        <div style={{
          background: C.paper2,
          border: `1px solid ${C.edgeCard}`,
          borderRadius: 14,
          padding: '12px 16px',
          width: '100%',
          maxWidth: 320,
          boxShadow: C.shadowPanel,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <div style={{
            width: 64,
            height: 96,
            flexShrink: 0,
            borderRadius: 8,
            border: `1px solid ${C.edge}`,
            overflow: 'hidden',
            background: stripeBg,
          }}>
            {topFilm.posterPath && !posterError && (
              <img
                data-testid="img-poster-loading"
                src={`/api/image/poster?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w200${topFilm.posterPath}`)}&title=${encodeURIComponent(topFilm.title)}`}
                alt={topFilm.title}
                onError={() => setPosterError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MicroLabel color={C.inkLight} style={{ marginBottom: 4 }}>best match</MicroLabel>
            <div style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 18,
              color: C.ink,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{topFilm.title}</div>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: C.inkSoft,
              marginTop: 4,
            }}>checking {topFilm.streaming} · {topFilm.runtime}</div>
          </div>
        </div>
      )}
    </DaylightScreen>
  );
}
