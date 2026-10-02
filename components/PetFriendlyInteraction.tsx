"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";
import { prefersReducedMotion } from "@/lib/utils";

/** Total play time of the full sequence (ms) — kept in one place so every
 *  timer (reset, deferred navigation) stays in sync with the CSS. */
const SEQUENCE_MS = 1600;
const REDUCED_MOTION_MS = 450;

function PawMarkIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="20.5" rx="7.2" ry="6" />
      <ellipse cx="6.8" cy="12.5" rx="2.6" ry="3.3" />
      <ellipse cx="13.2" cy="7.6" rx="2.6" ry="3.3" />
      <ellipse cx="18.8" cy="7.6" rx="2.6" ry="3.3" />
      <ellipse cx="25.2" cy="12.5" rx="2.6" ry="3.3" />
    </svg>
  );
}

function DogIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 14 C14 10 8 14 9 22 C9.5 27 13 30 16 31" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 14 C50 10 56 14 55 22 C54.5 27 51 30 48 31" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M32 15 C44 15 50 24 49 34 C48 44 40 50 32 50 C24 50 16 44 15 34 C14 24 20 15 32 15 Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M27.5 36 C29 38 35 38 36.5 36" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="29" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="39" cy="29" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function PetFriendlyInteraction() {
  const goToPets = useSectionLinkHandler()("#pets");
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);
  const navigateTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Reading the OS motion preference is an external-system read, not
    // derivable state, so an effect is the right place for it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(resetTimer.current);
      window.clearTimeout(navigateTimer.current);
    },
    []
  );

  const duration = reduced ? REDUCED_MOTION_MS : SEQUENCE_MS;

  const play = useCallback(() => {
    setPlaying(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setPlaying(false), duration);
  }, [duration]);

  // Clicking/tapping still plays the moment, then navigates to the Pet
  // Friendly section exactly as this link always has — it's the only
  // entry point into that section's detail view, so real navigation must
  // keep working. Hovering (desktop only) previews the moment without
  // navigating anywhere. React 19 doesn't pool synthetic events, so reusing
  // `event` inside the later timeout is safe.
  const handleActivate = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      play();
      window.clearTimeout(navigateTimer.current);
      navigateTimer.current = window.setTimeout(() => goToPets(event), duration);
    },
    [duration, play, goToPets]
  );

  return (
    <div className={`hero-pet-interaction${playing ? " is-playing" : ""}${reduced ? " reduced-motion" : ""}`}>
      <a
        href="#pets"
        className="hero-pet-badge"
        aria-label="Pet Friendly café — bring your best friend. Hover or tap to say hello."
        onMouseEnter={() => !playing && play()}
        onFocus={() => !playing && play()}
        onClick={handleActivate}
      >
        <span className="hero-pet-badge-paw" aria-hidden="true">
          <PawMarkIcon />
        </span>
        <span className="hero-pet-badge-text">
          <span className="hero-pet-badge-title">PET FRIENDLY</span>
          <span className="hero-pet-badge-desc">BRING YOUR BEST FRIEND</span>
        </span>
      </a>

      <div className="pet-fx" aria-hidden="true">
        <span className="pet-fx-paw pet-fx-paw-1">
          <PawMarkIcon />
        </span>
        <span className="pet-fx-paw pet-fx-paw-2">
          <PawMarkIcon />
        </span>
        <span className="pet-fx-paw pet-fx-paw-3">
          <PawMarkIcon />
        </span>
        <span className="pet-fx-paw pet-fx-paw-4">
          <PawMarkIcon />
        </span>
        <span className="pet-fx-dog">
          <DogIcon />
        </span>
        <span className="pet-fx-text">Bow wow!</span>
        <span className="pet-fx-particles">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
