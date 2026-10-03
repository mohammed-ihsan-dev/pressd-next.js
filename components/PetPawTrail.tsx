"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "@/lib/utils";

/** Six steps walking bottom→top with a subtle left/right wobble and
 *  alternating paw orientation (mirrored every other step) rather than a
 *  straight mathematical line. */
const STEPS = [
  { x: 50, bottom: 10, rotate: -8 },
  { x: 57, bottom: 24, rotate: 12, mirror: true },
  { x: 45, bottom: 38, rotate: -14 },
  { x: 56, bottom: 52, rotate: 10, mirror: true },
  { x: 46, bottom: 66, rotate: -11 },
  { x: 54, bottom: 80, rotate: 8, mirror: true },
];

const STEP_DELAY_MS = 150;
const STEP_DURATION_MS = 620;
const REDUCED_DURATION_MS = 420;

function PawMark() {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true">
      <ellipse cx="0" cy="6" rx="5" ry="4" />
      <ellipse cx="-5" cy="-2" rx="2" ry="2.6" />
      <ellipse cx="-1.5" cy="-5.2" rx="2" ry="2.6" />
      <ellipse cx="2.5" cy="-5.2" rx="2" ry="2.6" />
      <ellipse cx="6" cy="-2" rx="2" ry="2.6" />
    </svg>
  );
}

/**
 * Plays once each time `trigger` increments to a new value. Call `onDone`
 * when the sequence finishes so the caller can allow the next tap.
 */
export default function PetPawTrail({ trigger, onDone }: { trigger: number; onDone?: () => void }) {
  // Derived during render (no setState needed to turn it "on"): playing
  // whenever this trigger value hasn't been marked done yet. The effect
  // below only ever sets state from inside its timeout callback, to turn
  // it back "off" once the sequence has run its course.
  const [doneUpTo, setDoneUpTo] = useState(0);
  const playing = trigger > 0 && trigger > doneUpTo;

  useEffect(() => {
    if (!playing) return;
    const reduced = prefersReducedMotion();
    const totalMs = reduced
      ? REDUCED_DURATION_MS + 80
      : STEP_DELAY_MS * (STEPS.length - 1) + STEP_DURATION_MS + 120;
    const timer = window.setTimeout(() => {
      setDoneUpTo(trigger);
      onDone?.();
    }, totalMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, playing]);

  if (!playing || typeof document === "undefined") return null;

  // Portal to document.body rather than rendering in place: .hero-main's
  // own transform/animation usage elsewhere can create a new containing
  // block for position:fixed descendants, which would wrongly confine this
  // "full viewport" overlay to the hero panel instead of the real screen.
  const overlay = prefersReducedMotion() ? (
    <div className="pet-paw-overlay" aria-hidden="true">
      <span className="pet-paw-step-wrap" style={{ left: "50%", bottom: "42%" }}>
        <span className="pet-paw-step pet-paw-reduced">
          <PawMark />
        </span>
      </span>
    </div>
  ) : (
    <div className="pet-paw-overlay" aria-hidden="true">
      {STEPS.map((s, i) => (
        <span
          key={i}
          className="pet-paw-step-wrap"
          style={{
            left: `${s.x}%`,
            bottom: `${s.bottom}%`,
            transform: `translateX(-50%) rotate(${s.rotate}deg)${s.mirror ? " scaleX(-1)" : ""}`,
          }}
        >
          <span className="pet-paw-step" style={{ animationDelay: `${i * STEP_DELAY_MS}ms` }}>
            <PawMark />
          </span>
        </span>
      ))}
    </div>
  );

  return createPortal(overlay, document.body);
}
