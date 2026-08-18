import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { C, CATALOGUE_FILMS, getPosterBackground, WHY_TEXT, FEEL_MAP, FLAVOUR_MAP, matchFilmsGroup, type CatalogueFilm } from "@/lib/cinema-catalogue";
import { useTmdbPoster, fetchTmdbPoster } from "@/hooks/use-tmdb-poster";
import { FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

function Chip({ text, color }: { text: string; color?: string }) {
  return (
    <div style={{
      padding: '3px 10px',
      background: color || 'transparent',
      border: `1px solid ${C.edge}`,
      borderRadius: 100,
      fontFamily: FONT_BODY,
      fontSize: 11,
      color: C.onAccent,
    }}>{text}</div>
  );
}

function VibeBars({ film }: { film: CatalogueFilm }) {
  const bars = [
    { l: 'cosy-ness', v: film.why.cosy,   c: C.barCosy },
    { l: 'funny',     v: film.why.funny,  c: C.barFunny },
    { l: 'thinky',    v: film.why.thinky, c: C.barThinky },
    { l: 'tense',     v: film.why.tense,  c: C.barTense },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.inkSoft, width: 56, flexShrink: 0 }}>{b.l}</div>
          <div style={{ flex: 1, height: 8, background: C.barTrack, border: `1px solid ${C.barTrackEdge}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${b.v}%`, height: '100%', background: b.c, transition: 'width .6s ease' }} />
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.inkLight, width: 22, textAlign: 'right' }}>{b.v}</div>
        </div>
      ))}
    </div>
  );
}

function blendMemberReels(members: Array<{ reelSelections?: Array<{ i: number; opts: string[] }> | null }>): Record<string, number> {
  const TASTE_KEYS = ['cosy', 'thinky', 'funny', 'tense', 'romantic'];
  const totals: Record<string, number> = Object.fromEntries(TASTE_KEYS.map(k => [k, 0]));
  let count = 0;
  for (const m of members) {
    if (!m.reelSelections || m.reelSelections.length < 2) continue;
    const feel = m.reelSelections[0]?.opts?.[m.reelSelections[0].i] ?? '';
    const flavour = m.reelSelections[1]?.opts?.[m.reelSelections[1].i] ?? '';
    const feelWants = FEEL_MAP[feel] || {};
    const flavourWants = FLAVOUR_MAP[flavour] || {};
    for (const k of TASTE_KEYS) {
      totals[k] += ((feelWants[k] || 0) * 33) + ((flavourWants[k] || 0) * 22);
    }
    count++;
  }
  if (count === 0) return { cosy: 60, thinky: 55, funny: 65, tense: 40, romantic: 55 };
  return Object.fromEntries(TASTE_KEYS.map(k => [k, Math.min(100, Math.round(totals[k] / count))]));
}

export default function FilmDeckPage() {
  const [, setLocation] = useLocation();
  const [films, setFilms] = useState<CatalogueFilm[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cinematch_films') || '[]');
    } catch { return CATALOGUE_FILMS.slice(0, 5); }
  });

  const reelsRaw = (() => {
    try { return JSON.parse(localStorage.getItem('cinematch_reels') || '[]'); } catch { return []; }
  })();
  const feel = reelsRaw?.[0]?.opts?.[reelsRaw[0]?.i] || 'cosy';
  const isGroup = localStorage.getItem('cinematch_is_group') === '1';

  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [watching, setWatching] = useState(false);
  const [posterErrors, setPosterErrors] = useState<Record<number, boolean>>({});
  const dragRef = useRef({ x: 0, active: false });

  useEffect(() => {
    // AI-sourced decks are already personalized server-side; the local
    // catalogue re-blend only applies to the catalogue fallback.
    if (!isGroup || localStorage.getItem('cinematch_source') === 'ai') return;
    let cancelled = false;
    let prevReelsSnapshot = '';

    function fetchAndBlend() {
      try {
        const session = JSON.parse(localStorage.getItem('cinematch_session') || 'null');
        const sessionCode = session?.sessionCode;
        if (!sessionCode) return;
        fetch(`/api/sessions/${sessionCode}`)
          .then(r => r.ok ? r.json() : null)
          .then((data: { members?: Array<{ reelSelections?: Array<{ i: number; opts: string[] }> | null }> } | null) => {
            if (cancelled || !data?.members) return;
            const membersWithReels = data.members.filter(m => m.reelSelections && m.reelSelections.length >= 2);
            if (membersWithReels.length === 0) return;
            const snapshot = JSON.stringify(membersWithReels.map(m => m.reelSelections));
            if (snapshot !== prevReelsSnapshot) {
              prevReelsSnapshot = snapshot;
              const blendedTaste = blendMemberReels(membersWithReels);
              const updatedFilms = matchFilmsGroup(reelsRaw, blendedTaste);
              setFilms(updatedFilms);
            }
          })
          .catch(() => {});
      } catch {}
    }

    fetchAndBlend();
    const poll = setInterval(fetchAndBlend, 5000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [isGroup]);

  const [dragX, setDragX] = useState(0);
  const [flying, setFlying] = useState<'left' | 'right' | null>(null);

  const film = films[idx] || CATALOGUE_FILMS[0];
  const nextFilm = films[idx + 1];
  const whyFn = WHY_TEXT[feel] || ((t: string) => `${t} hits the vibe you're after.`);
  const why = film.whyText || whyFn(film.title);

  const livePosterUrl = useTmdbPoster(film.title, film.year, film.posterPath);

  useEffect(() => {
    const upcoming = films.slice(idx + 1, idx + 4);
    upcoming.forEach(f => {
      if (f?.title) fetchTmdbPoster(f.title, f.year);
    });
  }, [idx, films]);

  function handleDown(e: React.MouseEvent | React.TouchEvent) {
    const p = 'touches' in e ? e.touches[0] : e;
    dragRef.current = { x: p.clientX, active: true };
  }

  function handleMouseMove(e: MouseEvent) {
    if (!dragRef.current.active) return;
    setDragX(e.clientX - dragRef.current.x);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!dragRef.current.active) return;
    setDragX(e.touches[0].clientX - dragRef.current.x);
  }

  function handleUp() {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (dragX > 80) { flyCard('right'); }
    else if (dragX < -80) { flyCard('left'); }
    else setDragX(0);
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragX]);

  function flyCard(dir: 'left' | 'right') {
    setFlying(dir);
    setTimeout(() => {
      setFlying(null);
      setDragX(0);
      setIdx(i => Math.min(i + 1, films.length - 1));
    }, 300);
  }

  async function handleWatch() {
    setWatching(true);
    try {
      await fetch('/api/watch-choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmId: film.id, vibe: feel, ts: new Date().toISOString() }),
      });
    } catch {}
    localStorage.setItem('cinematch_watched_film', JSON.stringify(film));
    setTimeout(() => {
      setLocation('/rating');
    }, 600);
  }

  const rot = dragX * 0.05;
  const cardTransform = flying === 'right'
    ? 'translate(500px,-80px) rotate(25deg)'
    : flying === 'left'
    ? 'translate(-500px,-80px) rotate(-25deg)'
    : `translate(${dragX}px,0) rotate(${rot}deg)`;

  const likeOpacity = Math.min(1, Math.max(0, dragX / 80));
  const skipOpacity = Math.min(1, Math.max(0, -dragX / 80));

  const posterBg = getPosterBackground(film);

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.paper,
      backgroundImage: C.wash,
      fontFamily: FONT_BODY,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '12px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          data-testid="button-back"
          onClick={() => setLocation(isGroup ? '/group/slot' : '/slot')}
          style={{ background: 'none', border: 'none', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.inkSoft, padding: 0, cursor: 'pointer' }}
        >← back</button>
        <div data-testid="text-card-counter" style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '.1em', color: C.inkSoft, textTransform: 'uppercase' }}>
          {idx + 1} of {films.length}
        </div>
        <button
          data-testid={`button-save-${film.id}`}
          aria-label={saved[film.id] ? 'remove from saved' : 'save for later'}
          onClick={() => setSaved(s => ({ ...s, [film.id]: !s[film.id] }))}
          style={{
            background: saved[film.id] ? C.pink : 'transparent',
            color: C.onAccent,
            border: `1px solid ${C.edge}`,
            borderRadius: '50%',
            width: 32, height: 32,
            fontSize: 16,
            boxShadow: saved[film.id] ? C.shadowChip : 'none',
            cursor: 'pointer',
          }}
        >{saved[film.id] ? '♥' : '♡'}</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 8 }}>
        {films.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 18 : 6,
            height: 6,
            borderRadius: 3,
            background: i === idx ? C.pink : C.inkLight,
            opacity: i === idx ? 1 : .35,
            transition: 'width .2s',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, padding: '0 18px', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {nextFilm && (
          <div style={{
            position: 'absolute', top: 6, left: 28, right: 28, bottom: 0,
            border: `1px solid ${C.edgeCard}`, borderRadius: 20,
            background: C.paper2, opacity: .45, transform: 'rotate(2deg) translateY(6px)', zIndex: 0,
          }} />
        )}

        <div
          onMouseDown={handleDown}
          onTouchStart={handleDown}
          style={{
            position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column',
            transform: cardTransform,
            transition: flying ? 'transform .3s ease-out' : dragRef.current.active ? 'none' : 'transform .2s ease',
            cursor: 'grab', userSelect: 'none', touchAction: 'none',
          }}
        >
          <div style={{
            border: `1px solid ${C.edgeCard}`, borderRadius: 20,
            background: C.paper2, boxShadow: C.shadowCard,
            padding: 18, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 24, right: 20, transform: 'rotate(14deg)',
              padding: '4px 12px', border: `3px solid ${C.pink}`, color: C.pink,
              fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, borderRadius: 6,
              opacity: likeOpacity, background: 'rgba(242,164,136,.10)', pointerEvents: 'none', zIndex: 10,
            }}>LOVE ♥</div>
            <div style={{
              position: 'absolute', top: 24, left: 20, transform: 'rotate(-14deg)',
              padding: '4px 12px', border: `3px solid ${C.inkSoft}`, color: C.inkSoft,
              fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, borderRadius: 6,
              opacity: skipOpacity, background: 'rgba(107,98,92,.06)', pointerEvents: 'none', zIndex: 10,
            }}>SKIP</div>

            <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden', position: 'relative', border: `1px solid ${C.edge}` }}>
              {livePosterUrl && !posterErrors[film.id] ? (
                <img
                  data-testid={`img-poster-${film.id}`}
                  src={`/api/image/poster?url=${encodeURIComponent(livePosterUrl)}&title=${encodeURIComponent(film.title)}`}
                  alt={film.title}
                  onError={() => setPosterErrors(e => ({ ...e, [film.id]: true }))}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: posterBg }} />
              )}
              <div style={{
                position: 'absolute', left: 10, right: 10, bottom: 10,
                background: 'rgba(255,252,250,.93)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(36,31,29,.14)',
                borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, lineHeight: 1.05, color: C.ink }}>{film.title}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.1em', color: C.inkSoft, marginTop: 3, textTransform: 'uppercase' }}>
                  {film.year} · {film.director}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, marginTop: 14, flexWrap: 'wrap' }}>
              <Chip color={C.mint} text={film.streaming} />
              <Chip text={film.runtime} />
              <Chip text={film.rating} />
            </div>

            <div style={{
              marginTop: 14, padding: '11px 13px',
              background: C.yellow, border: `1px solid ${C.edge}`, borderRadius: 10,
            }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.12em', color: C.onAccent, textTransform: 'uppercase', marginBottom: 4 }}>cine says ✦</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.35, color: C.onAccent }}>"{why}"</div>
            </div>

            <div style={{ background: C.paper2, border: `1px solid ${C.edge}`, borderRadius: 12, padding: '12px 13px', marginTop: 12 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.1em', color: C.inkLight, textTransform: 'uppercase', marginBottom: 8 }}>what you're in for</div>
              <VibeBars film={film} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 28px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            data-testid="button-next-pick"
            onClick={() => flyCard('left')}
            style={{
              flex: 1, padding: '11px',
              border: `1px solid ${C.edgeStrong}`, borderRadius: 100,
              background: 'transparent', color: C.ink,
              fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14,
              whiteSpace: 'nowrap', cursor: 'pointer',
              transition: 'transform .22s cubic-bezier(.2,1.5,.4,1)',
            }}
          >not tonight</button>
          <button
            data-testid="button-watch"
            onClick={handleWatch}
            disabled={watching}
            style={{
              flex: 2, padding: '11px 20px',
              border: `1px solid ${watching ? 'rgba(36,31,29,.12)' : C.yellow}`, borderRadius: 100,
              background: watching ? C.paper2 : C.yellow,
              color: watching ? C.inkLight : C.onAccent,
              fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
              boxShadow: watching ? 'none' : C.shadowBtn,
              whiteSpace: 'nowrap',
              cursor: watching ? 'default' : 'pointer',
              transition: 'transform .22s cubic-bezier(.2,1.5,.4,1)',
            }}
          >{watching ? 'rolling credits…' : "this one, let's go"}</button>
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.1em', color: C.inkLight, textTransform: 'uppercase', textAlign: 'center' }}>
          swipe left to pass · right to keep it for later
        </div>
      </div>
    </div>
  );
}
