"use client";

import { useRef, useState } from "react";

const IMAGES = [
  { src: "/assets/coffee-matcha.webp", alt: "Coffee and matcha" },
  { src: "/assets/power-bowl.webp", alt: "Colourful bowl" },
  { src: "/assets/smoothies.webp", alt: "Fresh smoothies" },
  { src: "/assets/avocado-toast.webp", alt: "Avocado toast" },
];

export default function GallerySection() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<{ src: string; alt: string } | null>(null);

  const open = (image: { src: string; alt: string }) => {
    setActive(image);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <section className="gallery section">
        <div className="gallery-head">
          <div>
            <p className="eyebrow">FROM OUR TABLE</p>
            <h2>
              THE GOOD
              <br />
              <em>STUFF.</em>
            </h2>
          </div>
          <p>
            @pressd.cafe
            <br />
            Meydan Polo Residence, Dubai
          </p>
        </div>
        <div className="gallery-grid">
          {IMAGES.map((image) => (
            <button key={image.src} onClick={() => open(image)}>
              <img src={image.src} alt={image.alt} loading="lazy" />
            </button>
          ))}
        </div>
      </section>
      <dialog
        className="lightbox"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <button className="dialog-close" aria-label="Close" onClick={() => dialogRef.current?.close()}>
          ×
        </button>
        {active && <img src={active.src} alt={active.alt} />}
      </dialog>
    </>
  );
}
