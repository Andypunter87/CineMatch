import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface StreamerOption {
  code: string;
  label: string;
  emoji: string;
  bg: string;
}

export const STREAMER_OPTIONS: StreamerOption[] = [
  { code: 'netflix',       label: 'Netflix',     emoji: 'N',  bg: '#FF4D8F' },
  { code: 'disneyplus',    label: 'Disney+',     emoji: '✦',  bg: '#5BB1FF' },
  { code: 'amazonprime',   label: 'Prime Video', emoji: '▶',  bg: '#FFC93C' },
  { code: 'appletvplus',   label: 'Apple TV+',   emoji: '',  bg: '#FAF6EE' },
  { code: 'mubi',          label: 'MUBI',        emoji: '◉',  bg: '#1A1A1A' },
  { code: 'paramountplus', label: 'Paramount+',  emoji: '★',  bg: '#5BB1FF' },
  { code: 'hbomax',        label: 'Max',         emoji: 'M',  bg: '#9F7AEA' },
  { code: 'bbciplayer',    label: 'BBC iPlayer', emoji: '●',  bg: '#FFC93C' },
  { code: 'nowtv',         label: 'NOW',         emoji: '○',  bg: '#FF8C5A' },
];

interface StreamersStepProps {
  onComplete: (selected: string[]) => void;
  onSkip: () => void;
}

export const STREAMER_LABELS: Record<string, string> = STREAMER_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.code]: opt.label }),
  {} as Record<string, string>,
);

export function StreamersStep({ onComplete, onSkip }: StreamersStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const saveMutation = useMutation({
    mutationFn: async (services: string[]) => {
      // Always persist so country defaults (GB) are saved and any
      // previously chosen streamers can be cleared on a re-run.
      await apiRequest('POST', '/api/onboarding/preferences', {
        country: 'gb',
        streamingServices: services,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
  });

  const toggle = (code: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const persistAndAdvance = async (
    services: string[],
    cb: (selected: string[]) => void,
  ) => {
    try {
      await saveMutation.mutateAsync(services);
    } catch {
      // continue regardless — fingerprint step will still load
    }
    cb(services);
  };

  const handleNext = () => persistAndAdvance(Array.from(selected), onComplete);
  const handleSkip = () => persistAndAdvance([], () => onSkip());

  return (
    <div className="min-h-screen bg-paper2 flex flex-col overflow-auto">
      <div className="flex flex-col px-5 pt-14 pb-8 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="mb-4">
          <p className="font-spaceMono text-[10px] tracking-[0.15em] text-inkSoft uppercase">
            quick one before we wrap
          </p>
          <h1 className="font-nunito font-extrabold text-[32px] leading-tight text-ink mt-1">
            where do you stream? 📺
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
            tap the ones you have. i'll only suggest films you can actually press play on tonight.
          </div>
        </div>

        {/* Streamer grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {STREAMER_OPTIONS.map(opt => {
            const isOn = selected.has(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                data-testid={`button-streamer-${opt.code}`}
                onClick={() => toggle(opt.code)}
                aria-pressed={isOn}
                className="flex items-center gap-2.5 px-3 py-3 rounded-[12px] text-left transition-transform"
                style={{
                  background: isOn ? '#FAF6EE' : 'rgba(250,246,238,0.5)',
                  border: '2px solid #1A1A1A',
                  boxShadow: isOn ? '3px 3px 0 #1A1A1A' : '1.5px 1.5px 0 #1A1A1A',
                  transform: isOn ? 'translate(-1px,-1px)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 font-nunito font-extrabold text-[16px]"
                  style={{
                    background: opt.bg,
                    color: opt.bg === '#1A1A1A' ? '#FAF6EE' : '#1A1A1A',
                    border: '1.5px solid #1A1A1A',
                  }}
                >
                  {opt.emoji || opt.label.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-nunito font-bold text-[14px] text-ink leading-tight truncate">
                    {opt.label}
                  </div>
                </div>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isOn ? '#1A1A1A' : 'transparent',
                    border: '1.5px solid #1A1A1A',
                    color: '#FAF6EE',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {isOn ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected count hint */}
        <p
          data-testid="text-streamer-count"
          className="font-spaceMono text-[10px] tracking-[0.12em] text-inkSoft uppercase text-center mb-3"
        >
          {selected.size === 0
            ? 'pick one or more · or skip for now'
            : `${selected.size} selected`}
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-2.5 items-stretch">
          <button
            data-testid="button-streamers-next"
            onClick={handleNext}
            disabled={saveMutation.isPending}
            className="w-full font-nunito font-bold text-[18px] text-paper bg-ink rounded-full py-3.5 leading-none disabled:opacity-60"
            style={{ border: '2px solid #1A1A1A', boxShadow: '3px 3px 0 #1A1A1A' }}
          >
            {saveMutation.isPending
              ? 'saving…'
              : selected.size > 0
                ? `lock it in (${selected.size}) →`
                : 'continue without →'}
          </button>
          <button
            data-testid="button-streamers-skip"
            onClick={handleSkip}
            className="font-nunito font-bold text-[14px] text-inkSoft bg-transparent leading-none py-2"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            i'll add streamers later
          </button>
        </div>
      </div>
    </div>
  );
}

export default StreamersStep;
