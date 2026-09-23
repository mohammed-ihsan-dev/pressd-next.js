const CARDS = [
  { num: "01", title: "Bring your pet", copy: "A café where your best friend is actually invited." },
  { num: "02", title: "Bring your laptop", copy: "Stay productive without feeling like you’re at work." },
  {
    num: "03",
    title: "Bring your appetite",
    copy: "Balanced food made for energy, flavour and everyday wellness.",
  },
];

export default function WhySection() {
  return (
    <section className="why section" aria-labelledby="why-title">
      <div className="why-head reveal">
        <p className="eyebrow dark">WHY PRESS&apos;D</p>
        <h2 id="why-title">
          BRING YOUR
          <br />
          WHOLE DAY.
        </h2>
      </div>
      <div className="why-grid">
        {CARDS.map((card) => (
          <article className="why-card reveal" key={card.num}>
            <b>{card.num}</b>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
