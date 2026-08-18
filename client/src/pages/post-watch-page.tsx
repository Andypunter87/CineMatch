import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { C, getStreamingUrl, type CatalogueFilm, CATALOGUE_FILMS } from "@/lib/cinema-catalogue";
import { Cine, CineBubble, DaylightScreen, MicroLabel, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

interface MoodCardData {
  moodName: string;
  subtitle: string;
  bgColour?: string;
  emojis?: string;
  topFilms?: string[];
  year: number;
  month: number;
}

function MoodCardDrop({ film, rating, onDone }: { film: CatalogueFilm; rating: number; onDone: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [cardData, setCardData] = useState<MoodCardData | null>(null);
  const [cardStatus, setCardStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [posterErrors, setPosterErrors] = useState<Record<number, boolean>>({});
  const now = new Date();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' });

  useEffect(() => {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    fetch('/api/mood-card/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    })
      .then(r => {
        if (r.status === 403 || r.status === 400) {
          setCardStatus('unavailable');
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (data && data.moodName) {
          setCardData(data as MoodCardData);
          setCardStatus('ready');
        } else if (cardStatus !== 'unavailable') {
          setCardStatus('unavailable');
        }
      })
      .catch(() => setCardStatus('unavailable'));
  }, []);

  const bgColor = cardData?.bgColour || `linear-gradient(160deg, ${C.pink} 0%, ${C.coral} 48%, ${C.yellow} 100%)`;
  const moodName = cardData?.moodName || 'Bittersweet & Beautiful';
  const moodSubtitle = cardData?.subtitle || `your ${monthName.toLowerCase()} in film`;
  const topFilms = cardData?.topFilms || [];
  const emojis = cardData?.emojis || '🎬';

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Cinematch Mood Card', text: `My ${monthName} film mood: ${moodName} ${emojis}`, url: window.location.origin });
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.origin);
    }
  }

  if (cardStatus === 'loading') {
    return (
      <DaylightScreen style={{ justifyContent: 'center', alignItems: 'center', gap: 14, padding: '0 22px' }}>
        <Cine size={60} />
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20, color: C.ink }}>generating your mood card…</div>
      </DaylightScreen>
    );
  }

  if (cardStatus === 'unavailable') {
    return (
      <DaylightScreen style={{ justifyContent: 'center', padding: '0 22px', gap: 16 }}>
        <div style={{
          background: C.yellow, border: `1px solid ${C.edge}`, borderRadius: 14,
          padding: '14px 16px', boxShadow: C.shadowPanel,
        }}>
          <MicroLabel color={C.onAccent} style={{ letterSpacing: '.15em', fontSize: 10 }}>MOOD CARDS</MicroLabel>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, lineHeight: 1.1, marginTop: 6, color: C.onAccent }}>
            watch a few more films to unlock your first card!
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.35, color: 'rgba(36,31,29,.75)', marginTop: 6 }}>
            mood cards drop after you've built up a watch history. keep going!
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Cine size={30} />
          <CineBubble>great pick tonight. come back next time for your mood card drop 🎬</CineBubble>
        </div>
        <button data-testid="button-find-another" onClick={onDone} style={{
          width: '100%', padding: '13px', border: `1px solid ${C.yellow}`, borderRadius: 100,
          background: C.yellow, color: C.onAccent, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
          whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: C.shadowBtn,
        }}>find another film →</button>
      </DaylightScreen>
    );
  }

  return (
    <DaylightScreen style={{ justifyContent: 'center', padding: '0 22px', gap: 16 }}>
      {!revealed ? (
        <>
          <div style={{
            background: C.yellow, border: `1px solid ${C.edge}`, borderRadius: 14,
            padding: '14px 16px', boxShadow: C.shadowPanel,
          }}>
            <MicroLabel color={C.onAccent} style={{ letterSpacing: '.15em', fontSize: 10 }}>RARE DROP ✦</MicroLabel>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 21, lineHeight: 1.1, marginTop: 6, color: C.onAccent }}>
              your {monthName.toLowerCase()} mood card is ready!
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.35, color: 'rgba(36,31,29,.75)', marginTop: 6 }}>
              based on everything you've watched this month. drops like this happen 1–4× a month.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Cine size={30} />
            <CineBubble>"{moodName}" — that's the vibe of your {monthName.toLowerCase()} in film {emojis}</CineBubble>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button data-testid="button-reveal-card" onClick={() => setRevealed(true)} style={{
              flex: 2, padding: '13px 24px', border: `1px solid ${C.yellow}`, borderRadius: 100,
              background: C.yellow, color: C.onAccent, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
              whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: C.shadowBtn,
            }}>reveal card →</button>
            <button data-testid="button-later" onClick={onDone} style={{
              flex: 1, padding: '13px', border: `1px dashed ${C.edgeDash}`, borderRadius: 100,
              background: 'transparent', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14, color: C.ink,
              whiteSpace: 'nowrap', cursor: 'pointer',
            }}>later</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 240, aspectRatio: '9/14', borderRadius: 18,
              border: '1px solid rgba(36,31,29,.14)',
              background: bgColor,
              boxShadow: '0 14px 34px rgba(74,52,40,.13)',
              padding: '14px', display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', overflow: 'hidden', position: 'relative',
            }}>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.2em', color: C.onAccent, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  <span>CINEMATCH</span>
                  <span>{now.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase()}</span>
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: .95, marginTop: 8, color: C.onAccent }}>{moodName}</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, marginTop: 4, color: C.onAccent, opacity: .75 }}>{moodSubtitle}</div>
                <div style={{ fontSize: 20, marginTop: 6 }}>{emojis}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                {CATALOGUE_FILMS.slice(0, 3).map((f, i) => {
                  const [c1, c2, c3] = f.colors;
                  const stripeBg = `repeating-linear-gradient(180deg,${c1} 0 8px,${c2} 8px 16px,${c3} 16px 24px)`;
                  return (
                    <div key={i} style={{
                      width: 46, height: 66, flexShrink: 0, borderRadius: 4,
                      background: stripeBg,
                      border: '1px solid rgba(36,31,29,.18)',
                      boxShadow: C.shadowChip,
                      transform: `rotate(${(i - 1) * 5}deg)`,
                      overflow: 'hidden',
                    }}>
                      {f.posterPath && !posterErrors[f.id] && (
                        <img
                          data-testid={`img-poster-mood-${f.id}`}
                          src={`/api/image/poster?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w200${f.posterPath}`)}&title=${encodeURIComponent(f.title)}`}
                          alt={f.title}
                          onError={() => setPosterErrors(e => ({ ...e, [f.id]: true }))}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {topFilms.length > 0 && (
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 7, letterSpacing: '.15em', color: C.onAccent, opacity: .7, marginBottom: 4, textTransform: 'uppercase' }}>top picks</div>
                  {topFilms.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 10, lineHeight: 1.25, color: C.onAccent }}>{i + 1}. {t}</div>
                  ))}
                </div>
              )}

              <div style={{
                position: 'absolute', top: 12, right: -28, transform: 'rotate(18deg)',
                fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.15em',
                padding: '3px 32px', border: '1px solid rgba(36,31,29,.16)', background: C.yellow,
                color: C.onAccent, textTransform: 'uppercase',
              }}>{now.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button data-testid="button-share" onClick={handleShare} style={{
              flex: 2, padding: '12px 20px', border: `1px solid ${C.yellow}`, borderRadius: 100,
              background: C.yellow, color: C.onAccent, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
              whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: C.shadowBtn,
            }}>↗ share</button>
            <button data-testid="button-save" onClick={onDone} style={{
              flex: 1, padding: '12px', border: `1px solid ${C.edgeStrong}`, borderRadius: 100,
              background: C.paper2, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14,
              color: C.ink, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: C.shadowBtn,
            }}>save</button>
          </div>
          <button data-testid="button-find-another" onClick={onDone} style={{
            width: '100%', padding: '11px', border: `1px dashed ${C.edgeDash}`, borderRadius: 100,
            background: 'transparent', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14,
            color: C.ink, whiteSpace: 'nowrap', cursor: 'pointer',
          }}>find another film →</button>
          <div style={{ textAlign: 'center', fontFamily: FONT_MONO, fontSize: 8, letterSpacing: '.1em', color: C.inkLight, textTransform: 'uppercase' }}>
            next drop: sometime next month 🎲
          </div>
        </>
      )}
    </DaylightScreen>
  );
}

export default function PostWatchPage() {
  const [, setLocation] = useLocation();
  const [hover, setHover] = useState<number | null>(null);
  const [rated, setRated] = useState<number | null>(null);
  const [showDrop, setShowDrop] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const film: CatalogueFilm = (() => {
    try { return JSON.parse(localStorage.getItem('cinematch_watched_film') || 'null') || CATALOGUE_FILMS[0]; }
    catch { return CATALOGUE_FILMS[0]; }
  })();

  const [c1, c2, c3] = film.colors;
  const stripeBg = `repeating-linear-gradient(180deg,${c1} 0 8px,${c2} 8px 16px,${c3} 16px 24px)`;

  async function handleRate(s: number) {
    setRated(s);
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmId: film.id, filmTitle: film.title, rating: s }),
      });
    } catch {}
    window.open(getStreamingUrl(film), '_blank');
    setTimeout(() => setShowDrop(true), 400);
  }

  function handleDone() {
    setLocation('/');
  }

  if (showDrop) {
    return <MoodCardDrop film={film} rating={rated || 3} onDone={handleDone} />;
  }

  return (
    <DaylightScreen style={{ padding: '0 22px' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
          <div style={{
            width: 90,
            height: 135,
            flexShrink: 0,
            borderRadius: 8,
            border: `1px solid ${C.edge}`,
            overflow: 'hidden',
            background: stripeBg,
            boxShadow: C.shadowBtn,
          }}>
            {film.posterPath && !posterError && (
              <img
                data-testid="img-poster-watched"
                src={`/api/image/poster?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w300${film.posterPath}`)}&title=${encodeURIComponent(film.title)}`}
                alt={film.title}
                onError={() => setPosterError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MicroLabel style={{ fontSize: 10, letterSpacing: '.15em' }}>how was it?</MicroLabel>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 27, lineHeight: 1.05, color: C.ink, margin: '4px 0 0' }}>{film.title}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Cine size={30} />
          <CineBubble>good choice? give it some stars and i'll get better at this 🌟</CineBubble>
        </div>

        <div style={{
          background: C.paper2, border: `1px solid ${C.edgeCard}`, borderRadius: 16,
          padding: '14px 16px', boxShadow: C.shadowPanel,
        }}>
          <MicroLabel color={C.inkLight} style={{ marginBottom: 12 }}>your rating</MicroLabel>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(s => {
              const active = (rated !== null && s <= rated) || (hover !== null && s <= hover);
              return (
                <button
                  key={s}
                  data-testid={`button-star-${s}`}
                  aria-label={`rate ${s} star${s > 1 ? 's' : ''}`}
                  onClick={() => handleRate(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    width: 50, height: 50, borderRadius: '50%',
                    border: `1px solid ${active ? C.yellow : C.edge}`,
                    background: active ? C.yellow : 'transparent',
                    color: C.onAccent,
                    fontSize: 22,
                    boxShadow: active ? C.shadowChip : 'none',
                    transition: 'all .22s cubic-bezier(.2,1.5,.4,1)',
                    cursor: 'pointer',
                  }}
                >★</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '.08em' }}>meh</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '.08em' }}>loved it</div>
          </div>
        </div>

        <button
          data-testid="button-skip-rating"
          onClick={handleDone}
          style={{
            background: 'none', border: 'none', fontFamily: FONT_BODY,
            fontSize: 13, color: C.link, textDecoration: 'underline',
            textUnderlineOffset: 2, cursor: 'pointer', textAlign: 'center',
          }}
        >skip for now</button>
      </div>
    </DaylightScreen>
  );
}
