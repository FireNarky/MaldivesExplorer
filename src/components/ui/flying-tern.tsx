import React from "react";

/**
 * FlyingTern: Realistic vector Maldivian White Tern (Dhondheeni) flight.
 * Uses 10-frame high-resolution avian kinematics with authentic
 * wing strokes, bank angles, and soaring trajectory arcs.
 */
export function FlyingTern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-20"
    >
      {/* Single graceful White Tern soaring across the hero */}
      <div className="tern-container-1">
        <div className="real-tern tern-flap-1" />
      </div>
    </div>
  );
}
