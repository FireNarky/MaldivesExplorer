import React from "react";

/**
 * WhiteTernSvg: Stylised Maldivian White Tern (Dhondheeni / Gygis alba).
 * Features iconic pure-white plumage, large dark eye, cobalt-base black beak,
 * and deeply forked tail streamers.
 */
export function WhiteTernSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className || "w-full h-auto"}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="tern-shadow-glow" x="-30%" y="-40%" width="160%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="rgba(0,18,28,0.35)" />
        </filter>
        <linearGradient id="tern-body-grad" x1="40" y1="35" x2="110" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      <g filter="url(#tern-shadow-glow)">
        {/* Streamer Tail (long forked fairy tern tail) */}
        <path
          d="M44 35 C32 38 10 49 2 58 C14 47 34 38 44 36.5 Z"
          fill="#f8fafc"
          opacity="0.95"
        />
        <path
          d="M44 35 C32 32 10 21 2 12 C14 23 34 32 44 33.5 Z"
          fill="#ffffff"
        />

        {/* Fuselage Body */}
        <ellipse cx="70" cy="35" rx="28" ry="8" fill="url(#tern-body-grad)" />
        {/* Soft underwing contour */}
        <path d="M50 35 Q70 42 90 35 Q70 38 50 35 Z" fill="#e2e8f0" opacity="0.6" />

        {/* Head */}
        <circle cx="96" cy="34" r="8" fill="#ffffff" />
        {/* Iconic black eye with ring */}
        <circle cx="98.5" cy="33" r="3" fill="#09141a" />
        <circle cx="99.2" cy="32.2" r="1" fill="#ffffff" />
        {/* Sharp black beak with cobalt blue root */}
        <path d="M103 32 L120 34 L103 36 Z" fill="#09141a" />
        <path d="M103 32.5 L108 33.5 L108 35 L103 35.5 Z" fill="#0284c7" opacity="0.85" />

        {/* Far/Upper Wing */}
        <g className="tern-wing-up">
          <path
            d="M62 30 C58 16 40 2 16 0 C36 12 56 24 70 30 Z"
            fill="#f8fafc"
            opacity="0.95"
          />
          <path
            d="M16 0 C10 3 6 8 10 12 C16 8 24 4 32 2 Z"
            fill="#ffffff"
          />
          <path
            d="M60 26 C48 16 34 7 20 3"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* Near/Lower Wing */}
        <g className="tern-wing-down">
          <path
            d="M62 40 C58 54 40 68 16 70 C36 58 56 46 70 40 Z"
            fill="#ffffff"
          />
          <path
            d="M16 70 C10 67 6 62 10 58 C16 62 24 66 32 68 Z"
            fill="#f1f5f9"
          />
          <path
            d="M60 44 C48 54 34 63 20 67"
            stroke="rgba(203,213,225,0.7)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}

/**
 * FlyingTern: Orchestrates two Maldivian White Terns (Dhondheeni)
 * soaring across the hero sky in natural looping arcs.
 */
export function FlyingTern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-20"
    >
      {/* Lead White Tern (Dhondheeni) - flies across immediately */}
      <div className="tern-lead absolute top-6 left-0 w-[120px] sm:w-[140px] will-change-transform">
        <WhiteTernSvg />
      </div>

      {/* Companion White Tern - soars following close behind */}
      <div className="tern-companion absolute top-14 left-0 w-[95px] sm:w-[110px] will-change-transform">
        <WhiteTernSvg />
      </div>
    </div>
  );
}
