import { getStripeGradient } from '@/lib/films';

interface HowItWorksProps {
  onStart: () => void;
}

const demoFilm = {
  colors: ['#E8A4C4', '#F0C8A8', '#C8A0B4'] as [string, string, string],
  stripe: 'horizontal' as const,
};

export function HowItWorks({ onStart }: HowItWorksProps) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 flex flex-col px-6 pt-14 pb-8 max-w-md mx-auto w-full">

        {/* Step indicator */}
        <p className="font-spaceMono text-[10px] tracking-[0.15em] text-inkSoft uppercase mb-1">
          step 2 of 2
        </p>

        {/* Headline */}
        <h1 className="font-nunito font-extrabold text-[32px] leading-tight text-ink mb-2">
          the taste test
        </h1>
        <p className="font-nunito text-[14px] leading-relaxed text-inkSoft mb-6">
          i'll show you 12 films. rate each one 1–5 stars — or skip if you haven't seen it.
        </p>

        {/* Demo card */}
        <div
          className="rounded-[14px] border-2 border-ink overflow-hidden mb-4"
          style={{ boxShadow: '3px 3px 0 #1A1A1A' }}
        >
          {/* Mini striped poster */}
          <div
            className="h-[100px] border-b border-ink flex items-end p-2"
            style={{ background: getStripeGradient(demoFilm) }}
          >
            <div
              className="bg-[rgba(250,246,238,0.94)] border border-ink rounded-[6px] px-2 py-1 font-nunito font-bold text-[13px] text-ink leading-none"
            >
              Grand Budapest Hotel
            </div>
          </div>

          {/* Star rating demo */}
          <div className="bg-paper px-4 py-3">
            <p className="font-spaceMono text-[9px] text-inkLight uppercase tracking-[0.1em] mb-2">
              your rating
            </p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(s => (
                <div
                  key={s}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-nunito font-extrabold text-[16px] leading-none"
                  style={{
                    border: `2px solid ${s <= 4 ? '#FF4D8F' : '#1A1A1A'}`,
                    background: s <= 4 ? '#FF4D8F' : '#FAF6EE',
                    color: s <= 4 ? 'white' : '#1A1A1A',
                    boxShadow: s === 4 ? '2px 2px 0 #1A1A1A' : 'none',
                  }}
                >
                  ★
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cine tip bubble */}
        <div
          className="bg-paper2 rounded-[12px] p-3 mb-8"
          style={{ border: '1.5px dashed #1A1A1A' }}
        >
          <div className="flex gap-2 items-start">
            {/* Cine avatar */}
            <div
              className="w-7 h-7 rounded-full bg-yellow flex items-center justify-center font-nunito font-extrabold text-[14px] text-ink flex-shrink-0"
              style={{ border: '2px solid #1A1A1A', boxShadow: '2px 2px 0 #1A1A1A' }}
            >
              C
            </div>
            <p className="font-nunito text-[12px] leading-relaxed text-ink">
              haven't seen it? tap <strong>?</strong> — i'll still read your reaction to the poster.
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <button
            data-testid="button-start-rating"
            onClick={onStart}
            className="w-full font-nunito font-bold text-[18px] text-paper bg-ink rounded-full py-3.5 leading-none"
            style={{ boxShadow: '3px 3px 0 #1A1A1A', border: '2px solid #1A1A1A' }}
          >
            start rating →
          </button>
        </div>
      </div>
    </div>
  );
}

export default HowItWorks;
