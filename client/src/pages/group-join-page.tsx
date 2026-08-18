import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { C } from "@/lib/cinema-catalogue";
import { Cine, CineBubble, DaylightScreen, MicroLabel, FONT_DISPLAY, FONT_BODY, FONT_MONO } from "@/components/daylight";

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
        setLookupError('session not found. check the link and try again.');
      });
  }, [code]);

  const trimmedName = guestName.trim() || 'Guest';

  async function handleJoin() {
    if (resolvedSessionId === null) {
      setJoinError('session is still loading. hang on a sec.');
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
      const joinData = await r.json();
      setMembers(prev => [...prev, { name: trimmedName, color: C.yellow, ready: true, isMe: true }]);
      setJoined(true);
      setTimeout(() => {
        localStorage.setItem('cinematch_session', JSON.stringify({
          sessionId: resolvedSessionId,
          sessionCode: code,
          memberId: joinData?.member?.id ?? null,
          displayName: trimmedName,
        }));
        setLocation('/group/slot');
      }, 900);
    } catch {
      setJoinError("couldn't join the session. try again?");
      setJoining(false);
    }
  }

  if (lookupError) {
    return (
      <DaylightScreen style={{ justifyContent: 'center', alignItems: 'center', gap: 16, padding: '0 22px' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 27, color: C.ink, textAlign: 'center' }}>session not found</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>{lookupError}</div>
        <button
          data-testid="button-go-home"
          onClick={() => setLocation('/')}
          style={{
            padding: '13px 24px', border: `1px solid ${C.yellow}`, borderRadius: 100,
            background: C.yellow, color: C.onAccent, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15,
            whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: C.shadowBtn,
          }}
        >go home →</button>
      </DaylightScreen>
    );
  }

  return (
    <DaylightScreen>
      <div style={{ padding: '16px 22px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
        <div>
          <MicroLabel style={{ fontSize: 10, letterSpacing: '.15em' }}>you're invited</MicroLabel>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1.05, color: C.ink, margin: '4px 0 0' }}>film night 🎬</h1>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: C.pink, border: '1px solid rgba(36,31,29,.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, color: C.onAccent,
            boxShadow: C.shadowChip, flexShrink: 0,
          }}>H</div>
          <CineBubble>"fancy a film tonight? pick together — join us!"</CineBubble>
        </div>

        <div style={{
          background: C.paper2, border: `1px solid ${C.edgeCard}`, borderRadius: 14,
          padding: '12px 14px', boxShadow: C.shadowPanel,
        }}>
          <MicroLabel color={C.inkLight} style={{ marginBottom: 10 }}>who's in</MicroLabel>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {members.map((m, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(36,31,29,.16)',
                  background: m.color, color: C.onAccent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20,
                  position: 'relative', margin: '0 auto',
                }}>
                  {m.name[0].toUpperCase()}
                  {(m.ready || (m.isMe && joined)) && (
                    <div style={{
                      position: 'absolute', right: -3, bottom: -3, width: 16, height: 16,
                      background: C.yellow, border: '1px solid rgba(36,31,29,.16)', borderRadius: '50%',
                      fontSize: 9, color: C.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✓</div>
                  )}
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, marginTop: 3, color: C.ink }}>
                  {m.name}{m.isMe ? ' (you)' : ''}
                </div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8, color: C.inkLight }}>
                  {m.ready ? 'ready' : (joining && m.isMe) ? 'joining…' : 'waiting'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '.12em', color: C.inkLight, textTransform: 'uppercase' }}>
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
              padding: '10px 14px', border: `1px solid ${C.edge}`, borderRadius: 12,
              fontFamily: FONT_BODY, fontSize: 16, color: C.ink, background: C.paper2,
              boxShadow: C.shadowChip,
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Cine size={28} />
          <CineBubble>once everyone's in, we'll all spin the vibe together and i'll find something for the group 🍿</CineBubble>
        </div>

        {joinError && (
          <div style={{ color: C.link, fontFamily: FONT_BODY, fontSize: 13, textAlign: 'center' }}>{joinError}</div>
        )}

        <button
          data-testid="button-join"
          onClick={handleJoin}
          disabled={joining || resolvedSessionId === null || joined}
          style={{
            width: '100%', padding: '14px',
            border: `1px solid ${(joining || resolvedSessionId === null || joined) ? 'rgba(36,31,29,.12)' : C.yellow}`,
            borderRadius: 100,
            fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17,
            background: (joining || resolvedSessionId === null || joined) ? C.paper2 : C.yellow,
            color: (joining || resolvedSessionId === null || joined) ? C.inkLight : C.onAccent,
            boxShadow: (joining || resolvedSessionId === null || joined) ? 'none' : C.shadowBtn,
            whiteSpace: 'nowrap',
            cursor: (joining || resolvedSessionId === null || joined) ? 'default' : 'pointer',
            transition: 'transform .22s cubic-bezier(.2,1.5,.4,1)',
          }}
        >{joining ? 'joining…' : joined ? "you're in! 🎉" : resolvedSessionId === null ? 'loading…' : "i'm in! 🙌"}</button>
      </div>
    </DaylightScreen>
  );
}
