"use client";

import { useBooking } from "@/components/booking/BookingContext";
import SectionHomeButton from "@/components/SectionHomeButton";

const MAPS_URL = "https://maps.app.goo.gl/PnBP3FGwKFWAP8VF8";

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

function MapsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l-6 2V6l6-2 6 2 6-2v14l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.2 4.8c.3-1 1.3-1.6 2.3-1.4l2.5.5c.9.2 1.5 1 1.5 1.9v2.3c0 .6-.3 1.2-.8 1.6l-1.3 1c1.1 2.4 3 4.3 5.4 5.4l1-1.3c.4-.5 1-.8 1.6-.8h2.3c.9 0 1.7.6 1.9 1.5l.5 2.5c.2 1-.4 2-1.4 2.3-1.1.3-2.3.5-3.5.5C8.4 20.8 3.2 15.6 3.2 9.3c0-1.2.2-2.4.5-3.5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/** Minimal continuous-line sketch of a cat and dog cuddling, with small hearts and
 * trailing paw prints — hand-plotted vector paths, gold-only, no fills on the figures. */
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
          stroke="var(--orange)"
          strokeWidth="2"
          opacity="0.9"
        />
        <path
          d="M258,82 C250,74 250,67 256,66 C259,65.5 258,69 258,71 C258,69 257,65.5 260,66 C266,67 266,74 258,82 Z"
          stroke="#c9922f"
          strokeWidth="1.6"
          opacity="0.7"
        />

        {/* Cat (left, sitting, facing right toward the dog) */}
        <path
          d="M118,260 C112,230 112,205 122,188 C128,176 136,168 146,165 C156,168 160,178 158,190 C170,195 182,205 190,218 C196,228 198,240 196,252 L196,260"
          stroke="var(--orange)"
          strokeWidth="2.4"
        />
        <path d="M134,166 L130,146 L146,160" stroke="var(--orange)" strokeWidth="2.2" />
        <path d="M150,163 L156,144 L166,160" stroke="var(--orange)" strokeWidth="2.2" />
        <path
          d="M196,255 C215,250 225,230 215,210 C208,196 190,192 180,200"
          stroke="var(--orange)"
          strokeWidth="2.2"
        />
        <circle cx="149" cy="179" r="1.7" fill="var(--orange)" stroke="none" />

        {/* Dog (right, sitting, facing left toward the cat) */}
        <circle cx="280" cy="168" r="27" stroke="#c9922f" strokeWidth="2.4" />
        <path
          d="M300,146 C315,152 318,172 306,186 C301,192 292,193 286,188"
          stroke="#c9922f"
          strokeWidth="2.2"
        />
        <path d="M256,182 C250,205 248,230 252,250 L254,260" stroke="#c9922f" strokeWidth="2.4" />
        <path
          d="M300,150 C330,148 365,160 385,185 C398,202 400,225 394,248 L390,260"
          stroke="#c9922f"
          strokeWidth="2.4"
        />
        <path
          d="M390,250 C404,242 408,226 400,214 C396,207 386,206 382,212"
          stroke="#c9922f"
          strokeWidth="2.2"
        />
        <circle cx="269" cy="160" r="2" fill="#c9922f" stroke="none" />
        <circle cx="258" cy="186" r="1.8" fill="#c9922f" stroke="none" />
      </g>

      {/* Trailing paw prints */}
      <g fill="var(--orange)">
        <g opacity="0.32" transform="translate(368 274) scale(0.9)">
          <ellipse cx="0" cy="6" rx="5" ry="4" />
          <ellipse cx="-5" cy="-2" rx="2" ry="2.6" />
          <ellipse cx="-1.5" cy="-5" rx="2" ry="2.6" />
          <ellipse cx="2.5" cy="-5" rx="2" ry="2.6" />
          <ellipse cx="6" cy="-2" rx="2" ry="2.6" />
        </g>
        <g opacity="0.22" transform="translate(394 285) scale(0.7)">
          <ellipse cx="0" cy="6" rx="5" ry="4" />
          <ellipse cx="-5" cy="-2" rx="2" ry="2.6" />
          <ellipse cx="-1.5" cy="-5" rx="2" ry="2.6" />
          <ellipse cx="2.5" cy="-5" rx="2" ry="2.6" />
          <ellipse cx="6" cy="-2" rx="2" ry="2.6" />
        </g>
        <g opacity="0.14" transform="translate(417 293) scale(0.55)">
          <ellipse cx="0" cy="6" rx="5" ry="4" />
          <ellipse cx="-5" cy="-2" rx="2" ry="2.6" />
          <ellipse cx="-1.5" cy="-5" rx="2" ry="2.6" />
          <ellipse cx="2.5" cy="-5" rx="2" ry="2.6" />
          <ellipse cx="6" cy="-2" rx="2" ry="2.6" />
        </g>
      </g>
    </svg>
  );
}

export default function VisitSection() {
  const { openBooking } = useBooking();

  return (
    <section className="visit section" id="visit" aria-label="Visit PRESS'D Wellness Café">
      <div className="visit-shell">
        {/* Intro */}
        <div className="visit-intro">
          <div className="visit-intro-head">
            <div className="visit-title-group">
              <p className="eyebrow">COME SAY HELLO</p>
              <h2 className="visit-heading">
                COME GET
                <br />
                <span className="accent">PRESS’D.</span>
              </h2>
            </div>

            <div className="visit-hours-card">
              <span className="visit-micro-tag">OPENING HOURS</span>
              <div className="visit-hours-details">
                <ClockIcon />
                <span className="visit-hours-day">Daily</span>
                <span className="visit-hours-time">7:00 AM – 10:00 PM</span>
              </div>
            </div>
          </div>

          <div className="visit-divider" />

          <p className="visit-intro-copy">
            Great coffee, fresh food and a welcoming space.
            <br />
            Visit us at Meydan Polo Residence, Dubai.
          </p>

          <div className="visit-actions">
            <button
              type="button"
              className="visit-cta-book"
              onClick={openBooking}
              aria-label="Book a table at PRESS'D"
            >
              Book a table <span>↗</span>
            </button>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-cta-directions"
              aria-label="Get directions to PRESS'D on Google Maps"
            >
              Get directions <span>→</span>
            </a>
          </div>
        </div>

        <div className="visit-divider" />

        {/* Location */}
        <div className="visit-location-card">
          <div className="visit-location-info">
            <span className="visit-micro-tag">LOCATION</span>
            <p className="visit-location-name">PRESS’D Wellness Café</p>
            <p className="visit-location-sub">Meydan Polo Residence, Dubai</p>
            <p className="visit-location-address">
              <PinIcon />
              <span>
                Meydan Polo Residence,
                <br />
                Nad Al Sheba 1, Dubai,
                <br />
                United Arab Emirates
              </span>
            </p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-maps-link"
            >
              <MapsIcon /> Open in maps <span>↗</span>
            </a>
          </div>
          <div className="visit-location-image">
            <img
              src="/assets/work-ambience-cover.webp"
              alt="Inside PRESS'D Wellness Café at Meydan Polo Residence"
              loading="lazy"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="visit-contact-row">
          <a href="tel:+971501234567" className="visit-contact-item">
            <PhoneIcon />
            <span>
              <span className="visit-contact-label">Call us</span>
              <span className="visit-contact-value">+971 50 123 4567</span>
            </span>
          </a>

          <a href="mailto:hello@pressd.cafe" className="visit-contact-item">
            <MailIcon />
            <span>
              <span className="visit-contact-label">Email us</span>
              <span className="visit-contact-value">hello@pressd.cafe</span>
            </span>
          </a>

          <a
            href="https://www.instagram.com/pressd.cafe"
            target="_blank"
            rel="noopener noreferrer"
            className="visit-contact-item"
          >
            <InstagramIcon />
            <span>
              <span className="visit-contact-label">Instagram</span>
              <span className="visit-contact-value">@pressd.cafe</span>
            </span>
          </a>
        </div>

        <div className="visit-divider" />

        {/* Get in touch */}
        <div className="visit-touch-banner">
          <div className="visit-touch-text">
            <span className="visit-micro-tag">GET IN TOUCH</span>
            <h3 className="visit-touch-heading">We’d Love to Hear From You</h3>
            <p className="visit-touch-copy">
              For inquiries, collaborations or private events, feel free to reach out.
              Our team will get back to you as soon as possible.
            </p>
          </div>
          <PetLoveArt />
        </div>
      </div>
      <SectionHomeButton />
    </section>
  );
}
