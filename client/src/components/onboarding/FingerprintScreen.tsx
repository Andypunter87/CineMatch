import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { computeFingerprint } from '@/lib/fingerprint';
import { CINEMATCH_FILMS, getStripeGradient, CinematchFilm } from '@/lib/films';
import { FilmPick } from './TasteTest';

interface FingerprintScreenProps {
  picks: FilmPick[];
  onRestart: () => void;
}

function MiniPoster({ film, rot }: { film: CinematchFilm; rot: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-[4px]"
      style={{
        width: 52,
        height: 76,
        background: getStripeGradient(film),
        border: '1.5px solid #1A1A1A',
        boxShadow: '1.5px 1.5px 0 #1A1A1A',
        transform: `rotate(${rot}deg)`,
      }}
    />
  );
}

function TraitRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-2.5 py-[3px]"
      style={{
        background: 'rgba(250,246,238,0.6)',
        border: '1.5px solid #1A1A1A',
      }}
    >
      <span
        className="font-spaceMono text-[8px] tracking-[0.12em] text-ink uppercase w-9 flex-shrink-0"
        style={{ opacity: 0.65 }}
      >
        {label}
      </span>
      <span className="font-nunito font-bold text-[13px] text-ink leading-none">{value}</span>
    </div>
  );
}

export function FingerprintScreen({ picks, onRestart }: FingerprintScreenProps) {
  const fp = computeFingerprint(picks);
  const sigFilms = fp.topFilmIds
    .map(id => CINEMATCH_FILMS.find(f => f.id === id))
    .filter(Boolean) as CinematchFilm[];
  const rots = [-5, 0, 5];

  const likedFilms = CINEMATCH_FILMS.filter(f => picks.some(p => p.filmId === f.id && p.rating >= 3));
  const ratedSorted = [...likedFilms].sort((a, b) => {
    const ra = picks.find(p => p.filmId === a.id)?.rating || 0;
    const rb = picks.find(p => p.filmId === b.id)?.rating || 0;
    return rb - ra;
  });

  const likedTopLabel = fp.traitsByCategory.tone;
  const likedSecondLabel = fp.traitsByCategory.style;

  const cineMessage =
    fp.likedFilms.length > 0
      ? <>you lean <strong>{likedTopLabel}</strong> with a soft spot for <strong>{likedSecondLabel}</strong>. your avg rating: <strong>{fp.avgRating}★</strong> — i see you have standards.</>
      : "you haven't seen many of those — perfect. we'll start fresh and find what fits.";

  const pendingDoneRef = useRef(false);

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/complete');
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(['/api/user'], data.user);
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      window.location.href = '/?just_completed_onboarding=true&show_questionnaire=true';
    },
    onError: () => {
      window.location.href = '/?just_completed_onboarding=true&show_questionnaire=true';
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      const genreMap: Record<string, string[]> = {
        romantic: ['Romance'],
        funny: ['Comedy'],
        tense: ['Thriller'],
        dark: ['Drama'],
        clever: ['Mystery'],
        weird: ['Science Fiction'],
        emotional: ['Drama'],
        melancholic: ['Drama'],
        warm: ['Family'],
        cosy: ['Family'],
        whimsical: ['Animation'],
        british: ['Comedy'],
      };
      const genres = fp.topTags.flatMap(t => genreMap[t] || []).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
      await apiRequest('POST', '/api/onboarding/preferences', {
        genres,
        vibeTraits: fp.traitsByCategory,
        topTags: fp.topTags,
        topFilmIds: fp.topFilmIds,
        nickname: fp.nickname,
        tagWeights: fp.tagWeights,
        vibeProfile: fp.vibeProfile,
      });
    },
    onSuccess: () => {
      if (pendingDoneRef.current) {
        pendingDoneRef.current = false;
        completeOnboardingMutation.mutate();
      }
    },
    onError: () => {
      if (pendingDoneRef.current) {
        pendingDoneRef.current = false;
        completeOnboardingMutation.mutate();
      }
    },
  });

  useEffect(() => {
    savePreferencesMutation.mutate();
  }, []);

  const handleDone = () => {
    if (savePreferencesMutation.isPending) {
      pendingDoneRef.current = true;
    } else {
      completeOnboardingMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-paper2 flex flex-col overflow-auto">
      <div className="flex flex-col px-5 pt-14 pb-8 max-w-md mx-auto w-full">

        {/* Header */}
        <div className="mb-4">
          <p className="font-spaceMono text-[10px] tracking-[0.15em] text-inkSoft uppercase">
            your cinematic fingerprint
          </p>
          <h1 className="font-nunito font-extrabold text-[32px] leading-tight text-ink mt-1">
            all done! 🎬
          </h1>
        </div>

        {/* Cine speech bubble */}
        <div className="flex gap-2.5 items-start mb-5">
          <div
            className="w-10 h-10 rounded-full bg-yellow flex items-center justify-center font-nunito font-extrabold text-[20px] text-ink flex-shrink-0"
            style={{ border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
          >
            C
          </div>
          <div
            className="flex-1 font-nunito text-[13px] leading-relaxed text-ink px-3.5 py-2.5"
            style={{
              background: '#FAF6EE',
              border: '1.5px solid #1A1A1A',
              borderRadius: '4px 16px 16px 16px',
              boxShadow: '2px 2px 0 #1A1A1A',
            }}
          >
            {cineMessage}
          </div>
        </div>

        {/* Fingerprint card */}
        <div className="flex justify-center mb-5">
          <div
            className="relative overflow-hidden rounded-[18px] p-4 flex flex-col justify-between"
            style={{
              width: 270,
              aspectRatio: '9/14',
              background: 'linear-gradient(155deg, #FF4D8F 0%, #FF8C5A 45%, #FFC93C 100%)',
              border: '2.5px solid #1A1A1A',
              boxShadow: '6px 6px 0 #1A1A1A',
              transform: 'rotate(-1.5deg)',
            }}
          >
            {/* Stamp */}
            <div
              className="absolute top-3.5 font-spaceMono text-[8px] tracking-[0.2em] text-ink uppercase px-8 py-[3px] bg-yellow"
              style={{
                right: -28,
                transform: 'rotate(18deg)',
                border: '1.5px solid #1A1A1A',
              }}
            >
              #001
            </div>

            {/* Top section */}
            <div>
              <div className="flex justify-between font-spaceMono text-[8px] tracking-[0.2em] text-ink uppercase">
                <span>CINEMATCH</span>
                <span>FINGERPRINT</span>
              </div>
              <h2 className="font-nunito font-extrabold text-[26px] leading-tight text-ink mt-2">
                {fp.nickname}
              </h2>
              <p className="font-nunito text-[11px] mt-1 text-ink" style={{ opacity: 0.75 }}>
                {fp.seenCount} films rated · avg {fp.avgRating}★
              </p>
            </div>

            {/* Mini posters */}
            <div className="flex justify-center gap-2">
              {sigFilms.length > 0
                ? sigFilms.map((f, i) => <MiniPoster key={f.id} film={f} rot={rots[i] ?? 0} />)
                : (
                  <p className="font-nunito text-[11px] text-ink text-center py-2.5" style={{ opacity: 0.7 }}>
                    rate a few films to fill this in
                  </p>
                )
              }
            </div>

            {/* DNA traits */}
            <div>
              <p className="font-spaceMono text-[8px] tracking-[0.15em] text-ink uppercase mb-1.5" style={{ opacity: 0.75 }}>
                your DNA
              </p>
              <div className="flex flex-col gap-1">
                <TraitRow label="tone"  value={fp.traitsByCategory.tone} />
                <TraitRow label="style" value={fp.traitsByCategory.style} />
                <TraitRow label="pace"  value={fp.traitsByCategory.pace} />
              </div>
            </div>
          </div>
        </div>

        {/* Liked film chips */}
        {ratedSorted.length > 0 && (
          <div className="mb-5">
            <p className="font-spaceMono text-[9px] tracking-[0.12em] text-inkSoft uppercase mb-2">
              your ratings
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ratedSorted.map(f => {
                const rating = picks.find(p => p.filmId === f.id)?.rating || 0;
                return (
                  <div
                    key={f.id}
                    data-testid={`chip-film-${f.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-paper rounded-full font-nunito text-[12px] text-ink"
                    style={{ border: '1.5px solid #1A1A1A' }}
                  >
                    <span>{f.title.split(' ').slice(0, 2).join(' ')}</span>
                    <span className="font-nunito font-bold text-[13px] text-pink leading-none">
                      {'★'.repeat(rating)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-2.5 items-stretch">
          <button
            data-testid="button-find-first-film"
            onClick={handleDone}
            disabled={savePreferencesMutation.isPending || completeOnboardingMutation.isPending}
            className="w-full font-nunito font-bold text-[18px] text-paper bg-ink rounded-full py-3.5 leading-none disabled:opacity-60"
            style={{ border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}
          >
            {completeOnboardingMutation.isPending ? 'loading…' : savePreferencesMutation.isPending ? 'saving…' : 'find my first film →'}
          </button>
          <div className="flex gap-2.5 justify-center">
            <button
              data-testid="button-start-over"
              onClick={onRestart}
              className="font-nunito font-bold text-[15px] text-ink bg-paper rounded-full py-2.5 px-5 leading-none"
              style={{ border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
            >
              ↻ start over
            </button>
            <button
              data-testid="button-share-card"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'My Cinematch Fingerprint', text: `I'm "${fp.nickname}" on Cinematch!` }).catch(() => {});
                }
              }}
              className="font-nunito font-bold text-[15px] text-ink bg-paper rounded-full py-2.5 px-5 leading-none"
              style={{ border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
            >
              ↗ share card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FingerprintScreen;
