"use client";

import { useBooking } from "@/components/booking/BookingContext";
import SectionHomeButton from "@/components/SectionHomeButton";

const MAPS_URL = "https://maps.app.goo.gl/PnBP3FGwKFWAP8VF8";

export default function VisitSection() {
  const { openBooking } = useBooking();

  return (
    <section className="visit section" id="visit" aria-label="Visit PRESS'D Wellness Café">
      <div className="visit-shell">
        {/* Top Block: Title & Opening Hours */}
        <div className="visit-top-block">
          <div className="visit-title-group">
            <p className="eyebrow dark">COME SAY HELLO</p>
            <h2 className="visit-heading">
              COME GET
              <br />
              <span className="accent">PRESS’D.</span>
            </h2>
          </div>

          <div className="visit-hours-card">
            <span className="visit-micro-tag">OPENING HOURS</span>
            <div className="visit-hours-details">
              <span className="visit-hours-day">Daily</span>
              <span className="visit-hours-time">7:00 AM — 10:00 PM</span>
            </div>
          </div>
        </div>

        {/* Middle Block: Location & CTAs */}
        <div className="visit-middle-block">
          <div className="visit-location-info">
            <span className="visit-micro-tag">LOCATION</span>
            <p className="visit-location-name">PRESS’D Wellness Café</p>
            <p className="visit-location-sub">Meydan Polo Residence, Dubai</p>
          </div>

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

        {/* Bottom Block: Compact Map Video + Contact Info */}
        <div className="visit-bottom-grid">
          {/* Map Video Preview */}
          <a
            className="visit-map-card"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open PRESS'D location in Google Maps"
          >
            <video
              className="visit-map-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src="/assets/visit-location-cover.mp4" type="video/mp4" />
            </video>
            <div className="visit-map-overlay">
              <span className="visit-map-badge">MAP · OPEN IN MAPS ↗</span>
              <p className="visit-map-title">
                MEYDAN POLO
                <br />
                RESIDENCE
              </p>
            </div>
          </a>

          {/* Contact / Get In Touch */}
          <div className="visit-contact-card">
            <span className="visit-micro-tag">GET IN TOUCH</span>
            <div className="visit-contact-list">
              <div className="visit-contact-row">
                <span className="visit-contact-k">ADDRESS</span>
                <p className="visit-contact-v">
                  PRESS’D Wellness Café
                  <br />
                  Meydan Polo Residence, Dubai
                </p>
              </div>

              <div className="visit-contact-row">
                <span className="visit-contact-k">EMAIL</span>
                <a href="mailto:hello@pressd.cafe" className="visit-contact-link">
                  hello@pressd.cafe
                </a>
              </div>

              <div className="visit-contact-row">
                <span className="visit-contact-k">FOLLOW</span>
                <a
                  href="https://www.instagram.com/pressd.cafe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="visit-contact-link visit-social-link"
                  aria-label="Follow PRESS'D Café on Instagram"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
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
          </div>
        </div>
      </div>
      <SectionHomeButton />
    </section>
  );
}
