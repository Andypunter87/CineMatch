import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { C, REELS } from "@/lib/cinema-catalogue";
import { Cine, Btn, DaylightScreen, MicroLabel, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

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
    const reelData = reels.map(r => ({ i: r.i, opts: r.opts }));
    localStorage.setItem('cinematch_reels', JSON.stringify(reelData));
    // Films are fetched from the AI recommender on the loading screen;
    // clear any stale picks so the deck never shows the previous spin.
    localStorage.removeItem('cinematch_films');
    localStorage.removeItem('cinematch_source');
    localStorage.setItem('cinematch_is_group', isGroup ? '1' : '0');
    if (isGroup) {
      try {
        const session = JSON.parse(localStorage.getItem('cinematch_session') || 'null');
        const memberId = session?.memberId;
        const sessionId = session?.sessionId;
        const sessionCode = session?.sessionCode;
        if (memberId && sessionId && sessionCode) {
          fetch(`/api/sessions/${sessionId}/reels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId, sessionCode, reels: reelData }),
          }).catch(() => {});
        }
      } catch {}
    }
    setLocation('/loading');
  }

  return (
    <DaylightScreen>
      <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          data-testid="button-back"
          onClick={() => setLocation('/')}
          style={{ background: 'none', border: 'none', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.inkSoft, padding: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >← back</button>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '.1em', color: C.inkSoft, textTransform: 'uppercase' }}>
          {isGroup ? 'group' : 'just me'}
        </div>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <h1 style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 25,
          lineHeight: 1.05,
          color: C.ink,
          margin: 0,
        }}>{isGroup ? "what's the group vibe?" : 'spin your mood'}</h1>
        <p style={{
          fontFamily: FONT_BODY,
          fontSize: 13,
          color: C.inkSoft,
          marginTop: 4,
          marginBottom: 0,
        }}>
          {isGroup
            ? "set tonight's vibe — i'll blend everyone's taste to find the best match"
            : 'swipe ↔  ·  tap 🔒 to keep  ·  surprise me spins the rest'}
        </p>
      </div>

      <div style={{ padding: '0 20px', flex: 1, overflowY: 'auto' }}>
        {isGroup && groupTaste && (
          <div style={{
            padding: '8px 12px', borderRadius: 12, border: `1px solid ${C.edgeCard}`,
            background: C.paper2, marginBottom: 10, boxShadow: C.shadowChip,
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            <MicroLabel color={C.inkLight} style={{ fontSize: 8, width: '100%', marginBottom: 4 }}>
              group taste (from your history)
            </MicroLabel>
            {Object.entries(groupTaste).map(([k, v]) => (
              <div key={k} style={{
                padding: '2px 8px', borderRadius: 100,
                background: v > 70 ? C.pink : v > 40 ? C.yellow : 'transparent',
                border: `1px solid ${C.edge}`,
                fontFamily: FONT_BODY, fontSize: 11, color: C.onAccent,
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
                border: '1px solid rgba(36,31,29,.16)',
                borderRadius: 14,
                marginTop: ri ? 10 : 0,
                background: C.paper2,
                overflow: 'hidden',
                boxShadow: r.locked ? C.shadowBtn : 'none',
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
                color: C.onAccent,
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                borderBottom: '1px solid rgba(36,31,29,.16)',
              }}>
                <span>{r.label}</span>
                <span style={{ opacity: .8 }}>{r.i + 1}/{r.opts.length}</span>
              </div>

              <div style={{ padding: '10px 8px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  data-testid={`button-lock-${ri}`}
                  aria-label={r.locked ? `unlock ${r.label}` : `lock ${r.label}`}
                  onClick={() => toggleLock(ri)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    border: '1px solid rgba(36,31,29,.14)', fontSize: 14,
                    background: r.locked ? C.yellow : 'transparent',
                    boxShadow: r.locked ? C.shadowChip : 'none',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{r.locked ? '🔒' : '🔓'}</button>

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, opacity: .25, whiteSpace: 'nowrap', color: C.ink }}>{prev}</div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 20, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>{curr}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, opacity: .25, whiteSpace: 'nowrap', color: C.ink }}>{next}</div>
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    data-testid={`button-prev-${ri}`}
                    aria-label={`previous ${r.label} option`}
                    onClick={() => setReelIdx(ri, r.i - 1)}
                    style={{ width: 24, height: 24, border: '1px solid rgba(36,31,29,.14)', borderRadius: 6, background: C.paper, fontSize: 12, cursor: 'pointer', color: C.ink }}
                  >‹</button>
                  <button
                    data-testid={`button-next-${ri}`}
                    aria-label={`next ${r.label} option`}
                    onClick={() => setReelIdx(ri, r.i + 1)}
                    style={{ width: 24, height: 24, border: '1px solid rgba(36,31,29,.14)', borderRadius: 6, background: C.paper, fontSize: 12, cursor: 'pointer', color: C.ink }}
                  >›</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 10px 8px', alignItems: 'center' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: C.inkLight }}>‹ swipe ›</div>
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
          border: `1px dashed ${C.edgeDash}`,
          borderRadius: 12,
          background: C.paper,
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <Cine size={26} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.35, color: C.ink, flex: 1 }}>
            reading: <b style={{ fontFamily: FONT_DISPLAY, fontSize: 13 }}>{reels[0].opts[reels[0].i]}</b>
            {' '}· <b style={{ fontFamily: FONT_DISPLAY, fontSize: 13 }}>{reels[1].opts[reels[1].i]}</b>
            {' '}· <b style={{ fontFamily: FONT_DISPLAY, fontSize: 13 }}>{reels[2].opts[reels[2].i]}</b>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 28px', display: 'flex', gap: 10 }}>
        <Btn testId="button-roll" onClick={roll} small outline disabled={rolling} style={{ flex: 1 }}>surprise me</Btn>
        <Btn
          testId="button-find"
          onClick={handleFind}
          primary
          disabled={isGroup && groupTaste === null}
          style={{ flex: 2 }}
        >{(isGroup && groupTaste === null) ? 'loading taste…' : 'find me something'}</Btn>
      </div>
    </DaylightScreen>
  );
}
