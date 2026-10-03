"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/utils";

// Each eye's own center + safe pupil-travel radii, measured directly from
// public/petIcon.png: centroid of each eye-white's pixels, then ray-cast
// from that centroid to the shape's true edge in all 4 cardinal
// directions (not a bounding box — this artwork's eyes are irregular,
// partly occluded by the eyebrow stroke) minus the pupil's own radius and
// a small safety buffer. All values are % of the icon's own width so
// everything scales with the icon's responsive clamp() sizing and stays
// aligned at any viewport width or DPR. Radii are directional (not a
// single symmetric ellipse) because the safe travel distance differs a
// lot by direction for these hand-drawn, asymmetric eye shapes.
const EYES = [
  {
    // screen-left eye
    cx: 40.8,
    cy: 49.24,
    rxPos: 1.07, // right
    rxNeg: 1.48, // left
    ryPos: 1.07, // down
    ryNeg: 2.04, // up
  },
  {
    // screen-right eye
    cx: 52.15,
    cy: 51.29,
    rxPos: 1.48, // right
    rxNeg: 1.53, // left
    ryPos: 3.66, // down
    ryNeg: 3.61, // up
  },
];
const PUPIL_DIAMETER_PCT = 2.96;
const PUPIL_COLOR = "rgb(7, 7, 7)";

// How much of the actual cursor offset (in px, relative to each eye's own
// center) becomes raw pupil movement before clamping — small enough that
// nearby cursor positions read as proportional, gentle tracking, while
// distant cursor positions simply saturate at the eye's safe boundary.
const GAZE_SENSITIVITY = 0.15;
const GAZE_DEAD_ZONE_PX = 20;
const GAZE_EASE = 0.2;

type Vec = { x: number; y: number };

/**
 * The site's one Pet Friendly icon component, rendered in two modes from
 * the same public/petIcon.png artwork (never moved, scaled or rotated)
 * and the same measured eye geometry, so both devices show visually
 * consistent pupils:
 *
 * - `interactive` (desktop/laptop, fine mouse pointer): two independently
 *   cursor-tracked CSS pupils, each clamped to its own measured safe
 *   ellipse so neither pupil can ever visually leave its eye. Clicking
 *   with a real mouse plays petJump.mp4 once, then returns to the static
 *   artwork with tracking resumed.
 * - not `interactive` (touch/coarse pointer): no pointermove listener, no
 *   rAF loop, no jump video in the DOM at all (nothing to preload on
 *   mobile data) — pupils render once at their neutral resting position
 *   and stay there.
 *
 * Touch taps are always delegated untouched to `onTouchTap` (Hero.tsx's
 * existing, unmodified paw-trail trigger) so this component never
 * duplicates or alters that logic.
 */
export default function PetInteractiveIcon({
  interactive,
  onTouchTap,
}: {
  interactive: boolean;
  onTouchTap: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pupilRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const targetsRef = useRef<Vec[]>(EYES.map(() => ({ x: 0, y: 0 })));
  const currentsRef = useRef<Vec[]>(EYES.map(() => ({ x: 0, y: 0 })));
  const jumpingRef = useRef(false);
  const [isJumping, setIsJumping] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (!interactive) return;
    reducedMotion.current = prefersReducedMotion();
    if (reducedMotion.current) return;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      EYES.forEach((eye, i) => {
        const eyeX = rect.left + (eye.cx / 100) * rect.width;
        const eyeY = rect.top + (eye.cy / 100) * rect.height;
        const dx = event.clientX - eyeX;
        const dy = event.clientY - eyeY;
        const dist = Math.hypot(dx, dy);

        if (dist < GAZE_DEAD_ZONE_PX) {
          targetsRef.current[i] = { x: 0, y: 0 };
          return;
        }

        let x = dx * GAZE_SENSITIVITY;
        let y = dy * GAZE_SENSITIVITY;

        const rx = (x >= 0 ? eye.rxPos : eye.rxNeg) * 0.01 * rect.width;
        const ry = (y >= 0 ? eye.ryPos : eye.ryNeg) * 0.01 * rect.height;
        const norm = (x / rx) ** 2 + (y / ry) ** 2;
        if (norm > 1) {
          const scale = 1 / Math.sqrt(norm);
          x *= scale;
          y *= scale;
        }
        targetsRef.current[i] = { x, y };
      });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    let rafId = requestAnimationFrame(function tick() {
      EYES.forEach((_, i) => {
        const current = currentsRef.current[i];
        const target = jumpingRef.current ? { x: 0, y: 0 } : targetsRef.current[i];
        current.x += (target.x - current.x) * GAZE_EASE;
        current.y += (target.y - current.y) * GAZE_EASE;
        const pupilEl = pupilRefs.current[i];
        if (pupilEl) {
          pupilEl.style.transform = `translate(-50%, -50%) translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`;
        }
      });
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [interactive]);

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      onTouchTap(event);
      return;
    }
    if (!interactive || event.pointerType !== "mouse" || jumpingRef.current) return;

    jumpingRef.current = true;
    targetsRef.current = EYES.map(() => ({ x: 0, y: 0 }));
    setIsJumping(true);

    const video = videoRef.current;
    if (video && !reducedMotion.current) {
      video.currentTime = 0;
      video.play().catch(() => {
        // Playback failed (e.g. blocked) — fall back to ending the jump immediately.
        jumpingRef.current = false;
        setIsJumping(false);
      });
    } else {
      // Reduced motion or no video element: keep the click acknowledgement
      // without the animated playback.
      jumpingRef.current = false;
      setIsJumping(false);
    }
  };

  const handleVideoEnded = () => {
    jumpingRef.current = false;
    setIsJumping(false);
  };

  return (
    <div
      ref={wrapRef}
      className={`hero-pet-float hero-pet-interactive${isJumping ? " is-jumping" : ""}`}
      onPointerUp={handlePointerUp}
      role="img"
      aria-label="Pet friendly café"
    >
      <img className="hero-pet-base-img" src="/petIcon.png" alt="" />

      <div className="hero-pet-pupils" aria-hidden="true">
        {EYES.map((eye, i) => (
          <span
            key={i}
            ref={(node) => {
              pupilRefs.current[i] = node;
            }}
            className="hero-pet-pupil"
            style={{
              left: `${eye.cx}%`,
              top: `${eye.cy}%`,
              width: `${PUPIL_DIAMETER_PCT}%`,
              background: PUPIL_COLOR,
            }}
          />
        ))}
      </div>

      {interactive && (
        <video
          ref={videoRef}
          className="hero-pet-jump-video"
          src="/petJump.mp4"
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
