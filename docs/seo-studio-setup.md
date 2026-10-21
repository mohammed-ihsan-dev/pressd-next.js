# PRESS'D SEO Studio — setup

> **Before deploying:** at the time of writing, www.pressdcafe.ae is served by a different repository — the static site `pressd-newwww` (`index.html`, `style.css`, `script.js`) — not by this Next.js app. Deploying this app to the production domain replaces the whole public site, not just adds the dashboard. See the deployment checklist in the pre-deployment review.

SEO Studio is the internal SEO dashboard at `/admin/seo`. It audits the live site, shows Google Search Console and PageSpeed data, manages page metadata and tracks SEO tasks. It never invents data: anything that isn't connected shows as "not connected" or "not measured".

All configuration is through environment variables (see `.env.example`). Every value is server-side only.

## 1. Database (required)

1. In Vercel, open the project and go to **Storage → Create → Neon (Postgres)**. Connect it to the project; this sets `DATABASE_URL`.
2. Create the dashboard tables (only `seo_*` tables are created — no DROP/TRUNCATE/DELETE statements):
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   ```
   Use the **pooled or direct** Neon connection string. The script prints the target host, runs every pending migration in **one transaction** (a failure applies nothing) and skips migrations already applied, so re-running is safe.
3. Run the same command after any future schema change (`npm run db:generate` creates the migration file). Review the generated SQL before applying it.

Local development needs no database: when `DATABASE_URL` is unset outside production, an embedded Postgres (PGlite) is created in `.data/` (git-ignored). Production refuses to run without `DATABASE_URL`.

## 2. Google Cloud project and OAuth client (required for sign-in and Search Console)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (e.g. "PRESS'D SEO Studio").
2. **APIs & Services → Library**: enable **Google Search Console API** and **PageSpeed Insights API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: *External* (or *Internal* if PRESS'D uses Google Workspace and all users are in it).
   - App name "PRESS'D SEO Studio"; support and developer email: the owner's address.
   - Scopes: `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/webmasters.readonly`.
   - While in *Testing* mode, add each person who will sign in as a **test user**. Read-only Search Console is a "sensitive" scope; publishing the app for wider use requires Google's verification. Testing mode is fine for a small internal team, but **refresh tokens in Testing mode expire after 7 days**, so Search Console must then be reconnected weekly until the app is published.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: *Web application*.
   - Authorised JavaScript origin: `https://www.pressdcafe.ae`.
   - Authorised redirect URI: `https://www.pressdcafe.ae/api/admin/auth/google/callback` (for local testing also add `http://localhost:3000/api/admin/auth/google/callback`).
   - **Preview deployments:** Google sends the user back to the exact `GOOGLE_REDIRECT_URI`, and the sign-in state cookie belongs to the domain where sign-in started. To sign in on a preview, give it a stable domain (e.g. a Vercel branch alias like `seo-preview.pressdcafe.ae`), add `https://<that domain>/api/admin/auth/google/callback` to the OAuth client, and set `GOOGLE_REDIRECT_URI` to it in Vercel's **Preview** environment only.
   - Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and set `GOOGLE_REDIRECT_URI` to the same redirect URI.
5. **Credentials → Create credentials → API key**: restrict it to the *PageSpeed Insights API* and put it in `PAGESPEED_INSIGHTS_API_KEY`.

## 3. Secrets and access list

```bash
openssl rand -base64 48   # → SEO_SESSION_SECRET
openssl rand -base64 32   # → SEO_TOKEN_ENCRYPTION_KEY
```

`SEO_ADMIN_USERS` lists the Google accounts allowed in, each with a role:

| Role | Can |
| --- | --- |
| `viewer` | View all reports, download CSV exports |
| `editor` | + run audits and rechecks, run PageSpeed tests, update issue status, manage tasks |
| `publisher` | + publish and restore page metadata |
| `admin` | + change settings, connect/disconnect Search Console, see the admin activity log |

Example: `SEO_ADMIN_USERS=owner@pressdcafe.ae:admin, seo@agency.example:publisher, dev@agency.example:editor`

Access is checked on every request. Removing an address and redeploying revokes it immediately, even for someone who is signed in.

## 4. Connect Search Console

1. Make sure the Google account you'll connect is a **verified owner or full/restricted user** of a Search Console property covering the site: either a Domain property `pressdcafe.ae` (recommended) or the URL-prefix property `https://www.pressdcafe.ae/`. If no property exists yet, add and verify one in Search Console first.
2. Sign in to `/admin/seo` as an **admin**, open **Search Console** and click **Connect with Google**. Approve the read-only permission.
3. Choose the PRESS'D property. Only properties that cover `www.pressdcafe.ae` and where the account is verified can be selected.

SEO Studio only reads data. It never submits or deletes sitemaps or changes anything in Search Console. **Disconnect** deletes the stored tokens and revokes them at Google.

## 5. Deploy and check

1. Add all variables in Vercel (Production, and Preview if wanted) and redeploy.
2. Visit `/admin/seo/settings`: the Configuration table shows which variables are set (never their values).
3. Run the first technical audit from **Technical audit**, and a mobile and desktop test from **Performance**.

## robots.txt and sitemap

`app/robots.ts` allows the site, disallows `/api/`, and points to `app/sitemap.ts`, which lists the single public URL (`https://www.pressdcafe.ae/`). `/admin` is intentionally **not** disallowed: its pages send `noindex`, and a robots.txt block would hide that from crawlers. After deploying, submit `https://www.pressdcafe.ae/sitemap.xml` in Search Console (SEO Studio itself never submits anything).

## What's honest about the data

- **Audit findings** come from the HTML the crawler actually received from `SEO_SITE_URL`. A 200 response or a sitemap listing is never treated as "indexed"; only URL Inspection (Search Console page) reports Google's index status.
- **Title and description length thresholds** are editable guidance (Settings), not Google rules.
- **PageSpeed** separates Lighthouse *lab* scores (one simulated run) from *field* Core Web Vitals (real Chrome users, 28 days). Field data appears only when Google has enough traffic.
- **Search Console** numbers are shown only when connected, with the property, date range (Pacific Time, excluding the last ~3 days) and fetch time. Query tables omit anonymised queries, so they don't add up to the totals.
- **Issues are never auto-closed.** They close only when someone confirms the fix or a recheck no longer finds the problem. A fixed issue found again is reopened.

## Architecture notes

- **Routes:** `app/admin/**` has its own root layout and stylesheet, separate from the public site (`app/(site)/**`). Unknown URLs use `app/global-not-found.tsx`, which renders the same 404 as before.
- **Authorization:** every page and API route checks the session and role on the server (`lib/seo/auth/guard.ts`). `proxy.ts` only rejects requests with no session cookie early, and adds `X-Robots-Tag: noindex` to everything under `/admin`.
- **Crawling:** the crawler (`lib/seo/core/crawler.ts`) runs in time-boxed steps of about 20 seconds that are saved to the database, so it fits serverless limits. It only fetches `https://` on the configured host, re-checks every redirect hop, refuses private, loopback and link-local addresses, respects robots.txt and has hard page, depth, size and time limits.
- **Metadata:** defaults are in `lib/siteMetadata.ts`. Published overrides are read by `generateMetadata` in `app/(site)/layout.tsx`, with a 2-second timeout that falls back to the defaults. Only `/` exists as a public route. About, Menu, Visit and the other sections are `#anchors` on that page, so they can't have their own metadata unless they become separate routes.
