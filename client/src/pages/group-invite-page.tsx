import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { C } from "@/lib/cinema-catalogue";

interface SessionMemberData {
  id: number;
  userId: number | null;
  displayName: string | null;
  status: string;
}

interface SessionData {
  sessionId: number;
  sessionCode: string;
  link: string;
}

interface SessionApiResponse {
  id: number;
  hostUserId: number | null;
  sessionCode: string;
  status: string;
  members: SessionMemberData[];
}

interface Member {
  id: string;
  name: string;
  color: string;
  ready: boolean;
}

const MEMBER_COLORS = [C.pink, C.blue, C.mint, C.yellow];

export default function GroupInvitePage() {
  const [, setLocation] = useLocation();
  const [sessionData, setSessionData] = useState<SessionData | null>(() => {
    try { return JSON.parse(localStorage.getItem('cinematch_session') || 'null'); }
    catch { return null; }
  });
  const [sessionError, setSessionError] = useState(false);
  const [members, setMembers] = useState<Member[]>([
    { id: 'host', name: 'You', color: C.pink, ready: true },
  ]);

  const sessionCode = sessionData?.sessionCode || '';
  const sessionId = sessionData?.sessionId;

  function createSession() {
    setSessionError(false);
    fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: SessionData) => {
        setSessionData(data);
        localStorage.setItem('cinematch_session', JSON.stringify(data));
      })
      .catch(() => setSessionError(true));
  }

  useEffect(() => {
    if (sessionData) return;
    createSession();
  }, []);

  useEffect(() => {
    if (!sessionId || sessionId === 0) return;
    const poll = setInterval(() => {
      fetch(`/api/sessions/${sessionId}`)
        .then(r => r.ok ? r.json() : null)
        .then((data: SessionApiResponse | null) => {
          if (data?.members && data.members.length > 0) {
            const newMembers: Member[] = data.members.map((m, i) => ({
              id: String(m.id),
              name: m.displayName || (m.userId === data.hostUserId ? 'You' : `Guest ${i}`),
              color: MEMBER_COLORS[i % MEMBER_COLORS.length],
              ready: m.status === 'ready',
            }));
            setMembers(newMembers);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(poll);
  }, [sessionId]);

  const allReady = members.length > 1 && members.every(m => m.ready);

  function handleInvite() {
    const inviteUrl = sessionData?.link || `${window.location.origin}/g/${sessionCode}`;
    const msg = `hey! join me on Cinematch tonight 🎬 pick a film together → ${inviteUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'Join my Cinematch session', text: msg, url: inviteUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(inviteUrl);
    }
  }

  function handlePickTogether() {
    setLocation('/group/slot');
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAF6EE',
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
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.1em', color: C.inkSoft, textTransform: 'uppercase' }}>step 1/2</div>
      </div>

      {sessionError && (
        <div style={{ padding: '16px 20px', background: '#FFF0F0', border: `1px solid ${C.coral}`, margin: '0 20px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: C.ink }}>couldn't create session.</span>
          <button
            data-testid="button-retry-session"
            onClick={createSession}
            style={{ background: C.pink, border: 'none', borderRadius: 6, color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13, padding: '6px 14px', cursor: 'pointer' }}
          >retry</button>
        </div>
      )}

      <div style={{ padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, margin: 0 }}>who's in?</h1>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: C.inkSoft, marginTop: 6, marginBottom: 0 }}>
            send the link — when everyone's ready, we spin together.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-around' }}>
          {members.map((m) => (
            <div key={m.id} style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', border: `2px solid ${C.ink}`,
                background: m.color, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 22,
                boxShadow: m.ready ? `2px 2px 0 ${C.ink}` : 'none',
                position: 'relative', margin: '0 auto', transition: 'box-shadow .3s',
              }}>
                {m.name[0].toUpperCase()}
                <div style={{
                  position: 'absolute', right: -4, bottom: -4, width: 20, height: 20,
                  background: m.ready ? C.yellow : '#F3ECDA',
                  border: `1.5px solid ${C.ink}`, borderRadius: '50%',
                  fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .4s',
                }}>{m.ready ? '✓' : '…'}</div>
              </div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, marginTop: 6, color: C.ink }}>{m.name}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: m.ready ? C.ink : C.inkLight, transition: 'color .4s' }}>
                {m.ready ? 'ready' : 'waiting'}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: allReady ? C.yellow : '#F3ECDA',
          border: `1.5px solid ${C.ink}`, borderRadius: 12,
          padding: '10px 12px', transition: 'background .5s',
        }}>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 13, color: C.ink }}>
            {allReady
              ? "🎉 everyone's here — ready to pick!"
              : members.length < 2
                ? 'invite someone to join…'
                : 'waiting for everyone to be ready…'}
          </div>
        </div>

        {sessionCode && (
          <div style={{ background: '#F3ECDA', border: `1.5px dashed ${C.ink}`, borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: C.inkLight, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>session link</div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16, color: C.ink }}>
              cinematch.co/g/<span style={{ color: C.pink }}>{sessionCode}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid="button-invite"
              onClick={handleInvite}
              style={{
                flex: 1, padding: '10px', border: `2px solid ${C.ink}`, borderRadius: 100,
                background: '#FAF6EE', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16,
                boxShadow: `3px 3px 0 ${C.ink}`, cursor: 'pointer',
              }}
            >↗ invite</button>
            <button
              data-testid="button-lets-pick"
              onClick={handlePickTogether}
              disabled={!allReady}
              style={{
                flex: 2, padding: '10px 20px',
                border: `2px solid ${allReady ? C.ink : C.inkLight}`,
                borderRadius: 100,
                fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 18,
                background: allReady ? C.ink : '#F3ECDA',
                color: allReady ? 'white' : C.inkLight,
                boxShadow: allReady ? `3px 3px 0 ${C.ink}` : 'none',
                cursor: allReady ? 'pointer' : 'default',
                transition: 'all .4s',
              }}
            >{allReady ? "let's pick! →" : "waiting…"}</button>
          </div>
          <button
            data-testid="button-skip-wait"
            onClick={handlePickTogether}
            style={{
              width: '100%', padding: '8px', background: 'transparent',
              border: `1.5px dashed ${C.ink}`, borderRadius: 100,
              fontFamily: 'Nunito, sans-serif', fontSize: 12, color: C.inkSoft, cursor: 'pointer',
            }}
          >continue solo →</button>
        </div>
      </div>
    </div>
  );
}
