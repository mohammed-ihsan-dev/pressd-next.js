// Live Google rating + reviews for the About page, via the official Places
// API (New) — server-side only. GOOGLE_PLACES_API_KEY has no NEXT_PUBLIC_
// prefix, so it is never inlined into client bundles; this module is only
// imported from app/page.tsx (a server component).

export type GoogleReview = {
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  reviewUri: string | null;
  flagUri: string | null;
};

export type GoogleReviewsData = {
  rating: number;
  reviewCount: number;
  mapsUri: string;
  review: GoogleReview | null;
};

// The official PRESS'D listing (same as VisitSection), used only if Google
// omits googleMapsUri from the response.
export const LISTING_URL =
  "https://www.google.com/maps/place/PRESS%E2%80%99D+Wellness+Caf%C3%A9/@25.1497789,55.2944217,17z/data=!4m6!3m5!1s0x3e5f69b12bacfaa1:0xf705edb34aadfb3c!8m2!3d25.1497789!4d55.2944217!16s%2Fg%2F11svlbgvyk";

// Ratings/reviews don't need to be fresher than this; the page is
// regenerated in the background at most this often (ISR).
export const GOOGLE_REVIEWS_REVALIDATE_SECONDS = 21600; // 6 hours

const FIELD_MASK = "rating,userRatingCount,googleMapsUri,reviews";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

type RawReview = {
  rating?: unknown;
  text?: { text?: unknown };
  relativePublishTimeDescription?: unknown;
  publishTime?: unknown;
  googleMapsUri?: unknown;
  flagContentUri?: unknown;
  authorAttribution?: { displayName?: unknown; uri?: unknown; photoUri?: unknown };
};

/**
 * Maps a Places API (New) Place Details response to what the About cards
 * render. Returns null unless the essentials (rating + count) are valid, so
 * the UI can fall back to its static content instead of showing bad data.
 * Of the reviews Google returns (up to 5, ordered by relevance), the most
 * recent one with text is chosen — the card states this ordering.
 */
export function parsePlaceDetails(json: unknown): GoogleReviewsData | null {
  if (!json || typeof json !== "object") return null;
  const place = json as { rating?: unknown; userRatingCount?: unknown; googleMapsUri?: unknown; reviews?: unknown };
  const rating = place.rating;
  const reviewCount = place.userRatingCount;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) return null;
  if (typeof reviewCount !== "number" || !Number.isInteger(reviewCount) || reviewCount <= 0) return null;

  const reviews = (Array.isArray(place.reviews) ? place.reviews : []).filter(
    (r): r is RawReview => r !== null && typeof r === "object",
  );
  const candidates = reviews
    .map((r) => {
      const authorName = str(r.authorAttribution?.displayName);
      const text = str(r.text?.text);
      const reviewRating = typeof r.rating === "number" ? Math.round(r.rating) : null;
      if (!authorName || !text || reviewRating === null || reviewRating < 1 || reviewRating > 5) return null;
      const published = Date.parse(str(r.publishTime) ?? "");
      return {
        published: Number.isNaN(published) ? 0 : published,
        review: {
          authorName,
          authorUri: str(r.authorAttribution?.uri),
          authorPhotoUri: str(r.authorAttribution?.photoUri),
          rating: reviewRating,
          text,
          relativeTime: str(r.relativePublishTimeDescription),
          reviewUri: str(r.googleMapsUri),
          flagUri: str(r.flagContentUri),
        } satisfies GoogleReview,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.published - a.published);

  return {
    rating,
    reviewCount,
    mapsUri: str(place.googleMapsUri) ?? LISTING_URL,
    review: candidates[0]?.review ?? null,
  };
}

/** Never throws: any missing config or API/network failure returns null. */
export async function getGoogleReviews(): Promise<GoogleReviewsData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
      {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
        next: { revalidate: GOOGLE_REVIEWS_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      console.error(`[google-reviews] Places API responded ${res.status}`);
      return null;
    }
    return parsePlaceDetails(await res.json());
  } catch (error) {
    console.error(`[google-reviews] request failed: ${error instanceof Error ? error.name : "unknown"}`);
    return null;
  }
}
