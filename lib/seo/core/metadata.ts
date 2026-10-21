// Page metadata overrides: validation and merging over the code defaults.
// Pure module (no Next imports) so the public layout and tests can share it.

export const META_FIELDS = ["title", "description", "canonical", "robots", "ogTitle", "ogDescription", "ogImage"] as const;
export type MetaField = (typeof META_FIELDS)[number];
export type MetaOverride = Partial<Record<MetaField, string>>;

export const ROBOTS_OPTIONS = ["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"] as const;

const LIMITS: Record<MetaField, number> = { title: 120, description: 320, canonical: 500, robots: 40, ogTitle: 120, ogDescription: 320, ogImage: 500 };

export class MetadataValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

/**
 * Validates an override. Empty strings mean "use the default". Text may not
 * contain markup or control characters; URLs must belong to the verified site.
 */
export function validateOverride(input: Record<string, unknown>, site: URL): MetaOverride {
  const out: MetaOverride = {};
  for (const key of Object.keys(input)) if (!(META_FIELDS as readonly string[]).includes(key)) throw new MetadataValidationError(key, `Unknown field ${key}`);
  for (const f of META_FIELDS) {
    const v = input[f];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") throw new MetadataValidationError(f, "Must be text");
    const s = v.replace(/\s+/g, " ").trim();
    if (!s) continue;
    if (s.length > LIMITS[f]) throw new MetadataValidationError(f, `At most ${LIMITS[f]} characters`);
    if (/[\u0000-\u001f\u007f<>]/.test(v.replace(/[\n\t]/g, " "))) throw new MetadataValidationError(f, "Angle brackets and control characters are not allowed");
    if (f === "robots") {
      if (!(ROBOTS_OPTIONS as readonly string[]).includes(s)) throw new MetadataValidationError(f, `Must be one of: ${ROBOTS_OPTIONS.join(" | ")}`);
    } else if (f === "canonical" || f === "ogImage") {
      let u: URL;
      try {
        u = new URL(s, site.origin);
      } catch {
        throw new MetadataValidationError(f, "Not a valid URL");
      }
      if (u.protocol !== "https:" || u.host !== site.host || u.username || u.password) throw new MetadataValidationError(f, `Must be a https URL on ${site.host}`);
      if (f === "canonical" && (u.search || u.hash)) throw new MetadataValidationError(f, "Canonical must not include a query string or fragment");
      out[f] = u.toString();
      continue;
    }
    out[f] = s;
  }
  return out;
}

/**
 * Layers an override onto a Next.js Metadata object (typed structurally so
 * this module does not import Next). Unset fields keep the base values.
 */
export function applyOverride<T extends object>(base: T, o: MetaOverride | null | undefined): T {
  if (!o || !Object.keys(o).length) return base;
  const b = base as Record<string, unknown>;
  const m: Record<string, unknown> = { ...b };
  if (o.title) m.title = o.title;
  if (o.description) m.description = o.description;
  if (o.canonical) m.alternates = { ...((b.alternates as object | null | undefined) ?? {}), canonical: o.canonical };
  if (o.robots) {
    const [index, follow] = o.robots.split(",").map((x) => x.trim());
    m.robots = { index: index === "index", follow: follow === "follow" };
  }
  if (o.ogTitle || o.ogDescription || o.ogImage) {
    m.openGraph = {
      ...((b.openGraph as object | null | undefined) ?? {}),
      ...(o.ogTitle ? { title: o.ogTitle } : {}),
      ...(o.ogDescription ? { description: o.ogDescription } : {}),
      ...(o.ogImage ? { images: [{ url: o.ogImage }] } : {}),
    };
  }
  return m as T;
}

/** Characters/pixels are approximations; Google decides what it actually shows. */
export function snippetPreview(title: string, description: string) {
  return {
    title: title.length > 60 ? title.slice(0, 57).trimEnd() + "…" : title,
    description: description.length > 158 ? description.slice(0, 155).trimEnd() + "…" : description,
    titleTruncated: title.length > 60,
    descriptionTruncated: description.length > 158,
  };
}
