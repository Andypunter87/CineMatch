import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { C, CATALOGUE_FILMS, type CatalogueFilm } from "@/lib/cinema-catalogue";

export default function LoadingPage() {
  const [, setLocation] = useLocation();
  const [dot, setDot] = useState(0);
  const [posterError, setPosterError] = useState(false);

  const films = (() => {
    try {
      return JSON.parse(localStorage.getItem('cinematch_films') || '[]');
    } catch { return CATALOGUE_FILMS.slice(0, 5); }
  })();

  const topFilm: CatalogueFilm = films[0] || CATALOGUE_FILMS[0];

  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 350);
    const done = setTimeout(() => setLocation('/films'), 2200);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [setLocation]);

  const dots = '.'.repeat(dot + 1);
  const [c1, c2, c3] = topFilm?.colors || [C.pink, C.yellow, C.blue];
  const stripeBg = `repeating-linear-gradient(180deg,${c1} 0 8px,${c2} 8px 16px,${c3} 16px 24px)`;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F3ECDA',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 32px',
      gap: 24,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: C.yellow, border: `3px solid ${C.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 36,
        color: C.ink, boxShadow: `4px 4px 0 ${C.ink}`,
      }}>C</div>

      <div style={{
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 800,
        fontSize: 30,
        lineHeight: 1.1,
        color: C.ink,
        textAlign: 'center',
      }}>
        finding something perfect{dots}
      </div>

      <div style={{
        fontFamily: 'Nunito, sans-serif',
        fontSize: 14,
        color: C.inkSoft,
        textAlign: 'center',
        lineHeight: 1.4,
      }}>finding you the perfect watch</div>

      <div style={{
        background: '#FAF6EE',
        border: `2px solid ${C.ink}`,
        borderRadius: 14,
        padding: '12px 16px',
        width: '100%',
        maxWidth: 320,
        boxShadow: `3px 3px 0 ${C.ink}`,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}>
        <div style={{
          width: 64,
          height: 96,
          flexShrink: 0,
          borderRadius: 6,
          border: `1.5px solid ${C.ink}`,
          overflow: 'hidden',
          background: stripeBg,
          boxShadow: `2px 2px 0 ${C.ink}`,
        }}>
          {topFilm?.posterPath && !posterError && (
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
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: '.12em',
            color: C.inkLight,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>best match</div>
          <div style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 700,
            fontSize: 20,
            color: C.ink,
            lineHeight: 1.05,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{topFilm?.title || 'Loading…'}</div>
          <div style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 12,
            color: C.inkSoft,
            marginTop: 4,
          }}>checking {topFilm?.streaming} · {topFilm?.runtime}</div>
        </div>
      </div>
    </div>
  );
}
