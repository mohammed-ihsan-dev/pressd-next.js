"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface BookingContextValue {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  openBooking: () => void;
  closeBooking: () => void;
  submitted: boolean;
  setSubmitted: (value: boolean) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const openBooking = useCallback(() => dialogRef.current?.showModal(), []);
  const closeBooking = useCallback(() => dialogRef.current?.close(), []);

  return (
    <BookingContext.Provider
      value={{ dialogRef, openBooking, closeBooking, submitted, setSubmitted }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
