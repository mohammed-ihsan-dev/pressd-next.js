"use client";

import { useEffect, useRef, useState } from "react";
import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";
import { useBooking } from "@/components/booking/BookingContext";
import { prefersReducedMotion } from "@/lib/utils";

const RAIL_LINKS = [
  { href: "#menu", label: "Menu", img: "/assets/menu-cover.webp", kind: "a" as const },
  { href: "#book", label: "Reservation", img: "/assets/work-ambience-cover.webp", kind: "book" as const },
  { href: "#about", label: "Our café", img: "/assets/our-cafe-cover.webp", kind: "a" as const },
];

export default function Hero() {
  const heroMediaRef = useRef<HTMLVideoElement>(null);
  const heroRailRef = useRef<HTMLElement>(null);
  const handleLink = useSectionLinkHandler();
  const { openBooking } = useBooking();
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Play the hero video from its beginning once mounted (matches original timing).
  useEffect(() => {
    const video = heroMediaRef.current;
    if (!video || prefersReducedMotion()) return;
    video.defaultPlaybackRate = 1;
    video.playbackRate = 1;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  // Mobile auto-advancing carousel over the hero-rail cards.
  useEffect(() => {
    const rail = heroRailRef.current;
    if (!rail) return;
    const mobile = matchMedia("(max-width:760px)");
    const cards = [...rail.querySelectorAll<HTMLElement>(".rail-card")];
    if (!cards.length) return;
    let timer = 0;
    let resumeTimer = 0;

    const goTo = (index: number) => {
      const next = (index + cards.length) % cards.length;
      setCarouselIndex(next);
      cards[next]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };
    const advance = () => {
      if (!mobile.matches || document.hidden) return;
      goTo(carouselIndex + 1);
    };
    const start = () => {
      clearInterval(timer);
      if (mobile.matches && !prefersReducedMotion()) timer = window.setInterval(advance, 3400);
    };
    const pause = () => {
      clearInterval(timer);
      clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(start, 6500);
    };
    rail.addEventListener("pointerdown", pause, { passive: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : start()));
    mobile.addEventListener("change", start);
    start();
    return () => {
      clearInterval(timer);
      clearTimeout(resumeTimer);
      rail.removeEventListener("pointerdown", pause);
      mobile.removeEventListener("change", start);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="hero" id="home">
      <div className="hero-main">
        <video
          ref={heroMediaRef}
          className="hero-media"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="Cinematic PRESS'D café experience"
        >
          <source src="/assets/pressd-hero-cinematic.mp4?v=2" type="video/mp4" />
        </video>
        <div className="hero-shade" />

        {/* Instagram Icon: positioned on top-right of video */}
        <a
          className="hero-round-link"
          href="https://www.instagram.com/pressd.cafe"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow PRESS'D Café on Instagram"
        >
          <svg
            className="instagram-icon-svg"
            width="22"
            height="22"
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
        </a>

        <div className="hero-content">
          <div className="hero-content-left">
            <p className="eyebrow">WELLNESS CAFÉ · MEYDAN POLO RESIDENCE</p>
            <h1>
              <span>GOOD FOOD.</span>
              <span className="accent">BETTER DAYS.</span>
            </h1>
            <div className="hero-bottom">
              <p>
                Clean ingredients. Bold flavour.
                <br />
                Made to keep you feeling good.
              </p>
            </div>
          </div>
        </div>

        {/* Static decorative pet artwork, anchored relative to hero-main */}
        <a
          className="hero-pet-float"
          href="#pets"
          onClick={handleLink("#pets")}
          aria-label="Pet friendly — see our Pet Friendly page"
        >
          <img src="/website-pet-icon.png" alt="" />
        </a>
      </div>

      <div className="hero-rail-head" aria-hidden="true">
        <span>Explore PRESS’D</span>
        <b>Swipe →</b>
      </div>

      <aside className="hero-rail" aria-label="Quick links" ref={heroRailRef}>
        {RAIL_LINKS.map((link) =>
          link.kind === "book" ? (
            <button key={link.label} className="rail-card" onClick={openBooking}>
              <img src={link.img} alt="Intimate table reservation at PRESS'D Wellness Café" />
              <span>
                {link.label} <b className="gold-btn">→</b>
              </span>
            </button>
          ) : (
            <a
              key={link.label}
              className="rail-card"
              href={link.href}
              onClick={handleLink(link.href)}
            >
              <img src={link.img} alt={`PRESS'D ${link.label}`} />
              <span>
                {link.label} <b>→</b>
              </span>
            </a>
          )
        )}
      </aside>

      <div className="hero-carousel-dots" aria-label="Explore slide position">
        {RAIL_LINKS.map((link, index) => (
          <button
            key={link.label}
            type="button"
            aria-label={`Show ${link.label}`}
            aria-current={carouselIndex === index}
            className={carouselIndex === index ? "active" : undefined}
            onClick={() => {
              setCarouselIndex(index);
              const rail = heroRailRef.current;
              const cards = rail?.querySelectorAll<HTMLElement>(".rail-card");
              cards?.[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }}
          />
        ))}
      </div>
    </section>
  );
}
