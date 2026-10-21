// Minimal robots.txt parser (RFC 9309 matching: longest match wins, Allow
// wins ties, `*` and `$` wildcards). Pure module.

interface Rule {
  allow: boolean;
  pattern: string;
}

export interface RobotsTxt {
  /** Rules for the most specific group matching our user agent (or `*`). */
  rules: Rule[];
  sitemaps: string[];
  /** null when robots.txt was absent (everything allowed). */
  raw: string | null;
}

export function parseRobots(raw: string | null, userAgent: string): RobotsTxt {
  if (raw === null) return { rules: [], sitemaps: [], raw: null };
  const ua = userAgent.toLowerCase();
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  const sitemaps: string[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const line0 of raw.split(/\r?\n/)) {
    const line = line0.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      if (key === "disallow" && value === "") continue; // empty disallow = allow all
      current.rules.push({ allow: key === "allow", pattern: value });
    }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  return { rules: chosen.flatMap((g) => g.rules), sitemaps, raw };
}

function toRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}

/** `pathWithQuery` is the URL path plus search, e.g. "/menu?x=1". */
export function isAllowedByRobots(robots: RobotsTxt, pathWithQuery: string): { allowed: boolean; rule: string | null } {
  let best: Rule | null = null;
  for (const r of robots.rules) {
    if (!r.pattern) continue;
    if (!toRegex(r.pattern).test(pathWithQuery)) continue;
    if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow && !best.allow)) {
      best = r;
    }
  }
  if (!best) return { allowed: true, rule: null };
  return { allowed: best.allow, rule: `${best.allow ? "Allow" : "Disallow"}: ${best.pattern}` };
}
