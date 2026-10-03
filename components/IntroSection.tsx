"use client";

import SectionHomeButton from "@/components/SectionHomeButton";

export default function IntroSection() {
  return (
    <section className="intro about-panel section" id="about" aria-label="About PRESS'D Wellness Café">
      <div className="about-editorial-wrap">
        {/* Top Header / Headline */}
        <div className="about-intro-block">
          <p className="about-micro-eyebrow">THE PRESS’D WAY</p>
          <h2 className="about-headline">
            <span className="about-head-sans">MORE THAN</span>
            <span className="about-head-serif">A CAFÉ.</span>
          </h2>
          <p className="about-lead-statement">
            Your everyday space to eat clean, get things done, slow down and spend time with your four-legged best friend.
          </p>

          {/* Understated Editorial Metadata Tags */}
          <div className="about-meta-tags" aria-label="Café features">
            <span className="about-meta-pill">Pet Friendly</span>
            <span className="about-meta-pill">Work Friendly</span>
            <span className="about-meta-pill">Wellness Food</span>
            <span className="about-meta-pill">Good Coffee</span>
            <span className="about-meta-pill">Good Energy</span>
          </div>
        </div>

        <div className="about-hairline" role="separator" />

        {/* Story & Philosophy Editorial Composition */}
        <div className="about-body-spread">
          {/* Left Column: Brand Story */}
          <div className="about-story-col">
            <span className="about-col-label">OUR STORY</span>
            <h3 className="about-story-title">A Space Made for Good Days</h3>
            <p className="about-story-text">
              PRESS’D was created around the idea that good food, good coffee and good energy belong together.
            </p>
            <p className="about-story-subtext">
              Born at Meydan Polo Residence, we built an unhurried sanctuary where nutrition meets uncompromising flavour. A thoughtfully crafted space for morning rituals, productive afternoons, and genuine community.
            </p>
          </div>

          {/* Right Column: Values / Editorial Pillars */}
          <div className="about-values-col">
            <span className="about-col-label">THE PHILOSOPHY</span>
            <div className="about-pillars">
              <div className="about-pillar-row">
                <span className="about-pillar-index">01</span>
                <div className="about-pillar-content">
                  <h4 className="about-pillar-name">Clean Nourishment</h4>
                  <p className="about-pillar-desc">
                    Whole ingredients, nutrient-dense bowls and fresh unrefined recipes made to keep you feeling vibrant.
                  </p>
                </div>
              </div>

              <div className="about-pillar-row">
                <span className="about-pillar-index">02</span>
                <div className="about-pillar-content">
                  <h4 className="about-pillar-name">Specialty Roasts</h4>
                  <p className="about-pillar-desc">
                    Ethically sourced coffees pulled with care, from silky flat whites to artisanal pour-overs.
                  </p>
                </div>
              </div>

              <div className="about-pillar-row">
                <span className="about-pillar-index">03</span>
                <div className="about-pillar-content">
                  <h4 className="about-pillar-name">Best Friends Invited</h4>
                  <p className="about-pillar-desc">
                    A welcoming café where humans and their four-legged companions can relax, connect and stay awhile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Colophon / Restrained Brand Detail */}
        <div className="about-colophon">
          <div className="about-colophon-left">
            <span className="about-colophon-loc">MEYDAN POLO RESIDENCE · NAD AL SHEBA 1 · DUBAI</span>
            <span className="about-colophon-copy">© PRESS’D WELLNESS CAFÉ</span>
          </div>
          <div className="about-colophon-right">
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
      </div>

      <SectionHomeButton />
    </section>
  );
}
