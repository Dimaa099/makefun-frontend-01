// Ledgerline's API layer: read-only GETs against make.fun's public API, with an
// ETag revalidation cache. The API binds its ETags to the minute, so a repeat view
// inside the same minute costs one 304 and no body; the cache below keeps the last
// body per URL and sends it back as If-None-Match. In-flight requests are deduped,
// so two views asking for the same URL at once share a single fetch.

const API_BASE = 'https://make.fun/api';

const etagCache = new Map(); // url -> { etag, body }
const inflight = new Map(); // url -> Promise<body>

async function fetchBody(url) {
  const hit = etagCache.get(url);
  const headers = hit && hit.etag ? { 'If-None-Match': hit.etag } : {};
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) return hit.body;
  if (!res.ok) throw new Error(`make.fun API answered ${res.status} for ${url}`);
  const body = await res.json();
  const etag = res.headers.get('ETag');
  if (etag) etagCache.set(url, { etag, body });
  return body;
}

/** GET one API path as JSON, revalidating against the cache. */
export function getJSON(path) {
  const url = API_BASE + path;
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetchBody(url).finally(() => inflight.delete(url));
    inflight.set(url, pending);
  }
  return pending;
}

/** The bounty board: every open bounty with its live pot, fee and deadline in one answer. */
export const getBoard = () => getJSON('/competitions?status=open&activity=times');

/** One bounty's full page: description, rules, live rewards table, dates. */
export const getBounty = (slug) => getJSON(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard: columns plus every ranked entry (paginated on the client). */
export const getLeaderboard = (slug) => getJSON(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** One account's public profile: record, solutions and payouts. */
export const getProfile = (handle) => getJSON(`/profiles/${encodeURIComponent(handle)}`);
