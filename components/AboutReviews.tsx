"use client";

import { useEffect, useRef, useState } from "react";
import { LISTING_URL, type GoogleReviewsData } from "@/lib/googleReviews";

type Review = { author: string; text: string; rating: number };

// Guest reviews from the PRESS'D Google Maps listing.
const REVIEWS: Review[] = [
  {
    author: "Sajad Imanian",
    rating: 5,
    text: "Had an amazing afternoon at PRESS’D Wellness Café with my bestie! I got one of their smoothies; sooo delicious!",
  },
  {
    author: "Akram Ali",
    rating: 5,
    text: "I recently had the pleasure of visiting press’d and I must say, it was an absolute delight for my taste buds and senses! This charming little juice place has captured my heart with its refreshing beverages and warm ambiance.",
  },
  {
    author: "Lara",
    rating: 5,
    text: "Got the Mango Mania and Pina Colada smoothies. Super fresh and tasty. Great portion size for price. The atmosphere is nice for a quiet working space.",
  },
  {
    author: "Mohsin",
    rating: 5,
    text: "Got exceptionally good vibe and quality time for me",
  },
  {
    author: "Yasmeen Rashid",
    rating: 5,
    text: "The best fresh smoothies and coffee! Ambiance and atmosphere are unmatched!",
  },
  {
    author: "Diana",
    rating: 5,
    text: "Didn’t know about this new spot. I love it! Cozy atmosphere with indoor and outdoor seats next to the pool. Recommend it",
  },
];

// Quotes past this length step down one type size so the longest review
// still fits the panel without shrinking every quote.
const LONG_QUOTE = 140;
// Touch has no "hover out", so resume autoplay this long after a tap.
const TOUCH_RESUME_MS = 6000;

function Stars({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className: string;
}) {
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={className} role="img" aria-label={label}>
      {"★".repeat(filled)}
      <span className="about-reviews-star-dim">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

/**
 * About page Google reviews module: an editorial review carousel (left) and
 * a total-rating panel (right). Autoplay is driven by the active progress
 * line's CSS animation (its `animationend` advances the slide), so pausing
 * on hover/focus/touch or when off-screen freezes timer and progress
 * together, and reduced motion — which removes the animation — disables
 * autoplay while leaving arrows and keyboard navigation working.
 */
export default function AboutReviews({
  data,
}: {
  data: GoogleReviewsData | null;
}) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchHold, setTouchHold] = useState(false);
  const [inView, setInView] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchTimer = useRef<number | undefined>(undefined);

  const paused = hovered || focused || touchHold || !inView;
  const total = REVIEWS.length;

  const go = (next: number) => {
    setPrevIndex(index);
    setIndex(((next % total) + total) % total);
  };

  // Automatic transition every 5.5s when not paused by hover or touch
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((curr) => {
        setPrevIndex(curr);
        return (curr + 1) % total;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [paused, total]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(touchTimer.current);
    };
  }, []);

  const holdForTouch = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    setTouchHold(true);
    window.clearTimeout(touchTimer.current);
    touchTimer.current = window.setTimeout(
      () => setTouchHold(false),
      TOUCH_RESUME_MS,
    );
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  const rating = data?.rating ?? 4.9;
  const reviewCount = data?.reviewCount ?? 75;
  const ratingText = rating.toFixed(1);
  const mapsUri = data?.mapsUri ?? LISTING_URL;

  return (
    <div className="about-tile about-tile-reviews">
      <div className="about-reviews-inner">
        <div
          ref={panelRef}
          className={`about-reviews-panel${paused ? " is-paused" : ""}`}
          role="region"
          aria-roledescription="carousel"
          aria-label="Google reviews from our guests"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          // Only keyboard focus pauses: a mouse click on an arrow leaves the
          // button focused, which must not freeze autoplay indefinitely.
          onFocus={(e) => setFocused(e.target.matches(":focus-visible"))}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              setFocused(false);
          }}
          onPointerDown={holdForTouch}
        >
          <div className="about-reviews-head">
            <p className="about-reviews-label">
              GOOGLE REVIEWS{" "}
              <span className="about-reviews-label-rule" aria-hidden="true" />
            </p>
          </div>

          <div
            className="about-reviews-stage"
            aria-live={paused ? "polite" : "off"}
          >
            {REVIEWS.map((review, i) => {
              const state =
                i === index
                  ? " is-active"
                  : i === prevIndex
                    ? " is-leaving"
                    : "";
              return (
                <figure
                  key={review.author}
                  className={`about-reviews-slide${state}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${total}`}
                  aria-hidden={i !== index}
                >
                  <span className="about-reviews-avatar" aria-hidden="true">
                    {review.author.charAt(0)}
                  </span>
                  <Stars
                    className="about-reviews-stars"
                    value={review.rating}
                    label={`${review.rating} out of 5 stars`}
                  />
                  <blockquote
                    className={`about-reviews-quote${review.text.length > LONG_QUOTE ? " is-long" : ""}`}
                  >
                    <p>“{review.text}”</p>
                  </blockquote>
                  <figcaption className="about-reviews-meta">
                    <span className="about-reviews-author">
                      <span
                        className="about-reviews-author-rule"
                        aria-hidden="true"
                      />
                      {review.author}
                    </span>
                    <span className="about-reviews-source">Google Review</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <div className="about-reviews-progress">
            {REVIEWS.map((review, i) => (
              <button
                key={review.author}
                type="button"
                className={`about-reviews-tick${i === index ? " is-active" : ""}`}
                onClick={() => go(i)}
                aria-label={`Show review ${i + 1} of ${total}`}
                aria-current={i === index ? "true" : undefined}
              >
                {i === index && (
                  <span
                    key={index}
                    className="about-reviews-tick-fill"
                    onAnimationEnd={() => go(index + 1)}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="about-reviews-rating">
          <p className="about-reviews-rating-label">TOTAL RATING</p>
          <p
            className="about-reviews-rating-figure"
            aria-label={`Rated ${ratingText} out of 5`}
          >
            <span className="about-reviews-rating-value">{ratingText}</span>
            <span className="about-reviews-rating-max">/ 5</span>
          </p>
          <Stars
            className="about-reviews-rating-stars"
            value={rating}
            label={`${ratingText} out of 5 stars`}
          />
          <p className="about-reviews-rating-count">
            {reviewCount.toLocaleString("en-US")}+ REVIEWS
          </p>
          <a
            className="about-reviews-cta"
            href={mapsUri}
            target="_blank"
            rel="noopener noreferrer"
          >
            READ ALL REVIEWS <span aria-hidden="true">↗</span>
          </a>
          {data && (
            // Google's required attribution for the live rating/count.
            <span className="about-google-attr" translate="no">
              Google Maps
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
