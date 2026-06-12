import React from 'react';

// ── Palette ──────────────────────────────────────────────────────────
const INDIGO = '#4F46E5';
const CYAN   = '#22D3EE';
const GREEN  = '#34D399';
const DARK   = '#070A12';
const PANEL  = '#0F172A';

const EKavachLogo = ({ size = 'md', variant = 'full' }) => {
  // NOTE: Keep logo wordmark within viewBox bounds across all sizes.
  // This prevents visual clipping (missing “full name” feeling) on smaller viewports.

  const scales = { xs: 0.34, sm: 0.5, md: 1, lg: 0.95, xl: 1.05 };
  const s = typeof scales[size] === 'number' ? scales[size] : 1;



  // ══════════════════════════════════════════════════════════════════
  // FULL  — Hex-K shield mark + wordmark side-by-side
  //
  //  viewBox = 144 × 40  @ s = 1
  //  Hex mark = 34 × 34,  centred at (17, 20)
  //  Right edge of mark = 34 →  + 8px gap = text starts at 42
  //  "Kavach" ends approximately at 136  →  total viewBox = 144
  // ══════════════════════════════════════════════════════════════════
  if (variant === 'full') {
    // Slightly reduce wordmark font to ensure it never overflows/clips
    // (especially on lower DPI / different font rendering engines on LAN devices).
    const VB_W = 144;
    const VB_H = 40;
    const FS   = Math.round(23 * s);
    const ST   = 1.0 + Math.min(s * 0.28, 0.6);
    const GAP  = Math.round(8 * s);
    const MARK_RIGHT = Math.round(34 * s);
    const TX_OFF  = Math.round((MARK_RIGHT + GAP) * 0.99);

    return (
<svg
        width={Math.round(VB_W * s)}
        height={Math.round(VB_H * s)}
        viewBox={`-2 0 ${VB_W + 4} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="eKavach — Vulnerability Tracker"
      >
        <defs>
          <linearGradient id="hv-c" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={CYAN}/>
            <stop offset="100%" stopColor="#60A5FA"/>
          </linearGradient>
          <linearGradient id="hv-i" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={INDIGO}/>
            <stop offset="100%" stopColor="#4338CA"/>
          </linearGradient>
          <linearGradient id="hv-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={GREEN}/>
            <stop offset="100%" stopColor="#34D399"/>
          </linearGradient>
          <linearGradient id="hv-k" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={GREEN}/>
            <stop offset="100%" stopColor={CYAN}/>
          </linearGradient>
        </defs>

        {/* ── Hexagon body (points hardcoded for viewBox 144×40 at s=1) ── */}
        {/* Vertices of 34px hex:  top(17,2) → topR(34,10.5) → botR(34,29.5) → bot(17,38) → botL(0,29.5) → topL(0,10.5) */}
        <polygon
          points="17,3 33,10.5 33,29.5 17,37 1,29.5 1,10.5"
          fill={DARK}
        />
        {/* Outer rim — indigo glow */}
        <polygon
          points="17,3 33,10.5 33,29.5 17,37 1,29.5 1,10.5"
          fill="none"
          stroke="url(#hv-i)"
          strokeWidth={1.6 + ST * 0.3}
        />
        {/* Top edge tick — cyan */}
        <line x1="2"    y1="11.5" x2="32"    y2="11.5"
              stroke={CYAN} strokeWidth={0.9} opacity="0.5"/>
        {/* Right edge tick — cyan */}
        <line x1="32"   y1="11.5" x2="32"    y2="29"
              stroke={CYAN} strokeWidth={0.9} opacity="0.5"/>
        {/* Left edge tick — green accent */}
        <line x1="2"    y1="29"  x2="2"     y2="36"
              stroke={GREEN} strokeWidth={1.0} opacity="0.55"/>

        {/* ── The "K" ── */}
        {/* Vertical stem */}
        <line
          x1="17" y1="7" x2="17" y2="33"
          stroke="url(#hv-i)"
          strokeWidth={3.4 + ST}
          strokeLinecap="round"
        />
        {/* Upper arm: top-left */}
        <line
          x1="17" y1="13" x2="4"  y2="5.5"
          stroke={CYAN}
          strokeWidth={2.5 + ST * 0.45}
          strokeLinecap="round"
        />
        {/* Lower arm: bottom-right */}
        <line
          x1="17" y1="17.5" x2="32" y2="33.5"
          stroke="url(#hv-g)"
          strokeWidth={2.5 + ST * 0.45}
          strokeLinecap="round"
        />

        {/* Arm-tip nodes */}
        <circle cx="4"  cy="5.5"   r="2.1" fill={CYAN}   opacity="0.92"/>
        <circle cx="32" cy="33.5"  r="2.1" fill={GREEN}  opacity="0.92"/>
        <circle cx="17" cy="33.7"  r="1.6" fill={INDIGO} opacity="0.88"/>

        {/* ── WORDMARK — "eKavach" — spaced 8px after mark ── */}
        <text
          x={TX_OFF} y={28}
          textAnchor="start"
          fontFamily="'Inter', 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
          fontWeight="800" fontSize={FS} fill={CYAN}
          letterSpacing="-0.3">e</text>
        <text
          x={TX_OFF + Math.round(FS * 0.62)} y={28}
          textAnchor="start"
          fontFamily="'Inter', 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
          fontWeight="800" fontSize={FS}
          fill="url(#hv-k)"
          letterSpacing="-0.3">Kavach</text>
      </svg>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // ICON — 38×38  hex badge for sidebar / loading / favicon
  // ══════════════════════════════════════════════════════════════════
  if (variant === 'icon') {
    const B  = Math.round(38 * s);
    const HC = B * 0.5;   // hex centre = centre of canvas
    const HR = B * 0.42;  // hex apothem radius (flat-to-flat / 2)
    const cos60 = 0.5;
    const sin60 = 0.8660254;

    // Six vertices (pointy-top hex) — all numbers, no JS vars inside SVG attrs
    const x0 = HC              ;  const y0 = HC - HR;              // top
    const x1 = HC + HR * sin60;  const y1 = HC - HR * cos60;       // top-right
    const x2 = HC + HR * sin60;  const y2 = HC + HR * cos60;       // bot-right
    const x3 = HC              ;  const y3 = HC + HR;               // bot
    const x4 = HC - HR * sin60;  const y4 = HC + HR * cos60;       // bot-left
    const x5 = HC - HR * sin60;  const y5 = HC - HR * cos60;       // top-left

    return (
      <svg
        width={B} height={B}
        viewBox="0 0 38 38"
        xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label="eKavach"
      >
        <defs>
          <linearGradient id="hvi-c" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={CYAN}/>
            <stop offset="100%" stopColor="#60A5FA"/>
          </linearGradient>
          <linearGradient id="hvi-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={GREEN}/>
            <stop offset="100%" stopColor="#34D399"/>
          </linearGradient>
        </defs>

        {/* Background hex */}
        <polygon
          points={`${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4} ${x5},${y5}`}
          fill={DARK}
        />
        {/* Outer rim */}
        <polygon
          points={`${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4} ${x5},${y5}`}
          fill="none"
          stroke="url(#hvi-c)" strokeWidth="1.8"
        />
        {/* Inner rim */}
        <polygon
          points={`${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4} ${x5},${y5}`}
          fill="none"
          stroke="url(#hvi-g)" strokeWidth="1.1"
        />

        {/* ── K in hex body ── */}
        {/* Vertical stem */}
        <line x1={HC} y1={HC - HR * 0.75}
              x2={HC} y2={HC + HR * 0.75}
              stroke="url(#hvi-c)" strokeWidth="3"
              strokeLinecap="round"/>
        {/* Upper arm: top-left */}
        <line x1={HC} y1={HC - HR * 0.2}
              x2={HC - HR * 0.65} y2={HC - HR * 0.8}
              stroke={CYAN} strokeWidth="2.2"
              strokeLinecap="round"/>
        {/* Lower arm: bot-right */}
        <line x1={HC} y1={HC + HR * 0.12}
              x2={HC + HR * 0.65} y2={HC + HR * 0.78}
              stroke="url(#hvi-g)" strokeWidth="2.2"
              strokeLinecap="round"/>

        {/* Tip nodes */}
        <circle cx={HC - HR * 0.65} cy={HC - HR * 0.8}  r="1.8" fill={CYAN}   opacity="0.9"/>
        <circle cx={HC + HR * 0.65} cy={HC + HR * 0.78}  r="1.8" fill={GREEN}  opacity="0.9"/>
        <circle cx={HC}            cy={HC + HR * 0.75}  r="1.4" fill={INDIGO} opacity="0.85"/>
      </svg>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // TEXT — wordmark only
  // ══════════════════════════════════════════════════════════════════
  if (variant === 'text') {
    const FS = Math.round(28 * s);

    return (
<svg
        width={Math.round(156 * s)}
        height={Math.round(40 * s)}
        viewBox="-2 0 160 40"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
        xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label="eKavach"
      >
<text x={Math.round(4 * s)} y={Math.round(30 * s)}
              textAnchor="start"
              fontFamily="'Inter', 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
              fontWeight="800" fontSize={FS} fill={CYAN}
              letterSpacing="-0.35">e</text>
        <text x={Math.round(4 * s) + Math.round(FS * 0.62)} y={Math.round(30 * s)}
              textAnchor="start"
              fontFamily="'Inter', 'SF Pro Display', 'Segoe UI', system-ui, sans-serif"
              fontWeight="800" fontSize={FS}
              fill="url(#hv-k)"
              letterSpacing="-0.35">Kavach</text>
      </svg>
    );
  }

  return null;
};

export default EKavachLogo;
