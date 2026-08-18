import React from "react";
import { C } from "@/lib/cinema-catalogue";

// ── Daylight shared UI primitives ──────────────────────────────

export const FONT_DISPLAY = "'Nunito', sans-serif";
export const FONT_BODY = "'Nunito Sans', sans-serif";
export const FONT_MONO = "'Space Mono', monospace";

export function Cine({ size = 34 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: C.yellow, border: '1px solid rgba(36,31,29,.16)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size * .46,
      color: C.onAccent, lineHeight: 1, boxShadow: C.shadowChip, flexShrink: 0,
    }}>C</div>
  );
}

export function CineBubble({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.paper2, border: '1px solid rgba(36,31,29,.14)',
      borderRadius: '4px 14px 14px 14px', padding: '8px 12px',
      fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.35,
      color: C.ink, flex: 1, boxShadow: C.shadowChip, ...style,
    }}>{children}</div>
  );
}

export function MicroLabel({ children, color = C.inkSoft, style = {} }: {
  children: React.ReactNode; color?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '.14em',
      color, textTransform: 'uppercase', ...style,
    }}>{children}</div>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  outline?: boolean;
  small?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  testId?: string;
}

export function Btn({ children, onClick, primary, outline, small, disabled, style = {}, testId }: BtnProps) {
  const bg = disabled ? C.paper2 : primary ? C.yellow : outline ? 'transparent' : C.paper;
  const col = disabled ? C.inkLight : primary ? C.onAccent : C.ink;
  const border = outline
    ? `1px dashed ${C.edgeDash}`
    : `1px solid ${disabled ? 'rgba(36,31,29,.12)' : primary ? C.yellow : C.edgeStrong}`;
  return (
    <button
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      style={{
        padding: small ? '10px 18px' : '13px 24px',
        fontFamily: FONT_DISPLAY, fontWeight: small ? 600 : 700,
        fontSize: small ? 14 : 15, background: bg, color: col,
        border, borderRadius: 100, whiteSpace: 'nowrap',
        boxShadow: disabled || outline ? 'none' : C.shadowBtn,
        cursor: disabled ? 'default' : 'pointer', lineHeight: 1,
        transition: 'transform .22s cubic-bezier(.2,1.5,.4,1), box-shadow .22s ease',
        ...style,
      }}
      onMouseDown={e => { if (!disabled) (e.currentTarget.style.transform = 'scale(.96)'); }}
      onMouseUp={e => { e.currentTarget.style.transform = 'none'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
      onTouchStart={e => { if (!disabled) (e.currentTarget.style.transform = 'scale(.96)'); }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'none'; }}
    >{children}</button>
  );
}

/** Screen-enter settle animation wrapper + tinted paper background. */
export function DaylightScreen({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: C.paper,
      backgroundImage: C.wash,
      fontFamily: FONT_BODY,
      display: 'flex',
      flexDirection: 'column',
      animation: 'daylight-settle .5s cubic-bezier(.2,1.2,.35,1) both',
      ...style,
    }}>
      <style>{`@keyframes daylight-settle{from{opacity:0;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}`}</style>
      {children}
    </div>
  );
}
