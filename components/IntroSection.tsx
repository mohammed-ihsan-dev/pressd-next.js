"use client";

import SectionHomeButton from "@/components/SectionHomeButton";

const PILLARS = [
  {
    index: "01",
    name: "Clean Nourishment",
    desc: "Whole ingredients, nutrient-dense bowls and fresh unrefined recipes made to keep you feeling vibrant.",
  },
  {
    index: "02",
    name: "Specialty Roasts",
    desc: "Ethically sourced coffees pulled with care, from silky flat whites to artisanal pour-overs.",
  },
  {
    index: "03",
    name: "Best Friends Invited",
    desc: "A welcoming café where humans and their four-legged companions can relax, connect and stay awhile.",
  },
];

const FEATURES = ["Pet Friendly", "Work Friendly", "Wellness Food", "Good Coffee", "Good Energy"];

export default function IntroSection() {
  return (
    <section className="intro about-panel section" id="about" aria-label="About PRESS'D Wellness Café">
      <div className="about-grid">
        {/* Headline tile: title pinned top, lead pinned bottom */}
        <div className="about-tile about-tile-intro">
          <div>
            <p className="about-micro-eyebrow">THE PRESS’D WAY</p>
            <h2 className="about-headline">
              <span className="about-head-sans">MORE THAN</span>
              <span className="about-head-serif">A CAFÉ.</span>
            </h2>
          </div>
          <div>
            <p className="about-lead-statement">
              Your everyday space to eat clean, get things done, slow down and spend time with your four-legged best friend.
            </p>
            <p className="about-features" aria-label="Café features">
              {FEATURES.map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </p>
          </div>
          <SectionHomeButton />
        </div>

        <figure className="about-tile about-tile-photo about-tile-photo-cafe">
          <img src="/assets/our-cafe-cover.webp" alt="A PRESS’D flat white on a dark table" loading="lazy" />
        </figure>

        {/* The Philosophy: three equal tiles */}
        {PILLARS.map((pillar) => (
          <div className="about-tile about-tile-pillar" key={pillar.index}>
            <span className="about-pillar-index">{pillar.index}</span>
            <div>
              <h3 className="about-pillar-name">{pillar.name}</h3>
              <p className="about-pillar-desc">{pillar.desc}</p>
            </div>
          </div>
        ))}

        <figure className="about-tile about-tile-photo about-tile-photo-ambience">
          <img src="/assets/work-ambience-cafe.webp" alt="Guests working and relaxing inside PRESS’D" loading="lazy" />
        </figure>

        {/* Our Story tile */}
        <div className="about-tile about-tile-story">
          <span className="about-col-label">OUR STORY</span>
          <div>
            <h3 className="about-story-title">A Space Made for Good Days</h3>
            <p className="about-story-text">
              PRESS’D was created around the idea that good food, good coffee and good energy belong together. Born at
              Meydan Polo Residence, we built an unhurried sanctuary where nutrition meets uncompromising flavour. A
              thoughtfully crafted space for morning rituals, productive afternoons, and genuine community.
            </p>
          </div>
        </div>

        {/* Footer strip */}
        <div className="about-tile about-colophon">
          <span className="about-colophon-loc">MEYDAN POLO RESIDENCE · NAD AL SHEBA 1 · DUBAI</span>
          <span className="about-colophon-sep" aria-hidden="true">◇</span>
          <span className="about-colophon-copy">© PRESS’D WELLNESS CAFÉ</span>
          <img
            src="/website-pet-icon.png"
            alt=""
            className="about-pet-mark"
            width="36"
            height="36"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
