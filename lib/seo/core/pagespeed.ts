// PageSpeed Insights v5 — request building and response normalisation. Pure module.
// Lab data = one Lighthouse run in Google's data centre (simulated device/network).
// Field data = Chrome UX Report p75 from real visitors over the last 28 days,
// present only when Google has enough traffic for the URL (or origin).

export type Strategy = "mobile" | "desktop";
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;

export function buildPsiUrl(target: string, strategy: Strategy, apiKey: string | null): string {
  const u = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  u.searchParams.set("url", target);
  u.searchParams.set("strategy", strategy);
  for (const c of CATEGORIES) u.searchParams.append("category", c);
  if (apiKey) u.searchParams.set("key", apiKey);
  return u.toString();
}

export interface FieldMetric {
  p75: number; // ms for LCP/INP/FCP/TTFB; unitless for CLS
  category: string | null; // FAST | AVERAGE | SLOW (Google's labels)
}

export interface PsiResult {
  url: string;
  finalUrl: string | null;
  strategy: Strategy;
  analysisAt: string | null;
  lighthouseVersion: string | null;
  scores: Record<(typeof CATEGORIES)[number], number | null>; // 0–100
  lab: {
    lcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    fcpMs: number | null;
    speedIndexMs: number | null;
  };
  field: {
    source: "url" | "origin";
    overall: string | null;
    lcp: FieldMetric | null;
    inp: FieldMetric | null;
    cls: FieldMetric | null;
    fcp: FieldMetric | null;
    ttfb: FieldMetric | null;
  } | null;
  opportunities: { id: string; title: string; savingsMs: number | null; displayValue: string | null }[];
  diagnostics: { id: string; title: string; displayValue: string | null }[];
  failing: Record<string, { id: string; title: string }[]>; // accessibility / best-practices / seo audits scoring 0
  warnings: string[];
}

type Json = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function fieldMetric(metrics: Json | undefined, key: string, scale = 1): FieldMetric | null {
  const m = metrics?.[key] as Json | undefined;
  const p = num(m?.percentile);
  if (p === null) return null;
  return { p75: p / scale, category: str(m?.category) };
}

export function parsePsi(json: Json, strategy: Strategy): PsiResult {
  const lh = (json.lighthouseResult ?? {}) as Json;
  const cats = (lh.categories ?? {}) as Record<string, Json>;
  const audits = (lh.audits ?? {}) as Record<string, Json>;
  const audit = (id: string) => audits[id] ?? {};
  const score = (c: string) => {
    const s = num(cats[c]?.score);
    return s === null ? null : Math.round(s * 100);
  };

  let field: PsiResult["field"] = null;
  const le = json.loadingExperience as Json | undefined;
  const ole = json.originLoadingExperience as Json | undefined;
  const pick = le?.metrics && !le.origin_fallback ? { src: "url" as const, x: le } : ole?.metrics ? { src: "origin" as const, x: ole } : null;
  if (pick) {
    const m = pick.x.metrics as Json;
    field = {
      source: pick.src,
      overall: str(pick.x.overall_category),
      lcp: fieldMetric(m, "LARGEST_CONTENTFUL_PAINT_MS"),
      inp: fieldMetric(m, "INTERACTION_TO_NEXT_PAINT"),
      cls: fieldMetric(m, "CUMULATIVE_LAYOUT_SHIFT_SCORE", 100), // CrUX reports CLS × 100
      fcp: fieldMetric(m, "FIRST_CONTENTFUL_PAINT_MS"),
      ttfb: fieldMetric(m, "EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
    };
    if (!field.lcp && !field.inp && !field.cls && !field.fcp && !field.ttfb) field = null;
  }

  const perfRefs = ((cats.performance?.auditRefs ?? []) as Json[]).map((r) => ({ id: String(r.id), group: str(r.group) }));
  const opportunities = perfRefs
    .map((r) => ({ r, a: audit(r.id) }))
    .filter(({ a }) => (a.details as Json | undefined)?.type === "opportunity" && num(a.score) !== null && (a.score as number) < 0.9)
    .map(({ r, a }) => ({ id: r.id, title: str(a.title) ?? r.id, savingsMs: num((a.details as Json).overallSavingsMs), displayValue: str(a.displayValue) }))
    .sort((x, y) => (y.savingsMs ?? 0) - (x.savingsMs ?? 0))
    .slice(0, 10);
  const diagnostics = perfRefs
    .filter((r) => r.group === "diagnostics")
    .map((r) => ({ r, a: audit(r.id) }))
    .filter(({ a }) => num(a.score) !== null && (a.score as number) < 0.9)
    .map(({ r, a }) => ({ id: r.id, title: str(a.title) ?? r.id, displayValue: str(a.displayValue) }))
    .slice(0, 10);
  const failing: PsiResult["failing"] = {};
  for (const c of ["accessibility", "best-practices", "seo"]) {
    failing[c] = ((cats[c]?.auditRefs ?? []) as Json[])
      .map((r) => ({ id: String(r.id), a: audit(String(r.id)) }))
      .filter(({ a }) => num(a.score) === 0)
      .map(({ id, a }) => ({ id, title: str(a.title) ?? id }));
  }

  return {
    url: str((json as Json).id) ?? str(lh.requestedUrl) ?? "",
    finalUrl: str(lh.finalDisplayedUrl) ?? str(lh.finalUrl),
    strategy,
    analysisAt: str(json.analysisUTCTimestamp),
    lighthouseVersion: str(lh.lighthouseVersion),
    scores: { performance: score("performance"), accessibility: score("accessibility"), "best-practices": score("best-practices"), seo: score("seo") },
    lab: {
      lcpMs: num(audit("largest-contentful-paint").numericValue),
      cls: num(audit("cumulative-layout-shift").numericValue),
      tbtMs: num(audit("total-blocking-time").numericValue),
      fcpMs: num(audit("first-contentful-paint").numericValue),
      speedIndexMs: num(audit("speed-index").numericValue),
    },
    field,
    opportunities,
    diagnostics,
    failing,
    warnings: ((lh.runWarnings ?? []) as unknown[]).filter((w): w is string => typeof w === "string").slice(0, 5),
  };
}
