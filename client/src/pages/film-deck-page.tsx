import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { C, CATALOGUE_FILMS, getPosterBackground, getStreamingUrl, WHY_TEXT, type CatalogueFilm } from "@/lib/cinema-catalogue";

function Chip({ text, color }: { text: string; color?: string }) {
  return (
    <div style={{
      padding: '3px 10px',
      background: color || '#FAF6EE',
      border: `1.5px solid ${C.ink}`,
      borderRadius: 100,
      fontFamily: 'Nunito, sans-serif',
      fontSize: 11,
      color: C.ink,
    }}>{text}</div>
  );
}

function VibeBars({ film }: { film: CatalogueFilm }) {
  const bars = [
    { l: 'cosy-ness', v: film.why.cosy,    c: C.yellow },
    { l: 'funny',     v: film.why.funny,    c: C.pink },
    { l: 'thinky',    v: film.why.thinky,   c: C.blue },
    { l: 'tense',     v: film.why.tense,    c: C.coral },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: C.inkSoft, width: 68, flexShrink: 0 }}>{b.l}</div>
          <div style={{ flex: 1, height: 7, background: '#FAF6EE', border: `1.5px solid ${C.ink}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${b.v}%`, height: '100%', background: b.c, transition: 'width .6s ease' }} />
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: C.inkLight, width: 26, textAlign: 'right' }}>{b.v}</div>
        </div>
      ))}
    </div>
  );
}

export default function FilmDeckPage() {
  const [, setLocation] = useLocation();
  const films: CatalogueFilm[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('cinematch_films') || '[]');
    } catch { return CATALOGUE_FILMS.slice(0, 5); }
  })();

  const reelsRaw = (() => {
    try { return JSON.parse(localStorage.getItem('cinematch_reels') || '[]'); } catch { return []; }
  })();
  const feel = reelsRaw?.[0]?.opts?.[reelsRaw[0]?.i] || 'cosy';
  const isGroup = localStorage.getItem('cinematch_is_group') === '1';

  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [watching, setWatching] = useState(false);
  const dragRef = useRef({ x: 0, active: false });
  const [dragX, setDragX] = useState(0);
  const [flying, setFlying] = useState<'left' | 'right' | null>(null);

  const film = films[idx] || CATALOGUE_FILMS[0];
  const nextFilm = films[idx + 1];
  const whyFn = WHY_TEXT[feel] || ((t: string) => `${t} hits the vibe you're after.`);
  const why = whyFn(film.title);

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
      background: '#F3ECDA',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '12px 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          data-testid="button-back"
          onClick={() => setLocation(isGroup ? '/group/slot' : '/slot')}
          style={{ background: 'none', border: 'none', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: 16, color: C.inkSoft, padding: 0, cursor: 'pointer' }}
        >← back</button>
        <div data-testid="text-card-counter" style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.1em', color: C.inkSoft, textTransform: 'uppercase' }}>
          {idx + 1} of {films.length}
        </div>
        <button
          data-testid={`button-save-${film.id}`}
          onClick={() => setSaved(s => ({ ...s, [film.id]: !s[film.id] }))}
          style={{
            background: saved[film.id] ? C.pink : '#FAF6EE',
            color: saved[film.id] ? 'white' : C.ink,
            border: `1.5px solid ${C.ink}`,
            borderRadius: '50%',
            width: 32, height: 32,
            fontSize: 16,
            boxShadow: saved[film.id] ? `2px 2px 0 ${C.ink}` : 'none',
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
            border: `2px solid ${C.ink}`, borderRadius: 16,
            background: '#FAF6EE', opacity: .45, transform: 'rotate(2deg) translateY(8px)', zIndex: 0,
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
            border: `2px solid ${C.ink}`, borderRadius: 16,
            background: '#FAF6EE', boxShadow: `5px 5px 0 ${C.ink}`,
            padding: 14, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 20, right: 16, transform: 'rotate(14deg)',
              padding: '5px 12px', border: `3px solid ${C.pink}`, color: C.pink,
              fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 24, borderRadius: 6,
              opacity: likeOpacity, background: 'rgba(255,77,143,.08)', pointerEvents: 'none', zIndex: 10,
            }}>LOVE ♥</div>
            <div style={{
              position: 'absolute', top: 20, left: 16, transform: 'rotate(-14deg)',
              padding: '5px 12px', border: `3px solid ${C.inkSoft}`, color: C.inkSoft,
              fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 24, borderRadius: 6,
              opacity: skipOpacity, background: 'rgba(74,74,74,.06)', pointerEvents: 'none', zIndex: 10,
            }}>SKIP</div>

            <div style={{ flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden', position: 'relative', border: `1.5px solid ${C.ink}` }}>
              <div style={{ width: '100%', height: '100%', background: posterBg }} />
              <div style={{
                position: 'absolute', left: 10, right: 10, bottom: 10,
                background: 'rgba(250,246,238,.93)', border: `1.5px solid ${C.ink}`,
                borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 24, lineHeight: 1, color: C.ink }}>{film.title}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.1em', color: C.inkSoft, marginTop: 3, textTransform: 'uppercase' }}>
                  {film.year} · {film.director}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Chip color={C.blue} text={film.streaming} />
              <Chip text={film.runtime} />
              <Chip text={film.rating} />
            </div>

            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: C.yellow, border: `1.5px solid ${C.ink}`, borderRadius: 10,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.12em', color: C.ink, textTransform: 'uppercase', marginBottom: 3 }}>cine says ✦</div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, lineHeight: 1.35, color: C.ink }}>"{why}"</div>
            </div>

            <div style={{ background: '#F3ECDA', border: `1.5px solid ${C.ink}`, borderRadius: 10, padding: '8px 10px', marginTop: 8 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.1em', color: C.inkLight, textTransform: 'uppercase', marginBottom: 6 }}>what you're in for</div>
              <VibeBars film={film} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 18px 32px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            data-testid="button-next-pick"
            onClick={() => flyCard('left')}
            style={{
              flex: 1, padding: '10px',
              border: `2px solid ${C.ink}`, borderRadius: 100,
              background: '#FAF6EE',
              fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16,
              boxShadow: `3px 3px 0 ${C.ink}`, cursor: 'pointer',
            }}
          >← next pick</button>
          <button
            data-testid="button-watch"
            onClick={handleWatch}
            disabled={watching}
            style={{
              flex: 2, padding: '10px 20px',
              border: `2px solid ${C.ink}`, borderRadius: 100,
              background: watching ? '#F3ECDA' : C.ink,
              color: watching ? C.inkLight : 'white',
              fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 18,
              boxShadow: watching ? 'none' : `3px 3px 0 ${C.ink}`,
              cursor: watching ? 'default' : 'pointer',
            }}
          >{watching ? 'opening…' : '▶ watch it'}</button>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.1em', color: C.inkLight, textTransform: 'uppercase', textAlign: 'center' }}>
          swipe ← to skip · swipe → to save · tap watch to go
        </div>
      </div>
    </div>
  );
}
