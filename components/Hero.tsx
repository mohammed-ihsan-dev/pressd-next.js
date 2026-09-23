"use client";

import { useEffect, useRef, useState } from "react";
import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";
import { useBooking } from "@/components/booking/BookingContext";
import { prefersReducedMotion } from "@/lib/utils";

const RAIL_LINKS = [
  { href: "#menu", label: "Menu", img: "/assets/menu-cover.webp", kind: "a" as const },
  { href: "#book", label: "Reservation", img: "/assets/reservation-cover.webp", kind: "book" as const },
  { href: "#about", label: "Our café", img: "/assets/our-cafe-cover.webp", kind: "a" as const },
  { href: "#pets", label: "Pet friendly", img: "/assets/pet-friendly-cover.webp", kind: "a" as const },
  { href: "#work", label: "Work ambience", img: "/assets/work-ambience-cover.webp", kind: "a" as const },
  { href: "#visit", label: "Visit us", video: "/assets/visit-location-cover.mp4", kind: "video" as const },
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
      if (mobile.matches && !prefersReducedMotion()) timer = window.setInterval(advance, 3200);
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
        <div className="hero-content">
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
            <a
              className="hero-round-link"
              href="https://www.instagram.com/pressd.cafe"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow PRESS'D Café on Instagram"
            >
              <img src="/assets/instagram-icon.webp" alt="Instagram" />
            </a>
          </div>
        </div>
      </div>
      <div className="hero-rail-head" aria-hidden="true">
        <span>Explore PRESS’D</span>
        <b>Swipe →</b>
      </div>
      <aside className="hero-rail" aria-label="Quick links" ref={heroRailRef}>
        {RAIL_LINKS.map((link) =>
          link.kind === "book" ? (
            <button key={link.label} className="rail-card" onClick={openBooking}>
              <img src={link.img} alt="A reserved table at PRESS'D Wellness Café" />
              <span>
                Reservation <b>→</b>
              </span>
            </button>
          ) : link.kind === "video" ? (
            <a
              key={link.label}
              className="rail-card"
              href={link.href}
              aria-label="Visit PRESS'D Wellness Café in Dubai"
              onClick={handleLink(link.href)}
            >
              <video autoPlay muted loop playsInline preload="metadata" poster="/assets/pressd-logo.webp" aria-hidden="true">
                <source src={link.video} type="video/mp4" />
              </video>
              <span>
                Visit us <b>→</b>
              </span>
            </a>
          ) : (
            <a key={link.label} className="rail-card" href={link.href} onClick={handleLink(link.href)}>
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
            onClick={() => setCarouselIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}
