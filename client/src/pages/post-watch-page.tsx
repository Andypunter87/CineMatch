import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { C, getStreamingUrl, type CatalogueFilm, CATALOGUE_FILMS } from "@/lib/cinema-catalogue";

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

  const bgColor = cardData?.bgColour || `linear-gradient(155deg,${C.pink} 0%,${C.coral} 45%,${C.yellow} 100%)`;
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
      <div style={{
        minHeight: '100dvh', background: '#F3ECDA', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14, padding: '0 22px',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: C.yellow, border: `2px solid ${C.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 28, color: C.ink,
        }}>C</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 20, color: C.ink }}>generating your mood card…</div>
      </div>
    );
  }

  if (cardStatus === 'unavailable') {
    return (
      <div style={{
        minHeight: '100dvh', background: '#F3ECDA', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px', gap: 16,
      }}>
        <div style={{
          background: C.yellow, border: `2px solid ${C.ink}`, borderRadius: 14,
          padding: '14px 16px', boxShadow: `4px 4px 0 ${C.ink}`, transform: 'rotate(-.8deg)',
        }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', color: C.ink, textTransform: 'uppercase' }}>MOOD CARDS</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 24, lineHeight: 1, marginTop: 6, color: C.ink }}>
            watch a few more films to unlock your first card!
          </div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.inkSoft, marginTop: 6 }}>
            mood cards drop after you've built up a watch history. keep going!
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: C.yellow, border: `2px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: C.ink, flexShrink: 0,
          }}>C</div>
          <div style={{
            background: '#FAF6EE', border: `1.5px solid ${C.ink}`, borderRadius: '4px 14px 14px 14px',
            padding: '8px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.ink,
            flex: 1, boxShadow: `2px 2px 0 ${C.ink}`,
          }}>great pick tonight. come back next time for your mood card drop 🎬</div>
        </div>
        <button data-testid="button-find-another" onClick={onDone} style={{
          width: '100%', padding: '12px', border: `2px solid ${C.ink}`, borderRadius: 100,
          background: C.ink, color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 18, cursor: 'pointer',
          boxShadow: `3px 3px 0 rgba(0,0,0,.2)`,
        }}>find another film →</button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F3ECDA', fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px', gap: 16,
    }}>
      {!revealed ? (
        <>
          <div style={{
            background: C.yellow, border: `2px solid ${C.ink}`, borderRadius: 14,
            padding: '14px 16px', boxShadow: `4px 4px 0 ${C.ink}`, transform: 'rotate(-.8deg)',
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', color: C.ink, textTransform: 'uppercase' }}>RARE DROP ✦</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 26, lineHeight: 1, marginTop: 6, color: C.ink }}>
              your {monthName.toLowerCase()} mood card is ready!
            </div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.ink, marginTop: 6 }}>
              based on everything you've watched this month. drops like this happen 1–4× a month.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: C.yellow, border: `2px solid ${C.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: C.ink,
              boxShadow: `2px 2px 0 ${C.ink}`, flexShrink: 0,
            }}>C</div>
            <div style={{
              background: '#FAF6EE', border: `1.5px solid ${C.ink}`, borderRadius: '4px 14px 14px 14px',
              padding: '8px 12px', fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.ink,
              flex: 1, boxShadow: `2px 2px 0 ${C.ink}`,
            }}>"{moodName}" — that's the vibe of your {monthName.toLowerCase()} in film {emojis}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button data-testid="button-reveal-card" onClick={() => setRevealed(true)} style={{
              flex: 2, padding: '12px 24px', border: `2px solid ${C.ink}`, borderRadius: 100,
              background: C.ink, color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 18, cursor: 'pointer',
              boxShadow: `3px 3px 0 rgba(0,0,0,.2)`,
            }}>reveal card →</button>
            <button data-testid="button-later" onClick={onDone} style={{
              flex: 1, padding: '12px', border: `1.5px dashed ${C.ink}`, borderRadius: 100,
              background: 'transparent', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: 16, color: C.ink, cursor: 'pointer',
            }}>later</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 220, aspectRatio: '9/14', borderRadius: 18,
              border: `2.5px solid ${C.ink}`,
              background: bgColor,
              boxShadow: `6px 6px 0 ${C.ink}`, transform: 'rotate(-1.5deg)',
              padding: '14px', display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', overflow: 'hidden', position: 'relative',
            }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.2em', color: C.ink, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  <span>CINEMATCH</span>
                  <span>{now.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase()}</span>
                </div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 22, lineHeight: .95, marginTop: 8, color: C.ink }}>{moodName}</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, marginTop: 4, color: C.ink, opacity: .75 }}>{moodSubtitle}</div>
                <div style={{ fontSize: 20, marginTop: 6 }}>{emojis}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                {CATALOGUE_FILMS.slice(0, 3).map((f, i) => {
                  const [c1, c2, c3] = f.colors;
                  const stripeBg = `repeating-linear-gradient(180deg,${c1} 0 8px,${c2} 8px 16px,${c3} 16px 24px)`;
                  return (
                    <div key={i} style={{
                      width: 42, height: 62, flexShrink: 0, borderRadius: 4,
                      background: stripeBg,
                      border: `1.5px solid ${C.ink}`, boxShadow: `1.5px 1.5px 0 ${C.ink}`,
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
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 7, letterSpacing: '.15em', color: C.ink, opacity: .7, marginBottom: 4, textTransform: 'uppercase' }}>top picks</div>
                  {topFilms.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontFamily: 'Nunito, sans-serif', fontSize: 10, lineHeight: 1.25, color: C.ink }}>{i + 1}. {t}</div>
                  ))}
                </div>
              )}

              <div style={{
                position: 'absolute', top: 12, right: -28, transform: 'rotate(18deg)',
                fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.15em',
                padding: '3px 32px', border: `1.5px solid ${C.ink}`, background: C.yellow,
                color: C.ink, textTransform: 'uppercase',
              }}>{now.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button data-testid="button-share" onClick={handleShare} style={{
              flex: 2, padding: '10px 20px', border: `2px solid ${C.ink}`, borderRadius: 100,
              background: C.ink, color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16, cursor: 'pointer',
              boxShadow: `3px 3px 0 rgba(0,0,0,.2)`,
            }}>↗ share</button>
            <button data-testid="button-save" onClick={onDone} style={{
              flex: 1, padding: '10px', border: `2px solid ${C.ink}`, borderRadius: 100,
              background: '#FAF6EE', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: 16,
              color: C.ink, cursor: 'pointer', boxShadow: `3px 3px 0 ${C.ink}`,
            }}>save</button>
          </div>
          <button data-testid="button-find-another" onClick={onDone} style={{
            width: '100%', padding: '10px', border: `1.5px dashed ${C.ink}`, borderRadius: 100,
            background: 'transparent', fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: 16,
            color: C.ink, cursor: 'pointer',
          }}>find another film →</button>
          <div style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: '.1em', color: C.inkLight, textTransform: 'uppercase' }}>
            next drop: sometime next month 🎲
          </div>
        </>
      )}
    </div>
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
    <div style={{
      minHeight: '100dvh',
      background: '#FAF6EE',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 22px',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
          <div style={{
            width: 90,
            height: 135,
            flexShrink: 0,
            borderRadius: 8,
            border: `2px solid ${C.ink}`,
            overflow: 'hidden',
            background: stripeBg,
            boxShadow: `3px 3px 0 ${C.ink}`,
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
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', color: C.inkSoft, textTransform: 'uppercase' }}>how was it?</div>
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 32, lineHeight: 1, marginTop: 4, color: C.ink, margin: '4px 0 0' }}>{film.title}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: C.yellow, border: `2px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: C.ink,
            boxShadow: `2px 2px 0 ${C.ink}`, flexShrink: 0,
          }}>C</div>
          <div style={{
            background: '#F3ECDA', border: `1.5px solid ${C.ink}`,
            borderRadius: '4px 14px 14px 14px', padding: '8px 12px',
            fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.ink,
            flex: 1, boxShadow: `2px 2px 0 ${C.ink}`,
          }}>good choice? give it some stars and i'll get better at this 🌟</div>
        </div>

        <div style={{
          background: '#F3ECDA', border: `2px solid ${C.ink}`, borderRadius: 16,
          padding: '14px 16px', boxShadow: `3px 3px 0 ${C.ink}`,
        }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '.12em', color: C.inkLight, textTransform: 'uppercase', marginBottom: 12 }}>your rating</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(s => {
              const active = (rated !== null && s <= rated) || (hover !== null && s <= hover);
              return (
                <button
                  key={s}
                  data-testid={`button-star-${s}`}
                  onClick={() => handleRate(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    width: 50, height: 50, borderRadius: '50%',
                    border: `2px solid ${active ? C.pink : C.ink}`,
                    background: active ? C.pink : '#FAF6EE',
                    color: active ? 'white' : C.ink,
                    fontSize: 22,
                    boxShadow: active ? `2px 2px 0 ${C.ink}` : 'none',
                    transform: active ? 'translate(-1px,-1px)' : 'none',
                    transition: 'all .1s ease',
                    cursor: 'pointer',
                  }}
                >★</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '.08em' }}>meh</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '.08em' }}>loved it</div>
          </div>
        </div>

        <button
          data-testid="button-skip-rating"
          onClick={handleDone}
          style={{
            background: 'none', border: 'none', fontFamily: 'Nunito, sans-serif',
            fontSize: 13, color: C.inkSoft, textDecoration: 'underline', cursor: 'pointer', textAlign: 'center',
          }}
        >skip for now</button>
      </div>
    </div>
  );
}
