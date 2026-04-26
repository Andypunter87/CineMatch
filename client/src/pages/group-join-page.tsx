import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { C } from "@/lib/cinema-catalogue";

interface SessionMemberData {
  id: number;
  userId: number | null;
  displayName: string | null;
  status: string;
}

interface SessionApiResponse {
  id: number;
  hostUserId: number | null;
  sessionCode: string;
  status: string;
  members: SessionMemberData[];
}

interface Member {
  name: string;
  color: string;
  ready: boolean;
  isMe?: boolean;
}

const MEMBER_COLORS = [C.pink, C.blue, C.mint];

function getOrCreateGuestName(): string {
  const stored = localStorage.getItem('cinematch_guest_name');
  if (stored) return stored;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const name = `Guest-${suffix}`;
  localStorage.setItem('cinematch_guest_name', name);
  return name;
}

export default function GroupJoinPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ code: string }>();
  const code = params?.code || '';
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [resolvedSessionId, setResolvedSessionId] = useState<number | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [guestName, setGuestName] = useState<string>(() => getOrCreateGuestName());
  const [members, setMembers] = useState<Member[]>([
    { name: 'Host', color: C.pink, ready: true },
  ]);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetch(`/api/sessions/${encodeURIComponent(code)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: SessionApiResponse) => {
        setResolvedSessionId(data.id);
        if (data.members && data.members.length > 0) {
          const existing: Member[] = data.members.map((m, i) => ({
            name: m.displayName || (i === 0 ? 'Host' : `Guest ${i}`),
            color: MEMBER_COLORS[i % MEMBER_COLORS.length],
            ready: m.status === 'ready',
          }));
          setMembers(existing);
        }
      })
      .catch(() => {
        setLookupError('Session not found. Check the link and try again.');
      });
  }, [code]);

  const trimmedName = guestName.trim() || 'Guest';

  async function handleJoin() {
    if (resolvedSessionId === null) {
      setJoinError('Session is still loading. Please wait.');
      return;
    }
    localStorage.setItem('cinematch_guest_name', trimmedName);
    setJoining(true);
    setJoinError('');
    try {
      const r = await fetch(`/api/sessions/${resolvedSessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmedName, sessionCode: code }),
      });
      if (!r.ok) throw new Error(`join failed: ${r.status}`);
      setMembers(prev => [...prev, { name: trimmedName, color: C.yellow, ready: true, isMe: true }]);
      setJoined(true);
      setTimeout(() => {
        localStorage.setItem('cinematch_session', JSON.stringify({ sessionId: resolvedSessionId, sessionCode: code }));
        setLocation('/group/slot');
      }, 900);
    } catch {
      setJoinError('Could not join session. Please try again.');
      setJoining(false);
    }
  }

  if (lookupError) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#FAF6EE', fontFamily: 'Nunito, sans-serif',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '0 22px',
      }}>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 28, color: C.ink, textAlign: 'center' }}>session not found</div>
        <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>{lookupError}</div>
        <button
          data-testid="button-go-home"
          onClick={() => setLocation('/')}
          style={{
            padding: '12px 24px', border: `2px solid ${C.ink}`, borderRadius: 100,
            background: C.ink, color: 'white', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 18, cursor: 'pointer',
          }}
        >go home →</button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAF6EE',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '16px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.15em', color: C.inkSoft, textTransform: 'uppercase' }}>you're invited</div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 40, lineHeight: 1, marginTop: 4, color: C.ink, margin: '4px 0 0' }}>film night 🎬</h1>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: C.pink, border: `2px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 18, color: 'white', flexShrink: 0,
          }}>H</div>
          <div style={{
            background: '#F3ECDA', border: `1.5px solid ${C.ink}`,
            borderRadius: '4px 14px 14px 14px', padding: '8px 12px',
            fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.ink,
            flex: 1, boxShadow: `2px 2px 0 ${C.ink}`,
          }}>"fancy a film tonight? pick together — join us!"</div>
        </div>

        <div style={{
          background: '#F3ECDA', border: `2px solid ${C.ink}`, borderRadius: 14,
          padding: '12px 14px', boxShadow: `3px 3px 0 ${C.ink}`,
        }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '.12em', color: C.inkLight, textTransform: 'uppercase', marginBottom: 10 }}>who's in</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {members.map((m, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', border: `2px solid ${C.ink}`,
                  background: m.color, color: m.isMe ? C.ink : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 20,
                  position: 'relative', margin: '0 auto',
                }}>
                  {m.name[0].toUpperCase()}
                  {(m.ready || (m.isMe && joined)) && (
                    <div style={{
                      position: 'absolute', right: -3, bottom: -3, width: 16, height: 16,
                      background: C.yellow, border: `1.5px solid ${C.ink}`, borderRadius: '50%',
                      fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</div>
                  )}
                </div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, marginTop: 3, color: C.ink }}>
                  {m.name}{m.isMe ? ' (you)' : ''}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: C.inkLight }}>
                  {m.ready ? 'ready' : (joining && m.isMe) ? 'joining…' : 'waiting'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '.12em', color: C.inkLight, textTransform: 'uppercase' }}>
            your name
          </label>
          <input
            data-testid="input-guest-name"
            type="text"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            maxLength={20}
            disabled={joined}
            placeholder="your name…"
            style={{
              padding: '10px 14px', border: `2px solid ${C.ink}`, borderRadius: 10,
              fontFamily: 'Nunito, sans-serif', fontSize: 16, color: C.ink, background: '#FAF6EE',
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: C.yellow, border: `2px solid ${C.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14, color: C.ink, flexShrink: 0,
          }}>C</div>
          <div style={{
            background: '#FAF6EE', border: `1.5px solid ${C.ink}`,
            borderRadius: '4px 14px 14px 14px', padding: '8px 12px',
            fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.35, color: C.ink,
            flex: 1, boxShadow: `2px 2px 0 ${C.ink}`,
          }}>once everyone's in, we'll all spin the vibe together and i'll find something for the group 🍿</div>
        </div>

        {joinError && (
          <div style={{ color: '#e53e3e', fontFamily: 'Nunito, sans-serif', fontSize: 13, textAlign: 'center' }}>{joinError}</div>
        )}

        <button
          data-testid="button-join"
          onClick={handleJoin}
          disabled={joining || resolvedSessionId === null || joined}
          style={{
            width: '100%', padding: '14px',
            border: `2px solid ${C.ink}`, borderRadius: 100,
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 22,
            background: (joining || resolvedSessionId === null || joined) ? '#F3ECDA' : C.ink,
            color: (joining || resolvedSessionId === null || joined) ? C.inkLight : 'white',
            boxShadow: (joining || resolvedSessionId === null || joined) ? 'none' : `3px 3px 0 ${C.ink}`,
            cursor: (joining || resolvedSessionId === null || joined) ? 'default' : 'pointer',
          }}
        >{joining ? 'joining…' : joined ? 'you\'re in! 🎉' : resolvedSessionId === null ? 'loading…' : "i'm in! 🙌"}</button>
      </div>
    </div>
  );
}
