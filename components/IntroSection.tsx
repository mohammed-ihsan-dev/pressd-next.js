import SectionHomeButton from "@/components/SectionHomeButton";

export default function IntroSection() {
  return (
    <section className="intro section" id="about">
      <p className="eyebrow dark">THE PRESS’D WAY</p>
      <div className="intro-grid">
        <h2>
          MORE THAN
          <br />
          <em>A CAFÉ.</em>
        </h2>
        <div>
          <p className="lead">
            Your everyday space to eat clean, get things done, slow down and spend time with your
            four-legged best friend.
          </p>
          <div className="facts">
            <span>Pet friendly</span>
            <span>Work friendly</span>
            <span>Wellness food</span>
            <span>Good coffee</span>
            <span>Good energy</span>
          </div>
        </div>
      </div>
      <SectionHomeButton />
    </section>
  );
}
