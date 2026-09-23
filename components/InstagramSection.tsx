const IMAGES = [
  { src: "/assets/coffee-matcha.webp", alt: "PRESS'D coffee" },
  { src: "/assets/pet-friendly-cafe.webp", alt: "Pet-friendly café life" },
  { src: "/assets/power-bowl.webp", alt: "PRESS'D power bowl" },
  { src: "/assets/work-ambience-cafe.webp", alt: "Working from PRESS'D" },
  { src: "/assets/smoothies.webp", alt: "Fresh smoothies" },
  { src: "/assets/avocado-toast.webp", alt: "Avocado breakfast" },
];

export default function InstagramSection() {
  return (
    <section className="instagram section">
      <div className="instagram-head reveal">
        <div>
          <p className="eyebrow dark">FOLLOW THE GOOD STUFF</p>
          <h2>@PRESSD_WELLNESS_CAFE</h2>
        </div>
        <p>
          Coffee. Wellness. Work. Dogs.
          <br />
          Basically everything we love.
        </p>
      </div>
      <div className="instagram-track">
        {IMAGES.map((image) => (
          <img key={image.src} src={image.src} alt={image.alt} />
        ))}
      </div>
      <a
        className="instagram-follow"
        href="https://www.instagram.com/pressd_wellness_cafe?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
        target="_blank"
        rel="noopener noreferrer"
      >
        Follow on Instagram →
      </a>
    </section>
  );
}
