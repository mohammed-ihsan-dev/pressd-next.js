"use client";

import { useState } from "react";
import SectionHomeButton from "@/components/SectionHomeButton";
import AboutReviews from "@/components/AboutReviews";
import type { GoogleReviewsData } from "@/lib/googleReviews";

const TOP_CAROUSEL_IMAGES = [
  {
    src: "/assets/visit-main-interior.webp",
    alt: "Sunlit interior at PRESS'D Wellness Café with palm trees and modern lounge seating",
    label: "THE SPACE",
  },
  {
    src: "/assets/visit-service-counter.webp",
    alt: "Barista preparing specialty brew at the espresso bar",
    label: "ESPRESSO BAR",
  },
  {
    src: "/assets/visit-lifestyle-sofa.webp",
    alt: "Guest enjoying iced matcha and dessert on lounge sofa",
    label: "LOUNGE RETREAT",
  },
  {
    src: "/assets/cafe-interior-cover.webp",
    alt: "Atmospheric interior architecture and warm lighting",
    label: "SANCTUARY",
  },
  {
    src: "/assets/visit-coffee-detail.webp",
    alt: "Signature latte art served on handcrafted wood tray",
    label: "POUR & CRAFT",
  },
];

const STORY_CAROUSEL_IMAGES = [
  {
    src: "/assets/work-ambience-cafe.webp",
    alt: "Community members working and connecting at PRESS'D",
    label: "COMMUNITY",
  },
  {
    src: "/assets/pet-friendly-cafe.webp",
    alt: "PRESS'D team member greeting a curly-haired dog at the café counter",
    label: "PET FRIENDLY",
  },
  {
    src: "/assets/our-cafe-cover.webp",
    alt: "Artisanal flat white coffee on a dark table",
    label: "ROASTS",
  },
  {
    src: "/assets/visit-guest-reading.webp",
    alt: "Guest reading in the peaceful sunlit atmosphere",
    label: "RITUALS",
  },
  {
    src: "/assets/power-bowl.webp",
    alt: "Nutrient-dense wholesome wellness bowl",
    label: "NOURISHMENT",
  },
];

export default function IntroSection({ googleReviews }: { googleReviews: GoogleReviewsData | null }) {
  const [topIndex, setTopIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);

  const nextTopImage = () => {
    setTopIndex((prev) => (prev + 1) % TOP_CAROUSEL_IMAGES.length);
  };

  const nextStoryImage = () => {
    setStoryIndex((prev) => (prev + 1) % STORY_CAROUSEL_IMAGES.length);
  };

  return (
    <section className="intro about-panel section" id="about" aria-label="About PRESS'D Wellness Café">
      <div className="about-grid">
        {/* ROW 1 LEFT: Philosophy tile */}
        <div className="about-tile about-tile-intro">
          <div>
            <p className="about-micro-eyebrow">THE PRESS’D PHILOSOPHY</p>
            <h2 className="about-headline">
              <span className="about-head-serif">CRAFTED WELLNESS,</span>
              <span className="about-head-serif about-head-accent">CURATED TASTE.</span>
            </h2>
          </div>
          <div>
            <p className="about-lead-statement">
              A modern wellness café built around honest ingredients, thoughtful preparation and a space designed for better everyday moments.
            </p>
            <p className="about-features" aria-label="Café features">
              <span>Pet Friendly</span>
              <span>Work Friendly</span>
              <span>Wellness Food</span>
              <span>Specialty Coffee</span>
            </p>
          </div>
          <SectionHomeButton />
        </div>

        {/* ROW 1 RIGHT: Interactive Large Image Carousel */}
        <div className="about-tile about-tile-carousel about-tile-carousel-top">
          <div className="about-carousel-viewport">
            {TOP_CAROUSEL_IMAGES.map((item, idx) => (
              <figure
                key={item.src}
                className={`about-carousel-slide ${idx === topIndex ? "is-active" : ""}`}
                aria-hidden={idx !== topIndex}
              >
                <img src={item.src} alt={item.alt} loading="lazy" />
              </figure>
            ))}
          </div>
          <div className="about-carousel-meta">
            <span className="about-carousel-tag">
              0{topIndex + 1} / 0{TOP_CAROUSEL_IMAGES.length} · {TOP_CAROUSEL_IMAGES[topIndex].label}
            </span>
          </div>
          <button
            type="button"
            className="about-carousel-btn"
            onClick={nextTopImage}
            aria-label="Next photograph"
            title="Next photograph"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* ROW 2: One Cohesive Editorial Community / Google Review Block */}
        <AboutReviews data={googleReviews} />

        {/* ROW 3 LEFT: Interactive Story Image Carousel */}
        <div className="about-tile about-tile-carousel about-tile-carousel-story">
          <div className="about-carousel-viewport">
            {STORY_CAROUSEL_IMAGES.map((item, idx) => (
              <figure
                key={item.src}
                className={`about-carousel-slide ${idx === storyIndex ? "is-active" : ""}`}
                aria-hidden={idx !== storyIndex}
              >
                <img src={item.src} alt={item.alt} loading="lazy" />
              </figure>
            ))}
          </div>
          <div className="about-carousel-meta">
            <span className="about-carousel-tag">
              0{storyIndex + 1} / 0{STORY_CAROUSEL_IMAGES.length} · {STORY_CAROUSEL_IMAGES[storyIndex].label}
            </span>
          </div>
          <button
            type="button"
            className="about-carousel-btn"
            onClick={nextStoryImage}
            aria-label="Next story photograph"
            title="Next story photograph"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* ROW 3 RIGHT: Our Story Tile */}
        <div className="about-tile about-tile-story">
          <div className="about-col-label">
            <span className="about-col-label-line" aria-hidden="true" />
            <span>OUR STORY</span>
            <span className="about-col-label-line" aria-hidden="true" />
          </div>
          <div>
            <h3 className="about-story-title">A Space Made for Good Days</h3>
            <p className="about-story-text">
              PRESS’D was created around the idea that good food, good coffee and good energy belong together. Born at
              Meydan Polo Residence, we built an unhurried sanctuary where nutrition meets uncompromising flavour. A
              thoughtfully crafted space for morning rituals, productive afternoons, and genuine community.
            </p>
          </div>
          <div className="about-story-signoff">
            <span className="about-story-loc">Meydan Polo Residence · Nad Al Sheba 1, Dubai</span>
          </div>
        </div>

        {/* ROW 4: Brand Colophon Strip */}
        <div className="about-tile about-colophon">
          <span className="about-colophon-loc">MEYDAN POLO RESIDENCE · NAD AL SHEBA 1 · DUBAI</span>
          <span className="about-colophon-sep" aria-hidden="true">◇</span>
          <span className="about-colophon-tag">WELLNESS CAFÉ &amp; SPECIALTY ROASTS</span>
          <span className="about-colophon-sep" aria-hidden="true">◇</span>
          <span className="about-colophon-copy">© PRESS’D WELLNESS CAFÉ</span>
          <img
            src="/website-pet-icon.png"
            alt=""
            className="about-pet-mark"
            width="32"
            height="32"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
