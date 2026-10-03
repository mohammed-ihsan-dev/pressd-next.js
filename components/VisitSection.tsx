"use client";

import { useBooking } from "@/components/booking/BookingContext";
import SectionHomeButton from "@/components/SectionHomeButton";

const MAPS_URL = "https://maps.app.goo.gl/PnBP3FGwKFWAP8VF8";

/** Minimal continuous-line sketch of a cat and dog cuddling — understated warm-gold linework */
function PetLoveArt() {
  return (
    <svg
      className="visit-pet-art"
      viewBox="0 0 460 300"
      fill="none"
      aria-hidden="true"
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* Hearts */}
        <path
          d="M225,108 C211,94 211,82 221,80 C227,79 225,86 225,90 C225,86 223,79 229,80 C239,82 239,94 225,108 Z"
          stroke="var(--orange, #fbb019)"
          strokeWidth="1.8"
          opacity="0.85"
        />
        <path
          d="M258,82 C250,74 250,67 256,66 C259,65.5 258,69 258,71 C258,69 257,65.5 260,66 C266,67 266,74 258,82 Z"
          stroke="#c9922f"
          strokeWidth="1.4"
          opacity="0.65"
        />

        {/* Cat */}
        <path
          d="M118,260 C112,230 112,205 122,188 C128,176 136,168 146,165 C156,168 160,178 158,190 C170,195 182,205 190,218 C196,228 198,240 196,252 L196,260"
          stroke="var(--orange, #fbb019)"
          strokeWidth="2.2"
        />
        <path d="M134,166 L130,146 L146,160" stroke="var(--orange, #fbb019)" strokeWidth="2" />
        <path d="M150,163 L156,144 L166,160" stroke="var(--orange, #fbb019)" strokeWidth="2" />
        <path
          d="M196,255 C215,250 225,230 215,210 C208,196 190,192 180,200"
          stroke="var(--orange, #fbb019)"
          strokeWidth="2"
        />
        <circle cx="149" cy="179" r="1.5" fill="var(--orange, #fbb019)" stroke="none" />

        {/* Dog */}
        <circle cx="280" cy="168" r="27" stroke="#c9922f" strokeWidth="2.2" />
        <path
          d="M300,146 C315,152 318,172 306,186 C301,192 292,193 286,188"
          stroke="#c9922f"
          strokeWidth="2"
        />
        <path d="M256,182 C250,205 248,230 252,250 L254,260" stroke="#c9922f" strokeWidth="2.2" />
        <path
          d="M300,150 C330,148 365,160 385,185 C398,202 400,225 394,248 L390,260"
          stroke="#c9922f"
          strokeWidth="2.2"
        />
        <path
          d="M390,250 C404,242 408,226 400,214 C396,207 386,206 382,212"
          stroke="#c9922f"
          strokeWidth="2"
        />
        <circle cx="269" cy="160" r="1.8" fill="#c9922f" stroke="none" />
        <circle cx="258" cy="186" r="1.6" fill="#c9922f" stroke="none" />
      </g>
    </svg>
  );
}

export default function VisitSection() {
  const { openBooking } = useBooking();

  return (
    <section className="visit section" id="visit" aria-label="Visit PRESS'D Wellness Café">
      <div className="visit-editorial-layout">
        {/* DESKTOP LEFT: Dominant real PRESS'D café photograph (50-55% visual anchor) */}
        <div className="visit-dominant-col">
          <figure className="visit-dominant-figure">
            <img
              src="/assets/visit-main-interior.webp"
              alt="Real sunlit PRESS'D café interior showing windows, palms, lounge seating, pendant lighting, and warm wood architecture"
              className="visit-dominant-image"
              loading="eager"
            />
            <figcaption className="visit-dominant-caption">
              <span className="visit-dominant-eyebrow">THIS IS OUR CAFÉ</span>
              <p className="visit-dominant-loc">Meydan Polo Residence · Nad Al Sheba 1, Dubai</p>
            </figcaption>
          </figure>
        </div>

        {/* DESKTOP RIGHT: Asymmetric editorial flow */}
        <div className="visit-editorial-col">
          {/* 1. INTRO / VISIT INFORMATION */}
          <div className="visit-block visit-intro-block">
            <div className="visit-intro-top-row">
              <div className="visit-intro-title-wrap">
                <span className="visit-micro-eyebrow">COME SAY HELLO</span>
                <h1 className="visit-editorial-title">
                  COME VISIT <span className="visit-title-serif">PRESS’D.</span>
                </h1>
              </div>

              {/* 2. OPENING HOURS (Clean, compact, no giant clocks or cards) */}
              <div className="visit-hours-editorial">
                <span className="visit-micro-eyebrow">OPENING HOURS</span>
                <div className="visit-hours-schedule">
                  <span className="visit-hours-days">DAILY</span>
                  <span className="visit-hours-times">7:00 AM — 10:00 PM</span>
                </div>
                <span className="visit-hours-status">Dine-in &amp; Takeaway · All week</span>
              </div>
            </div>

            <p className="visit-intro-narrative">
              Clean ingredients, mindful rituals, and an open sunlit sanctuary.
              Whether you are stopping by for your morning brew or lingering over wholesome food,
              our doors are always open at Meydan Polo Residence.
            </p>

            <div className="visit-action-row">
              <button
                type="button"
                className="visit-action-book"
                onClick={openBooking}
                aria-label="Book a table at PRESS'D"
              >
                Book a table <span>↗</span>
              </button>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-action-directions"
                aria-label="Get directions to PRESS'D on Google Maps"
              >
                Get directions <span>→</span>
              </a>
            </div>
          </div>

          <div className="visit-editorial-rule" />

          {/* 3. LOCATION */}
          <div className="visit-block visit-location-section">
            <div className="visit-location-editorial-row">
              <div className="visit-location-editorial-info">
                <span className="visit-micro-eyebrow">LOCATION</span>
                <h2 className="visit-location-heading">PRESS’D Wellness Café</h2>
                <p className="visit-location-address">
                  Meydan Polo Residence<br />
                  Nad Al Sheba 1, Dubai, UAE
                </p>
              </div>
              <div className="visit-location-editorial-cta">
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="visit-editorial-maps-link"
                  aria-label="Open PRESS'D on Google Maps"
                >
                  OPEN IN MAPS <span>→</span>
                </a>
              </div>
            </div>
          </div>

          <div className="visit-editorial-rule" />

          {/* 4. SMALL REAL-PHOTO GALLERY (Asymmetric arrangement) */}
          <div className="visit-block visit-gallery-section">
            <div className="visit-gallery-label-row">
              <span className="visit-micro-eyebrow">THE SPACE &amp; RITUALS</span>
              <span className="visit-gallery-counter">3 REAL MOMENTS</span>
            </div>

            <div className="visit-asymmetric-gallery">
              {/* IMAGE 01: Real lifestyle inside café */}
              <figure className="visit-gallery-item visit-gallery-item-lifestyle">
                <img
                  src="/assets/visit-lifestyle-sofa.webp"
                  alt="Guest enjoying dessert and iced coffee on lounge sofa inside PRESS'D café"
                  loading="lazy"
                />
                <figcaption className="visit-gallery-caption">
                  <span className="visit-cap-index">01</span>
                  <span className="visit-cap-title">LOUNGE &amp; RETREAT</span>
                </figcaption>
              </figure>

              {/* IMAGE 02 & 03: Service counter & coffee detail */}
              <div className="visit-gallery-split-sub">
                <figure className="visit-gallery-item visit-gallery-item-service">
                  <img
                    src="/assets/visit-service-counter.webp"
                    alt="Barista at the PRESS'D service counter with pastry display and modern brew station"
                    loading="lazy"
                  />
                  <figcaption className="visit-gallery-caption">
                    <span className="visit-cap-index">02</span>
                    <span className="visit-cap-title">THE ESPRESSO BAR</span>
                  </figcaption>
                </figure>

                <figure className="visit-gallery-item visit-gallery-item-detail">
                  <img
                    src="/assets/visit-coffee-detail.webp"
                    alt="Signature PRESS'D hot coffee with latte art on handcrafted wooden serving tray"
                    loading="lazy"
                  />
                  <figcaption className="visit-gallery-caption">
                    <span className="visit-cap-index">03</span>
                    <span className="visit-cap-title">CRAFT &amp; POUR</span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>

          <div className="visit-editorial-rule" />

          {/* 5. MAP */}
          <div className="visit-block visit-map-section">
            <div className="visit-map-editorial-wrap">
              <iframe
                title="PRESS'D Wellness Café Location Map"
                src="https://maps.google.com/maps?q=Meydan%20Polo%20Residence%2C%20Nad%20Al%20Sheba%201%2C%20Dubai&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="visit-map-frame"
                loading="lazy"
                allowFullScreen
              />
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-map-float-cue"
              >
                Open in Maps ↗
              </a>
            </div>
          </div>

          <div className="visit-editorial-rule" />

          {/* 6. CONTACT INFORMATION (Single refined editorial information row, no cards, no icon circles) */}
          <div className="visit-block visit-contact-section">
            <div className="visit-contact-single-row">
              <a href="tel:+971501234567" className="visit-contact-editorial-item">
                <span className="visit-contact-micro-label">CALL</span>
                <span className="visit-contact-editorial-val">+971 50 123 4567</span>
              </a>

              <div className="visit-contact-editorial-sep" aria-hidden="true" />

              <a href="mailto:hello@pressd.cafe" className="visit-contact-editorial-item">
                <span className="visit-contact-micro-label">EMAIL</span>
                <span className="visit-contact-editorial-val">hello@pressd.cafe</span>
              </a>

              <div className="visit-contact-editorial-sep" aria-hidden="true" />

              <a
                href="https://www.instagram.com/pressd.cafe"
                target="_blank"
                rel="noopener noreferrer"
                className="visit-contact-editorial-item"
              >
                <span className="visit-contact-micro-label">INSTAGRAM</span>
                <span className="visit-contact-editorial-val">@pressd.cafe</span>
              </a>
            </div>
          </div>

          <div className="visit-editorial-rule" />

          {/* 7. GET IN TOUCH & PET DETAIL */}
          <div className="visit-block visit-closing-editorial">
            <div className="visit-closing-text-wrap">
              <span className="visit-micro-eyebrow">GET IN TOUCH</span>
              <h3 className="visit-closing-heading">We’d Love to Hear From You</h3>
              <p className="visit-closing-copy">
                For inquiries, collaborations or private events, feel free to reach out.
                Our team is always happy to connect and welcome you.
              </p>
            </div>

            <div className="visit-closing-pet-wrap" title="Pet friendly café with love">
              <PetLoveArt />
            </div>
          </div>
        </div>
      </div>

      <SectionHomeButton />
    </section>
  );
}
