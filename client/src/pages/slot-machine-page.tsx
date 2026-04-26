import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { C, REELS, matchFilms, matchFilmsGroup } from "@/lib/cinema-catalogue";

interface ReelState {
  opts: string[];
  i: number;
  locked: boolean;
  col: string;
  label: string;
}

interface SlotMachinePageProps {
  isGroup?: boolean;
}

export default function SlotMachinePage({ isGroup = false }: SlotMachinePageProps) {
  const [, setLocation] = useLocation();
  const [reels, setReels] = useState<ReelState[]>(() =>
    REELS.map((r, i) => ({ ...r, i: i === 1 ? 1 : 0, locked: false }))
  );
  const [rolling, setRolling] = useState(false);
  const [groupTaste, setGroupTaste] = useState<Record<string, number> | null>(null);
  const touchStart = useRef<Record<number, number>>({});

  useEffect(() => {
    if (!isGroup) return;
    const DEFAULTS = { cosy: 60, thinky: 55, funny: 65, tense: 40, romantic: 55 };
    try {
      const session = JSON.parse(localStorage.getItem('cinematch_session') || 'null');
      const code: string | null = session?.sessionCode ?? null;
      if (!code) { setGroupTaste(DEFAULTS); return; }
      fetch(`/api/sessions/${code}/taste`)
        .then(r => r.ok ? r.json() : null)
        .then((data: Record<string, number> | null) => {
          if (data && Object.values(data).some(v => v > 0)) {
            setGroupTaste(data);
          } else {
            setGroupTaste(DEFAULTS);
          }
        })
        .catch(() => setGroupTaste(DEFAULTS));
    } catch {
      setGroupTaste({ cosy: 60, thinky: 55, funny: 65, tense: 40, romantic: 55 });
    }
  }, [isGroup]);

  function setReelIdx(ri: number, ni: number) {
    setReels(prev => prev.map((r, i) =>
      i === ri ? { ...r, i: ((ni % r.opts.length) + r.opts.length) % r.opts.length } : r
    ));
  }

  function toggleLock(ri: number) {
    setReels(prev => prev.map((r, i) => i === ri ? { ...r, locked: !r.locked } : r));
  }

  function roll() {
    setRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setReels(prev => prev.map(r => r.locked ? r : { ...r, i: Math.floor(Math.random() * r.opts.length) }));
      count++;
      if (count > 8) { clearInterval(interval); setRolling(false); }
    }, 80);
  }

  function handleFind() {
    const blendedTaste = groupTaste || { cosy: 60, thinky: 55, funny: 65, tense: 40, romantic: 55 };
    const films = isGroup ? matchFilmsGroup(reels, blendedTaste) : matchFilms(reels);
    const reelData = reels.map(r => ({ i: r.i, opts: r.opts }));
    localStorage.setItem('cinematch_reels', JSON.stringify(reelData));
    localStorage.setItem('cinematch_films', JSON.stringify(films));
    localStorage.setItem('cinematch_is_group', isGroup ? '1' : '0');
    setLocation('/loading');
  }

  const readback = `feeling ${reels[0].opts[reels[0].i]}, ${reels[1].opts[reels[1].i]}, ${reels[2].opts[reels[2].i]}, era: ${reels[3].opts[reels[3].i]}`;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#E8DDC8',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          data-testid="button-back"
          onClick={() => setLocation('/')}
          style={{ background: 'none', border: 'none', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: 16, color: C.inkSoft, padding: 0, cursor: 'pointer' }}
        >← back</button>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.1em', color: C.inkSoft, textTransform: 'uppercase' }}>
          {isGroup ? 'group' : 'just me'}
        </div>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <h1 style={{
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1,
          color: C.ink,
          margin: 0,
        }}>{isGroup ? "what's the group vibe?" : 'spin your mood'}</h1>
        <p style={{
          fontFamily: 'Nunito, sans-serif',
          fontSize: 13,
          color: C.inkSoft,
          marginTop: 4,
          marginBottom: 0,
        }}>
          {isGroup
            ? "set tonight's vibe — i'll blend everyone's taste"
            : 'swipe ↔  ·  tap 🔒 to keep  ·  ROLL spins the rest'}
        </p>
      </div>

      <div style={{ padding: '0 20px', flex: 1, overflowY: 'auto' }}>
        {isGroup && groupTaste && (
          <div style={{
            padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${C.ink}`,
            background: C.paper2, marginBottom: 10,
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '.1em', width: '100%', marginBottom: 4 }}>
              group taste (from your history)
            </div>
            {Object.entries(groupTaste).map(([k, v]) => (
              <div key={k} style={{
                padding: '2px 8px', borderRadius: 100,
                background: v > 70 ? C.pink : v > 40 ? C.yellow : '#FAF6EE',
                border: `1.5px solid ${C.ink}`,
                fontFamily: 'Nunito, sans-serif', fontSize: 11, color: C.ink,
              }}>{k} {v}</div>
            ))}
          </div>
        )}

        {reels.map((r, ri) => {
          const prev = r.opts[(r.i - 1 + r.opts.length) % r.opts.length];
          const curr = r.opts[r.i];
          const next = r.opts[(r.i + 1) % r.opts.length];
          return (
            <div
              key={ri}
              style={{
                border: `2px solid ${C.ink}`,
                borderRadius: 14,
                marginTop: ri ? 10 : 0,
                background: C.paper2,
                overflow: 'hidden',
                boxShadow: r.locked ? `3px 3px 0 ${C.ink}` : 'none',
                opacity: rolling && !r.locked ? .7 : 1,
                transition: 'opacity .1s',
              }}
              onTouchStart={e => { touchStart.current[ri] = e.touches[0].clientX; }}
              onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - (touchStart.current[ri] || 0);
                if (Math.abs(dx) > 30) setReelIdx(ri, r.i + (dx < 0 ? 1 : -1));
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '5px 10px',
                background: r.col,
                color: ri === 2 ? C.ink : 'white',
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                letterSpacing: '.1em',
                borderBottom: `2px solid ${C.ink}`,
              }}>
                <span>{r.label}</span>
                <button
                  data-testid={`button-lock-${ri}`}
                  onClick={() => toggleLock(ri)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `1.5px solid ${ri === 2 ? C.ink : 'rgba(255,255,255,.5)'}`,
                    background: r.locked ? C.yellow : 'transparent',
                    color: r.locked ? C.ink : (ri === 2 ? C.ink : 'white'),
                    fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >🔒</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 8 }}>
                <button
                  data-testid={`button-prev-${ri}`}
                  onClick={() => setReelIdx(ri, r.i - 1)}
                  style={{ border: 'none', background: 'none', fontSize: 20, color: C.inkSoft, cursor: 'pointer', padding: '0 4px' }}
                >‹</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: C.inkLight, opacity: .5, marginBottom: 2 }}>{prev}</div>
                  <div style={{
                    fontFamily: 'Nunito, sans-serif',
                    fontWeight: 700,
                    fontSize: 24,
                    color: C.ink,
                    lineHeight: 1.2,
                  }}>{curr}</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, color: C.inkLight, opacity: .5, marginTop: 2 }}>{next}</div>
                </div>
                <button
                  data-testid={`button-next-${ri}`}
                  onClick={() => setReelIdx(ri, r.i + 1)}
                  style={{ border: 'none', background: 'none', fontSize: 20, color: C.inkSoft, cursor: 'pointer', padding: '0 4px' }}
                >›</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px 8px', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.inkLight }}>‹ swipe ›</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {r.opts.map((_, oi) => (
                    <div key={oi} style={{
                      width: oi === r.i ? 10 : 4,
                      height: 4,
                      borderRadius: 2,
                      background: oi === r.i ? C.ink : C.inkLight,
                      opacity: oi === r.i ? 1 : .4,
                      transition: 'width .2s',
                    }} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{
          margin: '12px 0 0',
          padding: '10px 12px',
          border: `1.5px dashed ${C.ink}`,
          borderRadius: 12,
          background: C.paper,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: C.yellow, border: `2px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14,
            color: C.ink, flexShrink: 0,
          }}>C</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, lineHeight: 1.35, color: C.ink, flex: 1 }}>
            reading: <strong>{readback}</strong>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 20px 32px', display: 'flex', gap: 10 }}>
        <button
          data-testid="button-roll"
          onClick={roll}
          disabled={rolling}
          style={{
            flex: 1,
            padding: '12px 18px',
            border: `1.5px dashed ${C.ink}`,
            borderRadius: 100,
            background: 'transparent',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            color: C.ink,
            cursor: rolling ? 'default' : 'pointer',
            opacity: rolling ? .6 : 1,
          }}
        >🎲 ROLL</button>
        <button
          data-testid="button-find"
          onClick={handleFind}
          disabled={isGroup && groupTaste === null}
          style={{
            flex: 2,
            padding: '12px 24px',
            border: `2px solid ${C.ink}`,
            borderRadius: 100,
            background: (isGroup && groupTaste === null) ? '#F3ECDA' : C.ink,
            color: (isGroup && groupTaste === null) ? C.inkLight : 'white',
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            cursor: (isGroup && groupTaste === null) ? 'default' : 'pointer',
            boxShadow: `3px 3px 0 rgba(0,0,0,.2)`,
          }}
        >{(isGroup && groupTaste === null) ? '⏳ loading taste…' : '🎬 find it →'}</button>
      </div>
    </div>
  );
}
