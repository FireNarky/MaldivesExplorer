import React from "react";

/**
 * FlyingTern: Realistic vector Maldivian White Tern (Dhondheeni) flight.
 * Stays gracefully in the background behind page content and dialogs.
 */
export function FlyingTern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none"
    >
      {/* Single graceful White Tern soaring across the hero in the background */}
      <div className="tern-container-1 pointer-events-none">
        <div className="real-tern tern-flap-1 pointer-events-none" />
      </div>
    </div>
  );
}
