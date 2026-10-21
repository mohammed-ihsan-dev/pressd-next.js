import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { can, parseAllowlist, roleFor } from "../../lib/seo/core/permissions.ts";
import { normalizeUrl, crawlScope, parseSiteUrl, toSiteUrl, isExcludedPath } from "../../lib/seo/core/url.ts";
import { isBlockedAddress, assertSafeTarget, BlockedTargetError } from "../../lib/seo/core/net-guard.ts";
import { parseRobots, isAllowedByRobots } from "../../lib/seo/core/robots.ts";
import { extractPageFacts, extractSitemapLocs } from "../../lib/seo/core/html.ts";
import { csvCell, toCsv } from "../../lib/seo/core/csv.ts";
import { encryptSecret, decryptSecret, parseKey } from "../../lib/seo/core/crypto.ts";
import { randomBytes } from "node:crypto";

describe("permissions", () => {
  test("viewer can read but cannot publish, run audits or manage settings", () => {
    assert.equal(can("viewer", "reports:read"), true);
    assert.equal(can("viewer", "reports:export"), true);
    assert.equal(can("viewer", "audit:run"), false);
    assert.equal(can("viewer", "metadata:publish"), false);
    assert.equal(can("viewer", "settings:manage"), false);
  });
  test("editor runs audits but cannot publish metadata or connect Google", () => {
    assert.equal(can("editor", "audit:run"), true);
    assert.equal(can("editor", "tasks:write"), true);
    assert.equal(can("editor", "metadata:publish"), false);
    assert.equal(can("editor", "google:connect"), false);
  });
  test("publisher publishes metadata but cannot change settings", () => {
    assert.equal(can("publisher", "metadata:publish"), true);
    assert.equal(can("publisher", "settings:manage"), false);
  });
  test("admin has everything; no role has nothing", () => {
    assert.equal(can("admin", "google:connect"), true);
    assert.equal(can(null, "reports:read"), false);
  });
  test("allowlist parsing is strict and case-insensitive on email", () => {
    const { users, errors } = parseAllowlist(" Owner@PressdCafe.ae:admin, seo@x.com:viewer ,bad, a@b.com:root, c@d.com ");
    assert.equal(users.get("owner@pressdcafe.ae"), "admin");
    assert.equal(users.get("seo@x.com"), "viewer");
    assert.equal(users.size, 2);
    assert.equal(errors.length, 3);
    assert.equal(roleFor("OWNER@pressdcafe.ae", users), "admin");
    assert.equal(roleFor("someone@else.com", users), null);
    assert.equal(parseAllowlist(undefined).users.size, 0);
  });
});

describe("url normalisation and scope", () => {
  const site = parseSiteUrl("https://www.pressdcafe.ae");
  test("normalises host case, default port, fragment and tracking params", () => {
    assert.equal(normalizeUrl("HTTPS://WWW.PressdCafe.ae:443/menu?utm_source=x&b=2&a=1#top")!.url, "https://www.pressdcafe.ae/menu?a=1&b=2");
    assert.equal(normalizeUrl("/about#team", "https://www.pressdcafe.ae/")!.url, "https://www.pressdcafe.ae/about");
    assert.equal(normalizeUrl("#menu", "https://www.pressdcafe.ae/")!.url, "https://www.pressdcafe.ae/");
  });
  test("rejects non-http schemes and credentials", () => {
    assert.equal(normalizeUrl("javascript:alert(1)"), null);
    assert.equal(normalizeUrl("file:///etc/passwd"), null);
    assert.equal(normalizeUrl("https://user:pw@www.pressdcafe.ae/"), null);
  });
  test("scope: same host only, no admin/api, no query variants, no assets", () => {
    const s = (u: string) => crawlScope(normalizeUrl(u)!, site);
    assert.deepEqual(s("https://www.pressdcafe.ae/menu"), { ok: true });
    assert.equal((s("https://evil.com/") as { reason: string }).reason, "external-host");
    assert.equal((s("https://pressdcafe.ae/") as { reason: string }).reason, "external-host");
    assert.equal((s("http://www.pressdcafe.ae/") as { reason: string }).reason, "protocol");
    assert.equal((s("https://www.pressdcafe.ae/admin/seo") as { reason: string }).reason, "excluded-path");
    assert.equal((s("https://www.pressdcafe.ae/api/x") as { reason: string }).reason, "excluded-path");
    assert.equal((s("https://www.pressdcafe.ae/?sort=price") as { reason: string }).reason, "query-string");
    assert.deepEqual(s("https://www.pressdcafe.ae/?utm_source=ig"), { ok: true });
    assert.equal((s("https://www.pressdcafe.ae/assets/a.webp") as { reason: string }).reason, "non-page-asset");
  });
  test("excluded paths match whole segments only", () => {
    assert.equal(isExcludedPath("/administrator"), false);
    assert.equal(isExcludedPath("/admin"), true);
    assert.equal(isExcludedPath("/ADMIN/x"), true);
  });
  test("site URL must be a bare https origin", () => {
    assert.throws(() => parseSiteUrl("http://www.pressdcafe.ae"));
    assert.throws(() => parseSiteUrl("https://www.pressdcafe.ae/menu"));
    assert.throws(() => parseSiteUrl("not a url"));
  });
  test("user-entered URLs are accepted only on the verified site", () => {
    assert.equal(toSiteUrl("/menu", site)!.toString(), "https://www.pressdcafe.ae/menu");
    assert.equal(toSiteUrl("https://www.pressdcafe.ae/", site)!.toString(), "https://www.pressdcafe.ae/");
    assert.equal(toSiteUrl("https://attacker.example/", site), null);
    assert.equal(toSiteUrl("https://www.pressdcafe.ae.attacker.example/", site), null);
    assert.equal(toSiteUrl("//169.254.169.254/latest", site), null);
  });
});

describe("SSRF guard", () => {
  test("blocks private, loopback, link-local, metadata and mapped addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "64:ff9b::a00:1", "224.0.0.1"]) {
      assert.equal(isBlockedAddress(ip), true, ip);
    }
    for (const ip of ["76.76.21.21", "8.8.8.8", "2606:4700::1111"]) assert.equal(isBlockedAddress(ip), false, ip);
    assert.equal(isBlockedAddress("not-an-ip"), true);
  });
  const allowed = ["www.pressdcafe.ae"];
  const publicDns = async () => [{ address: "76.76.21.21", family: 4 }];
  test("allows the approved host when DNS is public", async () => {
    await assertSafeTarget(new URL("https://www.pressdcafe.ae/"), allowed, publicDns);
  });
  test("rejects other hosts, http, ports, IP literals and private DNS answers", async () => {
    const reject = (u: string, dns = publicDns) => assert.rejects(assertSafeTarget(new URL(u), allowed, dns), BlockedTargetError);
    await reject("https://example.com/");
    await reject("http://www.pressdcafe.ae/");
    await reject("https://www.pressdcafe.ae:8443/");
    await reject("https://127.0.0.1/");
    await reject("https://[::1]/");
    await reject("https://www.pressdcafe.ae/", async () => [{ address: "10.0.0.5", family: 4 }]);
    await reject("https://www.pressdcafe.ae/", async () => [{ address: "76.76.21.21", family: 4 }, { address: "127.0.0.1", family: 4 }]);
    await reject("https://www.pressdcafe.ae/", async () => []);
  });
});

describe("robots.txt", () => {
  const txt = `User-agent: *\nDisallow: /admin\nAllow: /admin/public$\nDisallow: /*.pdf$\n\nUser-agent: PRESSD-SEO-Audit\nDisallow: /private\n\nSitemap: https://www.pressdcafe.ae/sitemap.xml\n`;
  test("uses the specific group for our user agent", () => {
    const r = parseRobots(txt, "Mozilla/5.0 (compatible; PRESSD-SEO-Audit/1.0)");
    assert.equal(isAllowedByRobots(r, "/private/x").allowed, false);
    assert.equal(isAllowedByRobots(r, "/admin").allowed, true); // the * group does not apply
    assert.deepEqual(r.sitemaps, ["https://www.pressdcafe.ae/sitemap.xml"]);
  });
  test("longest match wins; allow wins ties; wildcards and $", () => {
    const r = parseRobots(txt, "OtherBot");
    assert.equal(isAllowedByRobots(r, "/admin/x").allowed, false);
    assert.equal(isAllowedByRobots(r, "/admin/public").allowed, true);
    assert.equal(isAllowedByRobots(r, "/files/menu.pdf").allowed, false);
    assert.equal(isAllowedByRobots(r, "/files/menu.pdf?x").allowed, true);
    assert.equal(isAllowedByRobots(r, "/").allowed, true);
  });
  test("missing robots.txt allows everything", () => {
    assert.equal(isAllowedByRobots(parseRobots(null, "x"), "/anything").allowed, true);
  });
});

describe("HTML extraction", () => {
  const html = `<!doctype html><html lang="en"><head><title> PRESS'D | Café </title>
    <meta name="description" content="Wellness   café"><meta name="robots" content="NoIndex, follow">
    <link rel="canonical" href="https://www.pressdcafe.ae/"><meta property="og:title" content="X">
    <meta name="viewport" content="width=device-width">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"CafeOrCoffeeShop"}</script>
    <script type="application/ld+json">{bad json</script><style>h1{}</style></head>
    <body><h1>The <em>Menu</em></h1><svg><title>icon</title></svg>
    <img src="/a.webp" alt="Latte"><img src="/b.webp"><img src="/c.webp" alt="">
    <a href="/about">About <b>us</b></a><a href="#menu">Menu</a><script>var x = "<h1>not real</h1>";</script></body></html>`;
  const f = extractPageFacts(html);
  test("reads head metadata", () => {
    assert.deepEqual(f.titles, ["PRESS'D | Café"]);
    assert.deepEqual(f.metaDescriptions, ["Wellness café"]);
    assert.deepEqual(f.metaRobots, ["noindex, follow"]);
    assert.deepEqual(f.canonicals, ["https://www.pressdcafe.ae/"]);
    assert.equal(f.lang, "en");
    assert.equal(f.og["og:title"], "X");
  });
  test("ignores svg titles and text inside scripts", () => {
    assert.equal(f.titles.length, 1);
    assert.deepEqual(f.h1s, ["The Menu"]);
  });
  test("distinguishes missing alt from empty alt", () => {
    assert.deepEqual(f.images.map((i) => i.alt), ["Latte", null, ""]);
  });
  test("collects links and JSON-LD validity", () => {
    assert.deepEqual(f.links.map((l) => l.href), ["/about", "#menu"]);
    assert.equal(f.links[0].text, "About us");
    assert.equal(f.jsonLd[0].ok, true);
    assert.deepEqual(f.jsonLd[0].types, ["CafeOrCoffeeShop"]);
    assert.equal(f.jsonLd[1].ok, false);
  });
  test("sitemap and sitemap index", () => {
    assert.deepEqual(extractSitemapLocs(`<?xml version="1.0"?><urlset xmlns="x"><url><loc> https://a/1 </loc></url><url><loc>https://a/2?x=1&amp;y=2</loc></url></urlset>`),
      { locs: ["https://a/1", "https://a/2?x=1&y=2"], isIndex: false });
    assert.equal(extractSitemapLocs(`<sitemapindex><sitemap><loc>https://a/s1.xml</loc></sitemap></sitemapindex>`).isIndex, true);
  });
});

describe("CSV", () => {
  test("escapes quotes, commas, newlines", () => {
    assert.equal(csvCell('He said "hi", then\nleft'), '"He said ""hi"", then\nleft"');
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(42), "42");
  });
  test("neutralises spreadsheet formulas", () => {
    assert.equal(csvCell("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
    assert.equal(csvCell("+1"), "'+1");
    assert.equal(csvCell("@cmd"), "'@cmd");
    assert.equal(csvCell("-5"), "'-5");
  });
  test("document has BOM and CRLF rows", () => {
    assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), "﻿a,b\r\n1,\"x,y\"\r\n");
  });
});

describe("token encryption", () => {
  const key = randomBytes(32);
  test("round-trips and is bound to its purpose", () => {
    const enc = encryptSecret("1//refresh-token", key, "gsc:refresh");
    assert.notEqual(enc.includes("refresh-token"), true);
    assert.equal(decryptSecret(enc, key, "gsc:refresh"), "1//refresh-token");
    assert.throws(() => decryptSecret(enc, key, "gsc:access"));
    assert.throws(() => decryptSecret(enc, randomBytes(32), "gsc:refresh"));
  });
  test("tampering is detected", () => {
    const enc = encryptSecret("secret", key, "a").split(".");
    enc[3] = Buffer.from("SECRET").toString("base64url");
    assert.throws(() => decryptSecret(enc.join("."), key, "a"));
  });
  test("key must be 32 bytes", () => {
    assert.throws(() => parseKey(undefined));
    assert.throws(() => parseKey(Buffer.from("short").toString("base64")));
    assert.equal(parseKey(key.toString("base64")).length, 32);
  });
});
