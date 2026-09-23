"use client";

import { useBooking } from "@/components/booking/BookingContext";
import SectionHomeButton from "@/components/SectionHomeButton";

const MAPS_URL = "https://maps.app.goo.gl/PnBP3FGwKFWAP8VF8";

export default function VisitSection() {
  const { openBooking } = useBooking();
  return (
    <section className="visit section" id="visit">
      <div>
        <p className="eyebrow dark">COME SAY HELLO</p>
        <h2>
          COME GET
          <br />
          <em>PRESS’D.</em>
        </h2>
      </div>
      <div className="visit-info">
        <div>
          <small>OPENING HOURS</small>
          <p>
            Daily <b>7:00 AM – 10:00 PM</b>
          </p>
        </div>
        <div>
          <small>FIND US</small>
          <p>
            PRESS&apos;D Wellness Café
            <br />
            Meydan Polo Residence, Dubai
          </p>
        </div>
        <div className="visit-actions">
          <button onClick={openBooking}>Book a table ↗</button>
          <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
            Get directions ↗
          </a>
        </div>
      </div>
      <a
        className="map-art visit-video-cover"
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open PRESS'D location in Google Maps"
      >
        <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true">
          <source src="/assets/visit-location-cover.mp4" type="video/mp4" />
        </video>
        <span>PRESS’D · OPEN IN MAPS ↗</span>
        <b>
          MEYDAN POLO
          <br />
          RESIDENCE
        </b>
      </a>
      <SectionHomeButton />
    </section>
  );
}
