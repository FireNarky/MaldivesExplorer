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
      {/* Lead White Tern - swooping gracefully across the hero */}
      <div className="tern-container-1">
        <div className="real-tern tern-flap-1" />
      </div>

      {/* Companion White Tern in formation following higher */}
      <div className="tern-container-2">
        <div className="real-tern tern-flap-2" />
      </div>

      {/* High-altitude White Tern soaring near the horizon */}
      <div className="tern-container-3">
        <div className="real-tern tern-flap-3" />
      </div>
    </div>
  );
}
