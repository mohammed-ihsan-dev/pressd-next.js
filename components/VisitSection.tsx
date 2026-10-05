"use client";

import { useBooking } from "@/components/booking/BookingContext";
import SectionHomeButton from "@/components/SectionHomeButton";

const MAPS_URL =
  "https://www.google.com/maps/place/PRESS%E2%80%99D+Wellness+Caf%C3%A9/@25.1497789,55.2944217,17z/data=!4m6!3m5!1s0x3e5f69b12bacfaa1:0xf705edb34aadfb3c!8m2!3d25.1497789!4d55.2944217!16s%2Fg%2F11svlbgvyk";

const SCHEDULE = [
  { day: "MON", hours: "7:00 AM — 10:00 PM" },
  { day: "TUE", hours: "7:00 AM — 10:00 PM" },
  { day: "WED", hours: "7:00 AM — 10:00 PM" },
  { day: "THU", hours: "7:00 AM — 10:00 PM" },
  { day: "FRI", hours: "7:00 AM — 10:00 PM" },
  { day: "SAT & SUN", hours: "7:00 AM — 10:00 PM" },
];

const GALLERY_IMAGES = [
  {
    src: "/assets/visit-lifestyle-sofa.webp",
    alt: "Guest relaxing on lounge sofa inside PRESS'D café",
  },
  {
    src: "/assets/sandwich-halloumi-pesto.webp",
    alt: "Freshly prepared wholesome dish at PRESS'D",
  },
  {
    src: "/assets/visit-service-counter.webp",
    alt: "Barista preparing specialty coffee at the espresso counter",
  },
  {
    src: "/assets/visit-coffee-detail.webp",
    alt: "Craft coffee pour with signature latte art on handcrafted wood tray",
  },
];

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
      <div className="visit-grid">
        {/* 1. UPPER LEFT: OPENING HOURS PANEL */}
        <div className="visit-panel visit-hours-panel">
          <div className="visit-panel-header">
            <span className="visit-line-dec" aria-hidden="true" />
            <div className="visit-heading-wrap">
              <span className="visit-micro-eyebrow">EDITORIAL TIMETABLE</span>
              <h2 className="visit-panel-serif-title">
                <span>OPENING</span>
                <span>HOURS</span>
              </h2>
            </div>
            <span className="visit-line-dec" aria-hidden="true" />
          </div>

          <div className="visit-schedule-list">
            {SCHEDULE.map((item) => (
              <div key={item.day} className="visit-schedule-row">
                <span className="visit-schedule-day">{item.day}</span>
                <span className="visit-schedule-dots" aria-hidden="true" />
                <span className="visit-schedule-time">{item.hours}</span>
              </div>
            ))}
          </div>

          <div className="visit-hours-footer">
            <p className="visit-hours-service-note">Dine-in &amp; Takeaway · All week</p>
            <p className="visit-hours-narrative">
              Clean ingredients, mindful rituals, and an open sunlit sanctuary.
              Whether you are stopping by for your morning brew or lingering over wholesome fare,
              our doors are always open at Muscat St, Nad Al Sheba 1, Dubai.
            </p>

            <div className="visit-action-group">
              <button
                type="button"
                className="visit-btn-book"
                onClick={openBooking}
                aria-label="Book a table at PRESS'D"
              >
                BOOK A TABLE <span>↗</span>
              </button>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-link-directions"
                aria-label="Get directions to PRESS'D on Google Maps"
              >
                GET DIRECTIONS <span>→</span>
              </a>
            </div>
          </div>
        </div>

        {/* 2. UPPER RIGHT: 2x2 IMAGE GALLERY */}
        <div className="visit-gallery-grid" aria-label="Café gallery">
          {GALLERY_IMAGES.map((img, i) => (
            <figure key={i} className="visit-gallery-tile">
              <img src={img.src} alt={img.alt} loading="lazy" />
            </figure>
          ))}
        </div>

        {/* 3. LOWER LEFT: MAP / LOCATION PANEL */}
        <div className="visit-panel visit-map-panel">
          <div className="visit-map-header">
            <div>
              <span className="visit-micro-eyebrow">LOCATION</span>
              <h3 className="visit-location-title">PRESS’D Wellness Café</h3>
              <p className="visit-location-text">
                47XV+XQ2 · Muscat St · Nad Al Sheba 1, Dubai · UAE
              </p>
            </div>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-map-route-cta"
              aria-label="Show route to PRESS'D on Google Maps"
            >
              SHOW ROUTE <span>→</span>
            </a>
          </div>

          <div className="visit-map-viewport">
            <iframe
              title="PRESS'D Wellness Café Google Maps Location"
              src="https://maps.google.com/maps?q=PRESS%E2%80%99D%20Wellness%20Caf%C3%A9&ftid=0x3e5f69b12bacfaa1:0xf705edb34aadfb3c&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="visit-map-iframe"
              loading="lazy"
              allowFullScreen
            />
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-map-badge"
              aria-label="Open in Google Maps"
            >
              OPEN IN MAPS ↗
            </a>
          </div>
        </div>

        {/* 4. LOWER RIGHT: GET IN TOUCH PANEL */}
        <div className="visit-panel visit-touch-panel">
          <div className="visit-touch-head">
            <span className="visit-micro-eyebrow">CONNECT WITH US</span>
            <h2 className="visit-panel-serif-title">
              <span>GET IN</span>
              <span>TOUCH</span>
            </h2>
            <div className="visit-title-divider" aria-hidden="true" />
          </div>

          <div className="visit-contact-entries">
            <div className="visit-contact-entry">
              <span className="visit-entry-label">ADDRESS</span>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="visit-entry-val visit-entry-address-link"
                title="View 47XV+XQ2 Muscat St on Google Maps"
              >
                47XV+XQ2, Muscat St<br />
                Nad Al Sheba 1, Nad Al Sheba<br />
                Dubai, United Arab Emirates
              </a>
            </div>

            <div className="visit-contact-entry">
              <span className="visit-entry-label">PHONE</span>
              <a href="tel:+971501234567" className="visit-entry-link">
                +971 50 123 4567
              </a>
            </div>

            <div className="visit-contact-entry">
              <span className="visit-entry-label">EMAIL</span>
              <a href="mailto:hello@pressd.cafe" className="visit-entry-link">
                hello@pressd.cafe
              </a>
            </div>

            <div className="visit-contact-entry">
              <span className="visit-entry-label">FOLLOW</span>
              <a
                href="https://www.instagram.com/pressd.cafe"
                target="_blank"
                rel="noopener noreferrer"
                className="visit-entry-link visit-entry-instagram"
              >
                <svg
                  className="visit-insta-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--orange, #fbb019)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>@pressd.cafe</span>
              </a>
            </div>
          </div>

          <div className="visit-touch-signature">
            <p className="visit-touch-note">
              For inquiries, collaborations or private events, feel free to reach out. Our team will get back to you as soon as possible.
            </p>
            <div className="visit-pet-sig-wrap" title="Pet friendly café with love">
              <PetLoveArt />
            </div>
          </div>
        </div>

        {/* 5. BOTTOM ROW: BRAND COLOPHON */}
        <div className="visit-colophon-bar">
          <span className="visit-colophon-loc">47XV+XQ2 · MUSCAT ST · NAD AL SHEBA 1 · DUBAI</span>
          <span className="visit-colophon-sep" aria-hidden="true">◇</span>
          <span className="visit-colophon-tag">WELLNESS CAFÉ &amp; SPECIALTY ROASTS</span>
          <span className="visit-colophon-sep" aria-hidden="true">◇</span>
          <span className="visit-colophon-copy">© PRESS’D · ALL RIGHTS RESERVED</span>
        </div>
      </div>

      <SectionHomeButton />
    </section>
  );
}
