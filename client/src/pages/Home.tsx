import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { C } from "@/lib/cinema-catalogue";
import { CINEMATCH_TAG_MAP } from "@/lib/films";
import { STREAMER_LABELS } from "@/components/onboarding/StreamersStep";
import { Cine, CineBubble, DaylightScreen, MicroLabel, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

type FingerprintSummary = {
  nickname: string;
  topTraitLabel: string | null;
};

function getFingerprintSummary(onboardingState: unknown): FingerprintSummary | null {
  if (!onboardingState || typeof onboardingState !== "object") return null;
  const state = onboardingState as Record<string, unknown>;
  const fp = state.fingerprint;
  if (!fp || typeof fp !== "object") return null;
  const f = fp as Record<string, unknown>;
  if (typeof f.nickname !== "string" || !f.nickname) return null;
  const topTags = Array.isArray(f.topTags) ? (f.topTags as string[]) : [];
  const firstTag = topTags[0];
  const topTraitLabel = firstTag
    ? (CINEMATCH_TAG_MAP[firstTag]?.label ?? firstTag)
    : null;
  return { nickname: f.nickname, topTraitLabel };
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: watchChoices } = useQuery<unknown[]>({
    queryKey: ["/api/watch-choices"],
    enabled: !!user,
    staleTime: 60_000,
  });
  const recentPicksCount = watchChoices?.length ?? null;

  const fingerprint = useMemo(
    () => getFingerprintSummary(user?.onboardingState),
    [user],
  );

  const streamerLabels = useMemo<string[]>(() => {
    const services = user?.streamingServices;
    if (!Array.isArray(services) || services.length === 0) return [];
    return services
      .map((code) => STREAMER_LABELS[code] ?? code)
      .filter(Boolean);
  }, [user]);

  useEffect(() => {
    if (user) {
      const needsOnboarding = (user as any).needsOnboarding;
      const urlParams = new URLSearchParams(window.location.search);
      const bypassOnboarding = urlParams.has('bypass_onboarding') || urlParams.has('just_completed_onboarding');
      if (needsOnboarding && !bypassOnboarding) {
        setLocation('/onboarding');
        return;
      }
    }
  }, [user, setLocation]);

  return (
    <DaylightScreen style={{ alignItems: 'center', justifyContent: 'center', padding: '24px 22px' }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <MicroLabel style={{ fontSize: 10, letterSpacing: '.18em', marginBottom: 4 }}>tonight</MicroLabel>
          <h1 style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 1.02,
            margin: 0,
            color: C.ink,
          }}>who's watching?</h1>
          {fingerprint ? (
            <div
              data-testid="fingerprint-greeting"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 10,
                padding: '6px 10px',
                background: C.paper2,
                border: `1px solid ${C.edge}`,
                borderRadius: 100,
                boxShadow: C.shadowChip,
                fontFamily: FONT_DISPLAY,
                fontSize: 12,
                fontWeight: 700,
                color: C.ink,
                maxWidth: '100%',
              }}
            >
              <span aria-hidden style={{ fontSize: 14 }}>🎬</span>
              <span data-testid="text-fingerprint-nickname">
                picks for the {fingerprint.nickname}
              </span>
              {fingerprint.topTraitLabel && (
                <span
                  data-testid="text-fingerprint-top-trait"
                  style={{
                    fontWeight: 700,
                    textTransform: 'lowercase',
                    color: C.onAccent,
                    background: C.yellow,
                    border: '1px solid rgba(36,31,29,.16)',
                    borderRadius: 100,
                    padding: '1px 8px',
                    marginLeft: 2,
                  }}
                >
                  {fingerprint.topTraitLabel}
                </span>
              )}
            </div>
          ) : null}
          <p style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            lineHeight: 1.35,
            color: C.inkSoft,
            marginTop: 8,
            marginBottom: 0,
          }}>your answer changes everything about how i pick.</p>

          {streamerLabels.length > 0 && (
            <div
              data-testid="text-streamer-pill"
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: C.paper2,
                border: `1px dashed ${C.edgeDash}`,
                borderRadius: 100,
                fontFamily: FONT_MONO,
                fontSize: 9,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.inkSoft,
                maxWidth: '100%',
              }}
            >
              <span aria-hidden style={{ fontSize: 11 }}>📺</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                tailored to: {streamerLabels.slice(0, 3).join(' · ')}
                {streamerLabels.length > 3 ? ` +${streamerLabels.length - 3}` : ''}
              </span>
              <button
                type="button"
                data-testid="button-change-streamers"
                onClick={() => setLocation('/onboarding?retake=1')}
                style={{
                  marginLeft: 4,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: C.link,
                  textDecoration: 'underline',
                }}
                aria-label="Change your streaming services"
              >
                change
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            data-testid="button-just-me"
            onClick={() => setLocation('/slot')}
            style={{
              border: '1px solid rgba(36,31,29,.16)',
              borderRadius: 16,
              padding: '16px 18px',
              background: C.yellow,
              boxShadow: C.shadowPanel,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              width: '100%',
              transition: 'transform .22s cubic-bezier(.2,1.5,.4,1)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 21,
                lineHeight: 1.1,
                color: C.onAccent,
              }}>Just me</div>
              <div style={{
                fontFamily: FONT_BODY,
                fontSize: 12,
                color: 'rgba(36,31,29,.65)',
                marginTop: 3,
              }}>→ slot machine</div>
            </div>
            <div style={{ fontSize: 34 }}>🛋️</div>
          </button>

          <button
            data-testid="button-me-plus-someone"
            onClick={() => setLocation('/group/invite')}
            style={{
              border: '1px solid rgba(36,31,29,.16)',
              borderRadius: 16,
              padding: '16px 18px',
              background: C.pink,
              boxShadow: C.shadowPanel,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              width: '100%',
              transition: 'transform .22s cubic-bezier(.2,1.5,.4,1)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 21,
                lineHeight: 1.1,
                color: C.onAccent,
              }}>Me + someone</div>
              <div style={{
                fontFamily: FONT_BODY,
                fontSize: 12,
                color: 'rgba(36,31,29,.65)',
                marginTop: 3,
              }}>→ group vibe session</div>
            </div>
            <div style={{ fontSize: 34 }}>👯</div>
          </button>
        </div>

        <button
          data-testid="button-recent-picks"
          onClick={() => setLocation('/history')}
          style={{
            border: `1px solid ${C.edge}`,
            borderRadius: 12,
            padding: '10px 14px',
            background: C.paper2,
            boxShadow: C.shadowChip,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1,
                color: C.ink,
              }}>recent picks</span>
              {recentPicksCount !== null && recentPicksCount > 0 && (
                <span
                  data-testid="badge-recent-picks-count"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: C.onAccent,
                    background: C.yellow,
                    border: '1px solid rgba(36,31,29,.16)',
                    borderRadius: 100,
                    padding: '1px 7px',
                    lineHeight: 1.5,
                  }}
                >
                  {recentPicksCount}
                </span>
              )}
            </div>
            <div style={{
              fontFamily: FONT_BODY,
              fontSize: 11,
              color: C.inkSoft,
              marginTop: 2,
            }}>→ revisit your history</div>
          </div>
          <div style={{ fontSize: 22 }}>🎞️</div>
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Cine size={30} />
          <CineBubble>haven't watched in a while? i'll factor in your fingerprint too 🎬</CineBubble>
        </div>
      </div>
    </DaylightScreen>
  );
}
