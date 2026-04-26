import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { C } from "@/lib/cinema-catalogue";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
    <div style={{
      minHeight: '100dvh',
      background: '#E8DDC8',
      backgroundImage: `
        radial-gradient(circle at 15% 20%, rgba(255,201,60,.12) 0%, transparent 40%),
        radial-gradient(circle at 85% 70%, rgba(255,77,143,.08) 0%, transparent 45%)
      `,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: 'Nunito, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: '.18em',
            color: C.inkSoft,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>tonight</div>
          <h1 style={{
            fontFamily: 'Nunito, sans-serif',
            fontWeight: 800,
            fontSize: 46,
            lineHeight: .95,
            margin: 0,
            color: C.ink,
          }}>who's watching?</h1>
          <p style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 14,
            lineHeight: 1.35,
            color: C.inkSoft,
            marginTop: 8,
            marginBottom: 0,
          }}>your answer changes everything about how i pick.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            data-testid="button-just-me"
            onClick={() => setLocation('/slot')}
            style={{
              border: `2px solid ${C.ink}`,
              borderRadius: 16,
              padding: '16px 18px',
              background: C.yellow,
              boxShadow: `4px 4px 0 ${C.ink}`,
              transform: 'rotate(-.5deg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 700,
                fontSize: 26,
                lineHeight: 1,
                color: C.ink,
              }}>Just me</div>
              <div style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 12,
                color: C.inkSoft,
                marginTop: 3,
              }}>→ slot machine</div>
            </div>
            <div style={{ fontSize: 34 }}>🛋️</div>
          </button>

          <button
            data-testid="button-me-plus-someone"
            onClick={() => setLocation('/group/invite')}
            style={{
              border: `2px solid ${C.ink}`,
              borderRadius: 16,
              padding: '16px 18px',
              background: C.pink,
              boxShadow: `4px 4px 0 ${C.ink}`,
              transform: 'rotate(.5deg)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 700,
                fontSize: 26,
                lineHeight: 1,
                color: 'white',
              }}>Me + someone</div>
              <div style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: 12,
                color: 'rgba(255,255,255,.8)',
                marginTop: 3,
              }}>→ group vibe session</div>
            </div>
            <div style={{ fontSize: 34 }}>👯</div>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: C.yellow, border: `2px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16,
            color: C.ink, boxShadow: `2px 2px 0 ${C.ink}`, flexShrink: 0,
          }}>C</div>
          <div style={{
            background: C.paper,
            border: `1.5px solid ${C.ink}`,
            borderRadius: '4px 14px 14px 14px',
            padding: '8px 12px',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 13,
            lineHeight: 1.35,
            color: C.ink,
            flex: 1,
            boxShadow: `2px 2px 0 ${C.ink}`,
          }}>haven't watched in a while? i'll factor in your fingerprint too 🎬</div>
        </div>
      </div>
    </div>
  );
}
