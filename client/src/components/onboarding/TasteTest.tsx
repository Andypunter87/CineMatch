import { useState, useRef, useCallback } from 'react';
import { CINEMATCH_FILMS, CinematchFilm, getStripeGradient } from '@/lib/films';

export interface FilmPick {
  filmId: number;
  rating: number;
}

interface TasteTestProps {
  onComplete: (picks: FilmPick[]) => void;
}

function SwipeCard({ film }: { film: CinematchFilm }) {
  const [imgFailed, setImgFailed] = useState(false);
  const posterUrl = film.posterUrl;
  const showImage = posterUrl && !imgFailed;
  return (
    <div
      className="bg-paper rounded-[18px] p-3"
      style={{
        width: 330,
        border: '2px solid #1A1A1A',
        boxShadow: '5px 5px 0 #1A1A1A',
      }}
    >
      {/* Poster */}
      <div
        className="rounded-[12px] relative overflow-hidden"
        style={{
          height: 460,
          background: showImage ? '#E8D9C8' : getStripeGradient(film),
          border: '1.5px solid #1A1A1A',
        }}
      >
        {showImage ? (
          <img
            src={posterUrl}
            alt={film.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
            data-testid={`img-poster-${film.id}`}
          />
        ) : null}
        {/* Title overlay */}
        <div
          className="absolute left-2.5 right-2.5 bottom-2.5 rounded-[8px] px-2.5 py-2"
          style={{
            background: 'rgba(250,246,238,0.93)',
            border: '1.5px solid #1A1A1A',
          }}
        >
          <p className="font-nunito font-bold text-[18px] leading-none text-ink">{film.title}</p>
          <p className="font-spaceMono text-[8px] tracking-[0.1em] text-inkSoft uppercase mt-0.5">
            {film.year} · {film.director}
          </p>
        </div>
      </div>
      {/* Blurb */}
      <p className="font-nunito text-[12px] leading-relaxed text-inkSoft pt-2.5 px-0.5">
        {film.blurb}
      </p>
    </div>
  );
}

export function TasteTest({ onComplete }: TasteTestProps) {
  const films = CINEMATCH_FILMS;
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [exiting, setExiting] = useState<{ dir: 'left' | 'right'; rating: number } | null>(null);

  const film = films[idx];
  const next = films[idx + 1];

  const record = useCallback((rating: number) => {
    const newPicks = { ...picks, [film.id]: rating };
    setPicks(newPicks);
    setExiting({ dir: rating === 0 ? 'left' : 'right', rating });

    setTimeout(() => {
      if (idx + 1 >= films.length) {
        const result: FilmPick[] = Object.entries(newPicks)
          .filter(([, r]) => r > 0)
          .map(([id, r]) => ({ filmId: Number(id), rating: r }));
        onComplete(result);
      } else {
        setIdx(i => i + 1);
        setExiting(null);
        setHoveredStar(null);
      }
    }, 280);
  }, [picks, film, idx, films.length, onComplete]);

  const exitTransform = exiting
    ? exiting.dir === 'right'
      ? 'translate(500px, -80px) rotate(25deg)'
      : 'translate(-500px, -80px) rotate(-25deg)'
    : '';

  const progress = (idx + 1) / films.length;

  // Drag / swipe state
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || exiting) return;
    const dx = e.clientX - dragRef.current.startX;
    setDragX(dx);
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    const dx = dragX;
    dragRef.current = null;
    setDragX(0);

    if (Math.abs(dx) >= 80) {
      if (dx > 0) {
        record(5);
      } else {
        record(0);
      }
    }
  };

  const loveOpacity = Math.min(1, Math.max(0, (dragX - 20) / 80));
  const skipOpacity = Math.min(1, Math.max(0, (-dragX - 20) / 80));

  const cardTransform = exiting
    ? exitTransform
    : dragX !== 0
      ? `translateX(${dragX}px) rotate(${dragX * 0.08}deg)`
      : 'none';

  return (
    <div className="min-h-screen bg-paper flex flex-col overflow-hidden">
      <div className="flex flex-col h-screen max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-14 pb-2">
          <span className="font-nunito text-[16px] text-inkSoft invisible">← back</span>
          <span className="font-spaceMono text-[10px] tracking-[0.1em] text-inkSoft uppercase">
            {idx + 1} / {films.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="px-5 mb-2.5">
          <div
            className="h-[5px] rounded-[10px] overflow-hidden"
            style={{ background: '#F3ECDA', border: '1.5px solid #1A1A1A' }}
          >
            <div
              className="h-full bg-pink ease-out"
              style={{ transition: 'width 350ms ease', width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Cine prompt */}
        <div className="flex items-center gap-2 px-5 mb-2.5">
          <div
            className="w-7 h-7 rounded-full bg-yellow flex items-center justify-center font-nunito font-extrabold text-[14px] text-ink flex-shrink-0"
            style={{ border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
          >
            C
          </div>
          <p className="font-nunito text-[13px] text-ink leading-tight flex-1 min-w-0">
            <span className="font-nunito font-bold italic text-[15px]">{film.title}</span>
            {' '}— how many stars?
          </p>
        </div>

        {/* Card area */}
        <div className="flex-1 flex items-end justify-center relative overflow-hidden pb-1">
          {/* Back card */}
          {next && !exiting && (
            <div
              className="absolute pointer-events-none"
              style={{ transform: 'translateY(18px) scale(0.92)', opacity: 0.5 }}
            >
              <SwipeCard film={next} />
            </div>
          )}

          {/* Front card with drag */}
          <div
            ref={cardRef}
            style={{
              transform: cardTransform,
              transition: exiting ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : dragX !== 0 ? 'none' : 'transform 0.15s ease',
              position: 'relative',
              cursor: 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* SKIP stamp — left side (drag left) */}
            <div
              className="absolute top-7 left-5 z-10 font-nunito font-extrabold text-[28px] text-inkSoft leading-none pointer-events-none"
              style={{
                opacity: skipOpacity,
                transform: 'rotate(-14deg)',
                border: '3px solid #4A4A4A',
                borderRadius: 6,
                padding: '2px 10px',
                background: 'rgba(74,74,74,0.08)',
              }}
            >
              SKIP
            </div>
            {/* LOVE stamp — right side (drag right) */}
            <div
              className="absolute top-7 right-5 z-10 font-nunito font-extrabold text-[28px] text-pink leading-none pointer-events-none"
              style={{
                opacity: loveOpacity,
                transform: 'rotate(14deg)',
                border: '3px solid #FF4D8F',
                borderRadius: 6,
                padding: '2px 10px',
                background: 'rgba(255,77,143,0.08)',
              }}
            >
              LOVE
            </div>
            <SwipeCard film={film} />
          </div>
        </div>

        {/* 5-star rating row */}
        <div className="px-5 pb-2">
          <div
            className="bg-paper2 rounded-[16px] px-4 py-3"
            style={{ border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}
          >
            <p className="font-spaceMono text-[9px] tracking-[0.12em] text-inkLight uppercase mb-2.5">
              your rating
            </p>
            <div className="flex gap-1.5 justify-center">
              {[1, 2, 3, 4, 5].map(star => {
                const filled = hoveredStar !== null ? star <= hoveredStar : false;
                return (
                  <button
                    key={star}
                    data-testid={`button-star-${star}`}
                    onClick={() => record(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    onTouchStart={() => setHoveredStar(star)}
                    className="w-12 h-12 rounded-full flex items-center justify-center font-nunito font-extrabold text-[18px] leading-none"
                    style={{
                      border: `2px solid ${filled ? '#FF4D8F' : '#1A1A1A'}`,
                      background: filled ? '#FF4D8F' : '#FAF6EE',
                      color: filled ? 'white' : '#1A1A1A',
                      boxShadow: filled ? '2px 2px 0 #1A1A1A' : 'none',
                      transform: filled ? 'translate(-1px,-1px) scale(1.08)' : 'scale(1)',
                      transition: 'all 0.1s ease',
                    }}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 px-1">
              <span className="font-spaceMono text-[8px] text-inkLight uppercase tracking-[0.08em]">no thanks</span>
              <span className="font-spaceMono text-[8px] text-inkLight uppercase tracking-[0.08em]">loved it</span>
            </div>
          </div>

          {/* Haven't seen button */}
          <button
            data-testid="button-not-seen"
            onClick={() => record(0)}
            className="block w-full mt-2 mb-4 font-nunito text-[13px] text-inkSoft rounded-full py-2"
            style={{
              background: 'transparent',
              border: '1.5px dashed #8A8478',
            }}
          >
            ? haven't seen it
          </button>
        </div>
      </div>
    </div>
  );
}

export default TasteTest;
