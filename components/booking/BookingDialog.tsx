"use client";

import { useState } from "react";
import { useBooking } from "@/components/booking/BookingContext";

export default function BookingDialog() {
  const { dialogRef, closeBooking } = useBooking();
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <dialog
      className="booking"
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeBooking();
      }}
      onClose={() => {
        setSubmitted(false);
        setNote("");
      }}
    >
      <button className="dialog-close" aria-label="Close" onClick={closeBooking}>
        ×
      </button>
      <p className="eyebrow dark">SAVE YOUR SPOT</p>
      <h2>BOOK A TABLE.</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setNote("Thanks — we’ll call shortly to confirm your table.");
          setSubmitted(true);
        }}
      >
        <label>
          Name
          <input required placeholder="Your name" />
        </label>
        <label>
          Phone
          <input required type="tel" placeholder="+971" />
        </label>
        <div>
          <label>
            Date
            <input required type="date" />
          </label>
          <label>
            Guests
            <select>
              <option>2 guests</option>
              <option>3 guests</option>
              <option>4 guests</option>
              <option>5+ guests</option>
            </select>
          </label>
        </div>
        <button type="submit">{submitted ? "Request received ✓" : "Request table ↗"}</button>
        <p className="form-note" aria-live="polite">
          {note}
        </p>
      </form>
    </dialog>
  );
}
