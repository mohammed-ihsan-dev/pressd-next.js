// Google integrations, sessions and validation — all offline (fake Google, local keys).
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { parsePsi, buildPsiUrl } from "../../lib/seo/core/pagespeed.ts";
import { validateOverride, applyOverride, MetadataValidationError } from "../../lib/seo/core/metadata.ts";
import { sealSession, openSession, sealOAuthState, openOAuthState } from "../../lib/seo/auth/session.ts";
import { buildAuthUrl, verifyIdToken, SEARCH_CONSOLE_SCOPE, pkceChallenge } from "../../lib/seo/auth/google.ts";
import { openPglite, type Db } from "../../lib/seo/db/client.ts";
import { googleConnections } from "../../lib/seo/db/schema.ts";
import { storeGrant, connectionView, selectProperty, querySearchAnalytics, propertyMatchesSite, rangesFor, declines, totalsOf, disconnect, GscError, type GscDeps } from "../../lib/seo/services/gsc.ts";
import { validateTask, TaskValidationError } from "../../lib/seo/services/tasks.ts";
import { compareRendered } from "../../lib/seo/services/metadata.ts";
import { extractPageFacts } from "../../lib/seo/core/html.ts";
import { validateSettings, SettingsValidationError } from "../../lib/seo/services/settings.ts";
import { parseSiteUrl } from "../../lib/seo/core/url.ts";

const site = parseSiteUrl("https://www.pressdcafe.ae");

// ---------------------------------------------------------------- PageSpeed
const audit = (score: number | null, numericValue?: number, extra: object = {}) => ({ score, numericValue, title: "t", ...extra });
function psiFixture(field: "url" | "origin" | "none") {
  const metrics = { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2300, category: "FAST" }, INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: "FAST" }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: "FAST" } };
  return {
    id: "https://www.pressdcafe.ae/",
    analysisUTCTimestamp: "2026-10-21T10:00:00.000Z",
    loadingExperience: field === "url" ? { metrics, overall_category: "FAST" } : field === "origin" ? { metrics, origin_fallback: true } : {},
    originLoadingExperience: field === "none" ? {} : { metrics, overall_category: "AVERAGE" },
    lighthouseResult: {
      lighthouseVersion: "12.0.0",
      finalDisplayedUrl: "https://www.pressdcafe.ae/",
      categories: {
        performance: { score: 0.47, auditRefs: [{ id: "render-blocking-resources" }, { id: "unused-javascript" }, { id: "mainthread-work-breakdown", group: "diagnostics" }, { id: "largest-contentful-paint", group: "metrics" }] },
        accessibility: { score: 0.91, auditRefs: [{ id: "color-contrast" }, { id: "image-alt" }] },
        "best-practices": { score: 1, auditRefs: [] },
        seo: { score: 0.83, auditRefs: [{ id: "canonical" }, { id: "meta-description" }] },
      },
      audits: {
        "largest-contentful-paint": audit(0.2, 6400),
        "cumulative-layout-shift": audit(0.9, 0.031),
        "total-blocking-time": audit(0.3, 890),
        "first-contentful-paint": audit(0.5, 2100),
        "speed-index": audit(0.4, 5200),
        "render-blocking-resources": audit(0.3, undefined, { title: "Eliminate render-blocking resources", displayValue: "Potential savings of 1,200 ms", details: { type: "opportunity", overallSavingsMs: 1200 } }),
        "unused-javascript": audit(0.5, undefined, { title: "Reduce unused JavaScript", details: { type: "opportunity", overallSavingsMs: 2400 } }),
        "mainthread-work-breakdown": audit(0, undefined, { title: "Minimize main-thread work", displayValue: "4.1 s" }),
        "color-contrast": audit(0, undefined, { title: "Low contrast" }),
        "image-alt": audit(1),
        canonical: audit(0, undefined, { title: "Document does not have a valid rel=canonical" }),
        "meta-description": audit(1),
      },
    },
  };
}

describe("PageSpeed parsing", () => {
  test("scores, lab metrics, opportunities and failing checks", () => {
    const r = parsePsi(psiFixture("url"), "mobile");
    assert.deepEqual(r.scores, { performance: 47, accessibility: 91, "best-practices": 100, seo: 83 });
    assert.equal(r.lab.lcpMs, 6400);
    assert.equal(r.lab.cls, 0.031);
    assert.deepEqual(r.opportunities.map((o) => o.id), ["unused-javascript", "render-blocking-resources"]); // by savings
    assert.deepEqual(r.diagnostics.map((d) => d.id), ["mainthread-work-breakdown"]);
    assert.deepEqual(r.failing.seo.map((f) => f.id), ["canonical"]);
    assert.deepEqual(r.failing.accessibility.map((f) => f.id), ["color-contrast"]);
    assert.equal(r.lighthouseVersion, "12.0.0");
  });
  test("field data: URL-level, CLS rescaled from CrUX ×100", () => {
    const f = parsePsi(psiFixture("url"), "mobile").field!;
    assert.equal(f.source, "url");
    assert.equal(f.lcp!.p75, 2300);
    assert.equal(f.inp!.p75, 180);
    assert.equal(f.cls!.p75, 0.05);
    assert.equal(f.ttfb, null); // not returned → stays null, never invented
  });
  test("field data falls back to origin only when Google flags it", () => {
    assert.equal(parsePsi(psiFixture("origin"), "desktop").field!.source, "origin");
  });
  test("no field data → null, not zeros", () => {
    assert.equal(parsePsi(psiFixture("none"), "mobile").field, null);
  });
  test("missing categories stay null", () => {
    const r = parsePsi({ lighthouseResult: { categories: {}, audits: {} } }, "mobile");
    assert.deepEqual(r.scores, { performance: null, accessibility: null, "best-practices": null, seo: null });
    assert.equal(r.lab.lcpMs, null);
  });
  test("request URL carries all four categories; key only when set", () => {
    const u = new URL(buildPsiUrl("https://www.pressdcafe.ae/", "mobile", null));
    assert.deepEqual(u.searchParams.getAll("category"), ["performance", "accessibility", "best-practices", "seo"]);
    assert.equal(u.searchParams.has("key"), false);
    assert.equal(new URL(buildPsiUrl("https://www.pressdcafe.ae/", "desktop", "K")).searchParams.get("key"), "K");
  });
});

// ---------------------------------------------------------------- metadata validation
describe("metadata overrides", () => {
  test("accepts valid fields, normalises URLs, drops empties", () => {
    assert.deepEqual(validateOverride({ title: "  PRESS'D   Café ", description: "", canonical: "/", ogImage: "/assets/x.webp", robots: "index, follow" }, site), {
      title: "PRESS'D Café",
      canonical: "https://www.pressdcafe.ae/",
      ogImage: "https://www.pressdcafe.ae/assets/x.webp",
      robots: "index, follow",
    });
  });
  test("rejects markup, off-site URLs, bad robots, unknown fields, over-long text", () => {
    const bad = (input: Record<string, unknown>) => assert.throws(() => validateOverride(input, site), MetadataValidationError);
    bad({ title: "<script>alert(1)</script>" });
    bad({ canonical: "https://evil.example/" });
    bad({ canonical: "http://www.pressdcafe.ae/" });
    bad({ canonical: "https://www.pressdcafe.ae/?x=1" });
    bad({ ogImage: "javascript:alert(1)" });
    bad({ robots: "noarchive" });
    bad({ keywords: "x" });
    bad({ title: "x".repeat(121) });
    bad({ title: 5 });
  });
  test("applyOverride layers over defaults without touching other fields", () => {
    const base = { title: "Default", description: "D", icons: { icon: "/icon.png" }, openGraph: { title: "OG", type: "website" } };
    assert.equal(applyOverride(base, null), base);
    const m = applyOverride(base, { title: "New", robots: "noindex, follow", canonical: "https://www.pressdcafe.ae/", ogImage: "https://www.pressdcafe.ae/a.webp" }) as Record<string, unknown>;
    assert.equal(m.title, "New");
    assert.equal(m.description, "D");
    assert.deepEqual(m.icons, { icon: "/icon.png" });
    assert.deepEqual(m.robots, { index: false, follow: true });
    assert.deepEqual(m.alternates, { canonical: "https://www.pressdcafe.ae/" });
    assert.deepEqual(m.openGraph, { title: "OG", type: "website", images: [{ url: "https://www.pressdcafe.ae/a.webp" }] });
  });
});

describe("published-metadata verification", () => {
  const facts = extractPageFacts(`<html><head><title>PRESS'D</title><meta name="description" content="D"><link rel="canonical" href="https://www.pressdcafe.ae"/></head></html>`);
  test("root canonical without trailing slash matches", () => {
    assert.deepEqual(compareRendered({ title: "PRESS'D", description: "D", canonical: "https://www.pressdcafe.ae/", robotsNoindex: false }, facts), []);
  });
  test("real differences are reported", () => {
    assert.equal(compareRendered({ title: "Other", canonical: "https://www.pressdcafe.ae/menu" }, facts).length, 2);
  });
});

// ---------------------------------------------------------------- tasks / settings validation
describe("task and settings validation", () => {
  const isSite = (u: string) => u.startsWith("https://www.pressdcafe.ae/");
  test("task fields are validated", () => {
    assert.throws(() => validateTask({ title: "" }, false, isSite), TaskValidationError);
    assert.throws(() => validateTask({ title: "x", url: "https://evil.example/" }, false, isSite), TaskValidationError);
    assert.throws(() => validateTask({ title: "x", priority: "asap" }, false, isSite), TaskValidationError);
    assert.throws(() => validateTask({ title: "x", dueDate: "21/10/2026" }, false, isSite), TaskValidationError);
    assert.throws(() => validateTask({ title: "x", assignee: "not-an-email" }, false, isSite), TaskValidationError);
    const ok = validateTask({ title: " Fix ", url: "https://www.pressdcafe.ae/", priority: "high", dueDate: "2026-10-30", assignee: "Dev@X.com" }, false, isSite);
    assert.equal(ok.title, "Fix");
    assert.equal(ok.assignee, "dev@x.com");
    assert.deepEqual(validateTask({ status: "done" }, true, isSite), { status: "done" }); // partial update touches only given fields
  });
  test("settings are range-checked and consistent", () => {
    assert.throws(() => validateSettings({ thresholds: { titleMin: 70, titleMax: 60 } }), SettingsValidationError);
    assert.throws(() => validateSettings({ thresholds: { titleMax: 9999 } }), SettingsValidationError);
    assert.throws(() => validateSettings({ crawlLimits: { maxPages: -1 } }), SettingsValidationError);
    assert.equal(validateSettings({ crawlLimits: { maxPages: 50000, concurrency: 99 } }).crawlLimits.maxPages, 1000); // clamped to hard max
    assert.equal(validateSettings({ crawlLimits: { concurrency: 99 } }).crawlLimits.concurrency, 5);
  });
});

// ---------------------------------------------------------------- sessions + OAuth
describe("sessions and OAuth state", () => {
  const secret = randomBytes(48).toString("base64");
  test("session round-trips; tampering, wrong secret and wrong purpose are rejected", async () => {
    const token = await sealSession({ email: "a@x.com", name: "A" }, secret);
    assert.equal((await openSession(token, secret))!.email, "a@x.com");
    assert.equal(await openSession(token.slice(0, -2) + "xx", secret), null);
    assert.equal(await openSession(token, randomBytes(48).toString("base64")), null);
    const oauth = await sealOAuthState({ flow: "login", state: "s", verifier: "v", nonce: "n" }, secret);
    assert.equal(await openSession(oauth, secret), null, "an OAuth-state cookie is not a session");
    assert.equal((await openOAuthState(oauth, secret))!.state, "s");
    assert.equal(await openOAuthState(token, secret), null);
  });
  test("auth URL: PKCE S256, state, nonce; Search Console asks only for read-only scope + offline", () => {
    const c = { clientId: "cid", clientSecret: "sec", redirectUri: "https://www.pressdcafe.ae/api/admin/auth/google/callback" };
    const login = new URL(buildAuthUrl(c, { flow: "login", state: "S", verifier: "V", nonce: "N" }));
    assert.equal(login.searchParams.get("code_challenge"), pkceChallenge("V"));
    assert.equal(login.searchParams.get("code_challenge_method"), "S256");
    assert.equal(login.searchParams.get("scope"), "openid email profile");
    assert.equal(login.searchParams.has("client_secret"), false);
    const gsc = new URL(buildAuthUrl(c, { flow: "search_console", state: "S", verifier: "V", nonce: "N" }));
    assert.deepEqual(gsc.searchParams.get("scope")!.split(" "), ["openid", "email", SEARCH_CONSOLE_SCOPE]);
    assert.ok(!gsc.searchParams.get("scope")!.includes("auth/webmasters "), "never the write scope");
    assert.equal(gsc.searchParams.get("access_type"), "offline");
  });
  test("ID token: signature, issuer, audience, nonce and verified email are enforced", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
    const keys = createLocalJWKSet({ keys: [jwk] });
    const sign = (claims: Record<string, unknown>, aud = "cid", iss = "https://accounts.google.com") =>
      new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime("5m").setSubject("123").sign(privateKey);
    const good = await sign({ email: "Owner@PressdCafe.ae", email_verified: true, nonce: "N", name: "Owner" });
    assert.deepEqual(await verifyIdToken(good, "cid", "N", keys), { email: "owner@pressdcafe.ae", name: "Owner", sub: "123" });
    await assert.rejects(verifyIdToken(good, "cid", "other-nonce", keys));
    await assert.rejects(verifyIdToken(good, "other-client", "N", keys));
    await assert.rejects(verifyIdToken(await sign({ email: "a@x.com", email_verified: false, nonce: "N" }), "cid", "N", keys));
    await assert.rejects(verifyIdToken(await sign({ email: "a@x.com", email_verified: true, nonce: "N" }, "cid", "https://evil.example"), "cid", "N", keys));
    const other = await generateKeyPair("RS256");
    const forged = await new SignJWT({ email: "a@x.com", email_verified: true, nonce: "N" }).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer("https://accounts.google.com").setAudience("cid").setExpirationTime("5m").sign(other.privateKey);
    await assert.rejects(verifyIdToken(forged, "cid", "N", keys));
  });
});

// ---------------------------------------------------------------- Search Console (fake Google)
describe("Search Console service", () => {
  let db: Db;
  let deps: GscDeps;
  let calls: string[] = [];
  let google: (url: string, init: RequestInit) => { status: number; body: unknown };
  const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    calls.push(`${init.method ?? "GET"} ${url.split("?")[0]}`);
    const { status, body } = google(url, init);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const tokens = { access_token: "ya29.access", expires_in: 3600, refresh_token: "1//refresh", scope: `openid email ${SEARCH_CONSOLE_SCOPE}`, token_type: "Bearer" };

  before(async () => {
    db = await openPglite(null);
    deps = { db, key: randomBytes(32), client: { clientId: "cid", clientSecret: "sec", redirectUri: "https://x/cb" }, fetch: fakeFetch };
  });

  test("disconnected: no data is ever produced", async () => {
    assert.equal((await connectionView(db)).state, "disconnected");
    google = () => ({ status: 200, body: { rows: [{ keys: [], clicks: 999, impressions: 999, ctr: 1, position: 1 }] } });
    await assert.rejects(querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1), (e) => e instanceof GscError && e.code === "not_connected");
    assert.equal(calls.length, 0, "Google was not called");
  });

  test("grant without the read-only scope or a refresh token is refused", async () => {
    await assert.rejects(storeGrant(deps, { ...tokens, scope: "openid email" }, "g@x.com", "admin@x.com"), (e) => e instanceof GscError && e.code === "insufficient_scope");
    await assert.rejects(storeGrant(deps, { ...tokens, refresh_token: undefined }, "g@x.com", "admin@x.com"), (e) => e instanceof GscError && e.code === "no_refresh_token");
  });

  test("tokens are stored encrypted; property must be listed, verified and cover the site", async () => {
    await storeGrant(deps, tokens, "g@x.com", "admin@x.com");
    const [row] = await db.select().from(googleConnections);
    assert.ok(!JSON.stringify(row).includes("1//refresh") && !JSON.stringify(row).includes("ya29.access"), "no plaintext tokens in the row");
    assert.equal((await connectionView(db)).state, "needs_property");
    google = (url) => (url.endsWith("/sites") ? { status: 200, body: { siteEntry: [
      { siteUrl: "sc-domain:pressdcafe.ae", permissionLevel: "siteOwner" },
      { siteUrl: "https://other-cafe.example/", permissionLevel: "siteOwner" },
      { siteUrl: "https://www.pressdcafe.ae/", permissionLevel: "siteUnverifiedUser" },
    ] } } : { status: 404, body: {} });
    await assert.rejects(selectProperty(deps, site, "https://other-cafe.example/"), (e) => e instanceof GscError && e.code === "wrong_property");
    await assert.rejects(selectProperty(deps, site, "https://www.pressdcafe.ae/"), (e) => e instanceof GscError && e.code === "unverified");
    await assert.rejects(selectProperty(deps, site, "sc-domain:not-listed.ae"), (e) => e instanceof GscError && e.code === "unknown_property");
    assert.equal((await connectionView(db)).state, "needs_property", "still not connected after failed selections");
    await selectProperty(deps, site, "sc-domain:pressdcafe.ae");
    assert.equal((await connectionView(db)).state, "connected");
    assert.ok(calls.every((c) => !c.includes("client_secret")));
  });

  test("reporting paginates, sends the bearer token, and refreshes an expired access token", async () => {
    calls = [];
    let pages = 0;
    google = (url, init) => {
      if (url.includes("/token")) return { status: 200, body: { access_token: "ya29.new", expires_in: 3600, token_type: "Bearer" } };
      const auth = (init.headers as Record<string, string>).authorization;
      assert.ok(auth === "Bearer ya29.access" || auth === "Bearer ya29.new");
      const body = JSON.parse(String(init.body));
      pages++;
      const n = body.startRow === 0 ? body.rowLimit : 3; // first page full, second short
      return { status: 200, body: { rows: Array.from({ length: n }, (_, i) => ({ keys: [`q${body.startRow + i}`], clicks: 1, impressions: 10, ctr: 0.1, position: 4 })) } };
    };
    const rows = await querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, ["query"], 30000);
    assert.equal(rows.length, 25003);
    assert.equal(pages, 2);
    // expire the access token → next call refreshes first
    await db.update(googleConnections).set({ accessTokenExpiresAt: new Date(Date.now() - 1000) });
    calls = [];
    await querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1);
    assert.ok(calls[0].endsWith("oauth2.googleapis.com/token"));
  });

  test("parallel report queries share one token refresh", async () => {
    await db.update(googleConnections).set({ accessTokenExpiresAt: new Date(Date.now() - 1000) });
    calls = [];
    google = (url) => (url.includes("/token") ? { status: 200, body: { access_token: "ya29.new", expires_in: 3600, token_type: "Bearer" } } : { status: 200, body: { rows: [] } });
    await Promise.all(Array.from({ length: 10 }, () => querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1)));
    assert.equal(calls.filter((c) => c.endsWith("oauth2.googleapis.com/token")).length, 1);
  });

  test("a changed encryption key gives a clear reconnect state, not a crash", async () => {
    const wrongKey = { ...deps, key: randomBytes(32) };
    await assert.rejects(querySearchAnalytics(wrongKey, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1), (e) => e instanceof GscError && e.code === "key_mismatch");
    const v = await connectionView(db);
    assert.equal(v.state, "error");
    assert.match((v as { message: string }).message, /SEO_TOKEN_ENCRYPTION_KEY/);
    // restore a working connection for the following tests
    await storeGrant(deps, tokens, "g@x.com", "admin@x.com");
    google = (url) => (url.endsWith("/sites") ? { status: 200, body: { siteEntry: [{ siteUrl: "sc-domain:pressdcafe.ae", permissionLevel: "siteOwner" }] } } : { status: 200, body: {} });
    await selectProperty(deps, site, "sc-domain:pressdcafe.ae");
  });

  test("revoked access (invalid_grant) puts the connection in an error state with a clear message", async () => {
    await db.update(googleConnections).set({ accessTokenExpiresAt: new Date(Date.now() - 1000) });
    google = (url) => (url.includes("/token") ? { status: 400, body: { error: "invalid_grant", error_description: "Token has been expired or revoked." } } : { status: 200, body: {} });
    await assert.rejects(querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1), (e) => e instanceof GscError && e.code === "invalid_grant");
    const v = await connectionView(db);
    assert.equal(v.state, "error");
    assert.match((v as { message: string }).message, /Reconnect/);
  });

  test("quota and permission errors are mapped, not swallowed", async () => {
    await storeGrant(deps, tokens, "g@x.com", "admin@x.com");
    google = (url) => (url.endsWith("/sites") ? { status: 200, body: { siteEntry: [{ siteUrl: "sc-domain:pressdcafe.ae", permissionLevel: "siteFullUser" }] } } : { status: 429, body: { error: { message: "Quota exceeded", errors: [{ reason: "rateLimitExceeded" }] } } });
    await selectProperty(deps, site, "sc-domain:pressdcafe.ae");
    await assert.rejects(querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1), (e) => e instanceof GscError && e.code === "quota");
    google = () => ({ status: 403, body: { error: { message: "User does not have sufficient permission" } } });
    await assert.rejects(querySearchAnalytics(deps, { startDate: "2026-09-01", endDate: "2026-09-28" }, [], 1), (e) => e instanceof GscError && e.code === "forbidden");
  });

  test("disconnect revokes at Google and deletes tokens", async () => {
    calls = [];
    google = () => ({ status: 200, body: {} });
    const r = await disconnect(deps);
    assert.equal(r.revoked, true);
    assert.ok(calls.some((c) => c.endsWith("oauth2.googleapis.com/revoke")));
    const [row] = await db.select().from(googleConnections);
    assert.equal(row.refreshTokenEnc, null);
    assert.equal(row.accessTokenEnc, null);
    assert.equal((await connectionView(db)).state, "disconnected");
  });

  test("helpers: property matching, date ranges, declines, empty totals", () => {
    assert.equal(propertyMatchesSite("sc-domain:pressdcafe.ae", site), true);
    assert.equal(propertyMatchesSite("https://www.pressdcafe.ae/", site), true);
    assert.equal(propertyMatchesSite("https://pressdcafe.ae/", site), false); // apex prefix does not cover www
    assert.equal(propertyMatchesSite("sc-domain:cafe.ae", site), false);
    assert.deepEqual(rangesFor(28, new Date("2026-10-21T12:00:00Z")), {
      current: { startDate: "2026-09-21", endDate: "2026-10-18" },
      previous: { startDate: "2026-08-24", endDate: "2026-09-20" },
    });
    const prev = [{ keys: ["/a"], clicks: 20, impressions: 100, ctr: 0.2, position: 3 }, { keys: ["/b"], clicks: 3, impressions: 9, ctr: 0.3, position: 2 }, { keys: ["/c"], clicks: 10, impressions: 50, ctr: 0.2, position: 5 }];
    const cur = [{ keys: ["/a"], clicks: 5, impressions: 80, ctr: 0.06, position: 6 }, { keys: ["/c"], clicks: 9, impressions: 50, ctr: 0.18, position: 5 }];
    assert.deepEqual(declines(cur, prev).map((d) => [d.key, d.clickChangePct]), [["/a", -75]]); // /b below 5 clicks, /c only -10%
    assert.deepEqual(totalsOf([]), { clicks: 0, impressions: 0, ctr: null, position: null, hasData: false });
  });
});
