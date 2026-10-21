// Extracts SEO-relevant facts from a fetched HTML document. Pure module.
// Only what is actually present in the HTML is recorded; nothing is inferred.

import { Parser } from "htmlparser2";

export interface ImageFact {
  src: string;
  /** null = attribute absent; "" = present but empty (decorative) */
  alt: string | null;
}

export interface LinkFact {
  href: string;
  rel: string;
  text: string;
}

export interface JsonLdFact {
  ok: boolean;
  types: string[];
  error?: string;
  hasContext: boolean;
}

export interface PageFacts {
  lang: string | null;
  titles: string[];
  metaDescriptions: string[];
  metaRobots: string[]; // name=robots and name=googlebot contents
  canonicals: string[];
  h1s: string[];
  images: ImageFact[];
  links: LinkFact[];
  og: Record<string, string>;
  twitter: Record<string, string>;
  viewport: string | null;
  jsonLd: JsonLdFact[];
  textHash: string; // hash of visible text, for duplicate-content detection
  wordCount: number;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Small non-cryptographic hash (FNV-1a) — only used to group identical text. */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function collectTypes(node: unknown, out: Set<string>, hasContext: { v: boolean }, depth = 0): void {
  if (depth > 8 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out, hasContext, depth + 1));
    return;
  }
  const o = node as Record<string, unknown>;
  if ("@context" in o) hasContext.v = true;
  const t = o["@type"];
  if (typeof t === "string") out.add(t);
  else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.add(x));
  if (Array.isArray(o["@graph"])) collectTypes(o["@graph"], out, hasContext, depth + 1);
}

export function parseJsonLd(source: string): JsonLdFact {
  try {
    const data = JSON.parse(source);
    const types = new Set<string>();
    const ctx = { v: false };
    collectTypes(data, types, ctx);
    return { ok: true, types: [...types], hasContext: ctx.v };
  } catch (e) {
    return { ok: false, types: [], hasContext: false, error: e instanceof Error ? e.message.slice(0, 200) : "Invalid JSON" };
  }
}

const MAX_LINKS = 2000;
const MAX_IMAGES = 1000;

export function extractPageFacts(html: string): PageFacts {
  const facts: PageFacts = {
    lang: null,
    titles: [],
    metaDescriptions: [],
    metaRobots: [],
    canonicals: [],
    h1s: [],
    images: [],
    links: [],
    og: {},
    twitter: {},
    viewport: null,
    jsonLd: [],
    textHash: "",
    wordCount: 0,
  };
  let inTitle = false;
  let titleBuf = "";
  let h1Depth = 0;
  let h1Buf = "";
  let skipDepth = 0; // inside script/style/noscript/template/svg
  let jsonLdBuf: string | null = null;
  let svgDepth = 0;
  const anchorStack: { href: string; rel: string; text: string }[] = [];
  const text: string[] = [];

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        if (name === "svg") svgDepth++;
        if (svgDepth > 0 && name !== "svg") return;
        switch (name) {
          case "html":
            if (attrs.lang !== undefined) facts.lang = attrs.lang.trim() || null;
            break;
          case "title":
            inTitle = true;
            titleBuf = "";
            break;
          case "meta": {
            const n = (attrs.name ?? "").toLowerCase();
            const prop = (attrs.property ?? "").toLowerCase();
            const content = attrs.content ?? "";
            if (n === "description") facts.metaDescriptions.push(collapse(content));
            else if (n === "robots" || n === "googlebot") facts.metaRobots.push(collapse(content).toLowerCase());
            else if (n === "viewport") facts.viewport = content;
            else if (n.startsWith("twitter:")) facts.twitter[n] = content;
            if (prop.startsWith("og:")) facts.og[prop] = content;
            break;
          }
          case "link": {
            const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
            if (rel.includes("canonical")) facts.canonicals.push((attrs.href ?? "").trim());
            break;
          }
          case "h1":
            h1Depth++;
            if (h1Depth === 1) h1Buf = "";
            break;
          case "img":
            if (facts.images.length < MAX_IMAGES) facts.images.push({ src: (attrs.src ?? "").trim(), alt: attrs.alt === undefined ? null : attrs.alt });
            break;
          case "a":
            if (attrs.href !== undefined) anchorStack.push({ href: attrs.href.trim(), rel: (attrs.rel ?? "").toLowerCase(), text: "" });
            break;
          case "script":
            skipDepth++;
            if ((attrs.type ?? "").toLowerCase() === "application/ld+json") jsonLdBuf = "";
            break;
          case "style":
          case "noscript":
          case "template":
            skipDepth++;
            break;
        }
      },
      ontext(data) {
        if (jsonLdBuf !== null) {
          jsonLdBuf += data;
          return;
        }
        if (inTitle) titleBuf += data;
        if (skipDepth > 0 || svgDepth > 0) return;
        if (h1Depth > 0) h1Buf += data;
        if (anchorStack.length) anchorStack[anchorStack.length - 1].text += data;
        if (!inTitle) text.push(data);
      },
      onclosetag(name) {
        if (name === "svg") {
          svgDepth = Math.max(0, svgDepth - 1);
          return;
        }
        if (svgDepth > 0) return;
        switch (name) {
          case "title":
            if (inTitle) facts.titles.push(collapse(titleBuf));
            inTitle = false;
            break;
          case "h1":
            if (h1Depth === 1) facts.h1s.push(collapse(h1Buf));
            h1Depth = Math.max(0, h1Depth - 1);
            break;
          case "a": {
            const a = anchorStack.pop();
            if (a && facts.links.length < MAX_LINKS) facts.links.push({ href: a.href, rel: a.rel, text: collapse(a.text).slice(0, 120) });
            break;
          }
          case "script":
            if (jsonLdBuf !== null) {
              facts.jsonLd.push(parseJsonLd(jsonLdBuf));
              jsonLdBuf = null;
            }
            skipDepth = Math.max(0, skipDepth - 1);
            break;
          case "style":
          case "noscript":
          case "template":
            skipDepth = Math.max(0, skipDepth - 1);
            break;
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true },
  );
  parser.write(html);
  parser.end();

  const visible = collapse(text.join(" "));
  facts.textHash = fnv1a(visible.toLowerCase());
  facts.wordCount = visible ? visible.split(" ").length : 0;
  return facts;
}

/** Extracts <loc> entries from a sitemap or sitemap index. */
export function extractSitemapLocs(xml: string): { locs: string[]; isIndex: boolean } {
  const locs: string[] = [];
  let isIndex = false;
  let inLoc = false;
  let buf = "";
  const parser = new Parser(
    {
      onopentag(name) {
        const local = name.split(":").pop();
        if (local === "sitemapindex") isIndex = true;
        if (local === "loc") {
          inLoc = true;
          buf = "";
        }
      },
      ontext(data) {
        if (inLoc) buf += data;
      },
      onclosetag(name) {
        if (name.split(":").pop() === "loc" && inLoc) {
          inLoc = false;
          if (buf.trim() && locs.length < 50000) locs.push(buf.trim());
        }
      },
    },
    { xmlMode: true, decodeEntities: true },
  );
  parser.write(xml);
  parser.end();
  return { locs, isIndex };
}
