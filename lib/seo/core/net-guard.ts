// SSRF guard for every outbound crawler / PageSpeed target. Pure module; DNS
// lookup is injected so it can be tested without the network.

export type LookupFn = (hostname: string) => Promise<{ address: string; family: number }[]>;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function inV4Range(ip: number, base: string, bits: number): boolean {
  const b = ipv4ToInt(base)!;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ip & mask) === (b & mask);
}

function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);
  // embedded IPv4 tail (e.g. ::ffff:10.0.0.1)
  const v4 = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    if (n === null) return null;
    addr = addr.slice(0, -v4[1].length) + ((n >>> 16) & 0xffff).toString(16) + ":" + (n & 0xffff).toString(16);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 && missing !== 0) return null;
  if (missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out.length === 8 ? out : null;
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isBlockedAddress(ip: string): boolean {
  const v4 = ipv4ToInt(ip);
  if (v4 !== null) return V4_BLOCKED.some(([base, bits]) => inV4Range(v4, base, bits)) || v4 === 0xffffffff;
  const g = expandV6(ip);
  if (!g) return true; // unparseable → refuse
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  // IPv4-mapped / compatible / NAT64 → check the embedded IPv4 address
  const mapped = g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0);
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0);
  if (mapped || nat64) return isBlockedAddress(`${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`);
  return false;
}

export class BlockedTargetError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Blocked outbound request: ${reason}`);
    this.name = "BlockedTargetError";
    this.reason = reason;
  }
}

/**
 * Throws unless `url` is https, on an explicitly allowed host, uses the
 * default port, carries no credentials, is not an IP literal, and every DNS
 * answer for the host is a public address.
 */
export async function assertSafeTarget(url: URL, allowedHosts: readonly string[], lookup: LookupFn): Promise<void> {
  if (url.protocol !== "https:") throw new BlockedTargetError("only https is allowed");
  if (url.username || url.password) throw new BlockedTargetError("credentials in URL");
  if (url.port && url.port !== "443") throw new BlockedTargetError("non-default port");
  const host = url.hostname.toLowerCase();
  if (!allowedHosts.map((h) => h.toLowerCase()).includes(host)) throw new BlockedTargetError(`host ${host} is not approved`);
  if (ipv4ToInt(host) !== null || host.includes(":") || host.startsWith("[")) throw new BlockedTargetError("IP literal hosts are not allowed");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new BlockedTargetError("internal hostname");
  }
  const answers = await lookup(host);
  if (!answers.length) throw new BlockedTargetError("host did not resolve");
  for (const a of answers) if (isBlockedAddress(a.address)) throw new BlockedTargetError(`${host} resolves to a non-public address`);
}
