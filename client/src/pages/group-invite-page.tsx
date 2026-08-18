import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { C } from "@/lib/cinema-catalogue";
import { DaylightScreen, MicroLabel, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

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

const MEMBER_COLORS = [C.pink, C.blue, C.mint, C.lilac];

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
    <DaylightScreen>
      <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          data-testid="button-back"
          onClick={() => setLocation('/')}
          style={{ background: 'none', border: 'none', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.inkSoft, padding: 0, cursor: 'pointer' }}
        >← back</button>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '.1em', color: C.inkSoft, textTransform: 'uppercase' }}>step 1/2</div>
      </div>

      {sessionError && (
        <div style={{ padding: '12px 14px', background: C.paper2, border: `1px solid ${C.edgeStrong}`, margin: '0 20px', borderRadius: 12, boxShadow: C.shadowChip, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.ink }}>couldn't create session.</span>
          <button
            data-testid="button-retry-session"
            onClick={createSession}
            style={{ background: C.yellow, border: `1px solid ${C.yellow}`, borderRadius: 100, color: C.onAccent, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13, padding: '6px 14px', cursor: 'pointer', boxShadow: C.shadowChip }}
          >retry</button>
        </div>
      )}

      <div style={{ padding: '0 20px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 27, lineHeight: 1.05, color: C.ink, margin: 0 }}>who's in?</h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.35, color: C.inkSoft, marginTop: 6, marginBottom: 0 }}>
            send the link — when everyone's ready, we spin together.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-around' }}>
          {members.map((m) => (
            <div key={m.id} style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', border: '1px solid rgba(36,31,29,.16)',
                background: m.color, color: C.onAccent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22,
                boxShadow: m.ready ? C.shadowChip : 'none',
                position: 'relative', margin: '0 auto', transition: 'box-shadow .3s',
              }}>
                {m.name[0].toUpperCase()}
                <div style={{
                  position: 'absolute', right: -4, bottom: -4, width: 20, height: 20,
                  background: m.ready ? C.yellow : C.paper2,
                  border: '1px solid rgba(36,31,29,.16)', borderRadius: '50%',
                  fontSize: 11, color: C.onAccent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .4s',
                }}>{m.ready ? '✓' : '…'}</div>
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, marginTop: 6, color: C.ink }}>{m.name}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: m.ready ? C.ink : C.inkLight, transition: 'color .4s' }}>
                {m.ready ? 'ready' : 'waiting'}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: allReady ? C.yellow : C.paper2,
          border: `1px solid ${C.edge}`, borderRadius: 12,
          padding: '10px 12px', boxShadow: C.shadowChip, transition: 'background .5s',
        }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.onAccent }}>
            {allReady
              ? "🎉 everyone's here — ready to pick!"
              : members.length < 2
                ? 'invite someone to join…'
                : 'waiting for everyone to be ready…'}
          </div>
        </div>

        {sessionCode && (
          <div style={{ background: C.paper, border: `1px dashed ${C.edgeDash}`, borderRadius: 12, padding: '10px 12px' }}>
            <MicroLabel color={C.inkLight} style={{ marginBottom: 4 }}>session link</MicroLabel>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: C.ink }}>
              cinematch.co/g/<span style={{ color: C.link }}>{sessionCode}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid="button-invite"
              onClick={handleInvite}
              style={{
                flex: 1, padding: '13px', border: `1px solid ${C.yellow}`, borderRadius: 100,
                background: C.yellow, color: C.onAccent, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
                whiteSpace: 'nowrap', boxShadow: C.shadowBtn, cursor: 'pointer',
                transition: 'transform .22s cubic-bezier(.2,1.5,.4,1)',
              }}
            >↗ invite</button>
            <button
              data-testid="button-lets-pick"
              onClick={handlePickTogether}
              disabled={!allReady}
              style={{
                flex: 2, padding: '13px 20px',
                border: `1px solid ${allReady ? C.yellow : 'rgba(36,31,29,.12)'}`,
                borderRadius: 100,
                fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
                background: allReady ? C.yellow : C.paper2,
                color: allReady ? C.onAccent : C.inkLight,
                boxShadow: allReady ? C.shadowBtn : 'none',
                whiteSpace: 'nowrap',
                cursor: allReady ? 'pointer' : 'default',
                transition: 'all .4s',
              }}
            >{allReady ? "let's pick! →" : "waiting…"}</button>
          </div>
          <button
            data-testid="button-skip-wait"
            onClick={handlePickTogether}
            style={{
              width: '100%', padding: '9px', background: 'transparent',
              border: `1px dashed ${C.edgeDash}`, borderRadius: 100,
              fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 12, color: C.inkSoft, cursor: 'pointer',
            }}
          >continue solo →</button>
        </div>
      </div>
    </DaylightScreen>
  );
}
