"use client";

/**
 * FlyingTern – an animated white seabird (common tern) that glides
 * across the hero banner, banking gently as it climbs and dips.
 *
 * The birds are positioned fixed relative to the viewport so that
 * the section's overflow:hidden never clips them mid-flight.
 * All motion is disabled automatically via prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────────────
   SVG paths for a stylised white tern
   Body: slim fuselage, pointed tail fork
   Wings: swept back, angled tip feathers
   Head: small rounded cap with tiny orange beak
────────────────────────────────────────────────────────────────────── */

function TernSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 54"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ overflow: "visible" }}
    >
      {/* ── Drop shadow filter ── */}
      <defs>
        <filter id="tern-shadow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.18)" />
        </filter>
      </defs>

      <g filter="url(#tern-shadow)">
        {/* ── Body (slim oval, pointed tail) ── */}
        <ellipse cx="60" cy="27" rx="22" ry="6.5" fill="white" opacity="0.97" />
        {/* Tail fork – left prong */}
        <path
          d="M38 27 Q30 30 22 36 Q26 32 38 28"
          fill="white"
          opacity="0.9"
        />
        {/* Tail fork – right prong */}
        <path
          d="M38 27 Q30 24 22 18 Q26 22 38 26"
          fill="white"
          opacity="0.9"
        />

        {/* ── Upper wing (left of screen = left wing when flying right) ──
            Will be animated via CSS class "tern-wing-upper" */}
        <path
          className="tern-wing-upper"
          d="M60 24 Q52 10 20 8 Q36 18 58 24"
          fill="white"
          opacity="0.95"
          style={{ transformOrigin: "60px 24px" }}
        />
        {/* Wingtip feathers – upper */}
        <path
          className="tern-wing-upper"
          d="M20 8 Q14 9 10 13 Q16 10 22 10"
          fill="white"
          opacity="0.8"
          style={{ transformOrigin: "60px 24px" }}
        />

        {/* ── Lower wing (right wing) ── */}
        <path
          className="tern-wing-lower"
          d="M60 30 Q52 44 20 46 Q36 36 58 30"
          fill="white"
          opacity="0.95"
          style={{ transformOrigin: "60px 30px" }}
        />
        {/* Wingtip feathers – lower */}
        <path
          className="tern-wing-lower"
          d="M20 46 Q14 45 10 41 Q16 44 22 44"
          fill="white"
          opacity="0.8"
          style={{ transformOrigin: "60px 30px" }}
        />

        {/* ── Head ── */}
        <circle cx="81" cy="25" r="8" fill="white" />
        {/* Black cap */}
        <path d="M74 22 Q81 14 88 20 Q84 16 81 17 Q78 16 74 22" fill="#0f1f27" opacity="0.85" />
        {/* Beak */}
        <path d="M89 26 L97 27.5 L89 28.5" fill="#e56c00" />
        {/* Eye */}
        <circle cx="86" cy="25" r="1.2" fill="#0f1f27" />
      </g>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Injected keyframe styles
   We inject them once into the document <head> so Tailwind purging
   doesn't need to know about them.
────────────────────────────────────────────────────────────────────── */

const STYLE_ID = "flying-tern-keyframes";

const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
  /* Wing flap – upper wing rises */
  @keyframes tern-flap-up {
    0%, 100% { transform: rotateX(0deg) scaleY(1); }
    40%       { transform: rotateX(-28deg) scaleY(0.85); }
    60%       { transform: rotateX(-28deg) scaleY(0.85); }
  }
  /* Wing flap – lower wing drops */
  @keyframes tern-flap-down {
    0%, 100% { transform: rotateX(0deg) scaleY(1); }
    40%       { transform: rotateX(28deg) scaleY(0.85); }
    60%       { transform: rotateX(28deg) scaleY(0.85); }
  }
  /* Whole-bird drift: gentle figure-8 sine through the hero */
  @keyframes tern-drift {
    0%   { transform: translate(-160px, 40px)  rotate(-3deg); opacity: 0; }
    4%   { opacity: 1; }
    20%  { transform: translate(20vw, 10px)    rotate(1deg); }
    40%  { transform: translate(42vw, 35px)    rotate(-2deg); }
    60%  { transform: translate(64vw, 8px)     rotate(2deg); }
    80%  { transform: translate(82vw, 28px)    rotate(-1deg); }
    95%  { opacity: 1; }
    100% { transform: translate(110vw, 15px)   rotate(-3deg); opacity: 0; }
  }
  /* A second bird that comes through at a slightly different path + time */
  @keyframes tern-drift-b {
    0%   { transform: translate(-160px, 85px)  rotate(-2deg) scaleX(0.82); opacity: 0; }
    5%   { opacity: 0.65; }
    25%  { transform: translate(18vw, 55px)    rotate(2deg)  scaleX(0.82); }
    50%  { transform: translate(50vw, 72px)    rotate(-1deg) scaleX(0.82); }
    75%  { transform: translate(75vw, 48px)    rotate(1deg)  scaleX(0.82); }
    95%  { opacity: 0.65; }
    100% { transform: translate(110vw, 62px)   rotate(-2deg) scaleX(0.82); opacity: 0; }
  }

  .tern-wing-upper { animation: tern-flap-up   1.45s ease-in-out infinite; }
  .tern-wing-lower { animation: tern-flap-down  1.45s ease-in-out infinite; }
  .tern-bird-a     { animation: tern-drift      18s   cubic-bezier(0.45,0,0.55,1) infinite; animation-delay: 2s; }
  .tern-bird-b     { animation: tern-drift-b    24s   cubic-bezier(0.45,0,0.55,1) infinite; animation-delay: 9s; }
}
`;

function injectKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

/* ──────────────────────────────────────────────────────────────────────
   Main export
────────────────────────────────────────────────────────────────────── */

export function FlyingTern() {
  const injected = useRef(false);
  useEffect(() => {
    if (!injected.current) {
      injectKeyframes();
      injected.current = true;
    }
  }, []);

  return (
    /*
     * fixed + z-[5] keeps the birds above the hero but below the sticky
     * header (z-10). We limit height to the hero section visually by
     * clamping the top offset — birds drift between 5vh and 40vh, which
     * stays well within the hero on any screen.
     * pointer-events-none so nothing is blocked.
     */
    <div aria-hidden="true" className="pointer-events-none fixed top-0 left-0 w-full z-[5]">
      {/* Primary bird – large, full-speed pass */}
      <div className="tern-bird-a absolute top-[8vh] left-0 w-[120px] will-change-transform">
        <TernSvg />
      </div>

      {/* Secondary bird – slightly smaller, delayed, softer */}
      <div className="tern-bird-b absolute top-[18vh] left-0 w-[90px] will-change-transform">
        <TernSvg />
      </div>
    </div>
  );
}
