// Assembles the Search Console report from cached API calls.

import { cached, declines, querySearchAnalytics, rangesFor, totalsOf, listSitemaps, type GscDeps, type Row } from "./gsc.ts";

const TTL = 6 * 3600_000;

export async function buildReport(deps: GscDeps, property: string, days: number, force: boolean) {
  const { current, previous } = rangesFor(days, new Date());
  const k = (name: string, r: { startDate: string; endDate: string }) => `${property}|${name}|${r.startDate}|${r.endDate}`;
  const q = (name: string, r: typeof current, dims: Parameters<typeof querySearchAnalytics>[2], limit: number) =>
    cached<Row[]>(deps.db, k(name, r), TTL, () => querySearchAnalytics(deps, r, dims, limit), force);

  const [totals, prevTotals, byDate, queries, prevQueries, pages, prevPages, devices, countries, sitemaps] = await Promise.all([
    q("totals", current, [], 1),
    q("totals", previous, [], 1),
    q("date", current, ["date"], 500),
    q("query", current, ["query"], 1000),
    q("query", previous, ["query"], 1000),
    q("page", current, ["page"], 1000),
    q("page", previous, ["page"], 1000),
    q("device", current, ["device"], 10),
    q("country", current, ["country"], 50),
    cached(deps.db, `${property}|sitemaps`, TTL, () => listSitemaps(deps), force),
  ]);

  return {
    property,
    ranges: { current, previous },
    fetchedAt: totals.fetchedAt,
    fromCache: totals.fromCache,
    totals: totalsOf(totals.data),
    previousTotals: totalsOf(prevTotals.data),
    byDate: byDate.data,
    queries: queries.data.slice(0, 100),
    queriesReturned: queries.data.length,
    pages: pages.data.slice(0, 100),
    pagesReturned: pages.data.length,
    devices: devices.data,
    countries: countries.data.slice(0, 15),
    decliningPages: declines(pages.data, prevPages.data).slice(0, 25),
    decliningQueries: declines(queries.data, prevQueries.data).slice(0, 25),
    sitemaps: sitemaps.data,
  };
}

export type GscReport = Awaited<ReturnType<typeof buildReport>>;
