"use client";

import { useSectionLinkHandler } from "@/components/navigation/SectionNavContext";
import SectionHomeButton from "@/components/SectionHomeButton";

export default function PetFriendlySection() {
  const handleLink = useSectionLinkHandler();
  return (
    <section className="pet-premium section" id="pets">
      <div className="pet-min-grid">
        <figure className="pet-min-image reveal">
          <img
            src="/assets/pet-friendly-cafe.webp"
            alt="Customer enjoying coffee with a dog at PRESS'D café"
            loading="lazy"
          />
          <figcaption>PRESS&apos;D · DUBAI</figcaption>
        </figure>
        <div className="pet-min-copy reveal">
          <p className="pet-min-kicker">PET FRIENDLY · OUTDOOR SEATING · WATER FOR PETS</p>
          <h2>
            PAWS ARE
            <br />
            <em>WELCOME.</em>
          </h2>
          <h3>Good coffee tastes even better with your best friend beside you.</h3>
          <p>
            A genuinely pet-friendly café where humans and their four-legged companions can relax,
            meet and stay awhile.
          </p>
          <div className="pet-min-tags">
            <span>Pets welcome</span>
            <span>Outdoor seating</span>
            <span>Water for pets</span>
            <span>Good vibes</span>
          </div>
          <a href="#visit" onClick={handleLink("#visit")}>
            Visit with your pet <b>↗</b>
          </a>
        </div>
      </div>
      <SectionHomeButton />
    </section>
  );
}
