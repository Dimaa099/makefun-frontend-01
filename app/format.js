// Ledgerline's display helpers: escaping, money, dates, countdowns and scores.
// Everything here is pure and tiny; the views compose these into HTML strings.

/** Escape a value for safe insertion into HTML text or attribute context. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A USD amount ('505.50', 100, '0.50') as '$505.50' or '$100': cents only when they matter. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A count with thousands separators. */
export const count = (n) => Number(n ?? 0).toLocaleString('en-US');

/** '1 entry' / '42 entries'. */
export const entriesWord = (n) => `${count(n)} ${Number(n) === 1 ? 'entry' : 'entries'}`;

/** An ISO instant as 'Nov 17, 2026, 12:30 PM UTC'. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** An ISO date as just the day: 'Nov 17, 2026'. */
export function day(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Milliseconds until an ISO instant (negative once it has passed). */
export const msLeft = (iso) => new Date(iso).getTime() - Date.now();

/** A deadline as a countdown: '2d 4h left', '35m left', 'closing…' under a minute, 'ended'. */
export function timeLeft(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'closing…';
}

/** Urgency bucket for styling a countdown: 'soon' under 24h, 'hot' under 2h, 'ended' past due. */
export function urgency(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  if (ms < 2 * 3600000) return 'hot';
  if (ms < 24 * 3600000) return 'soon';
  return 'calm';
}

/** A judge win rate in micro units (962052) as a percent ('96.21%'). */
export function microPct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(2)}%`;
}

/** A byte count as '1.5 MB' / '812 KB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
  if (v >= 1024) return `${Math.round(v / 1024)} KB`;
  return `${v} B`;
}

/** A Solana address shortened for display: '2dGv3G…o1rFW'. */
export function shortAddress(address) {
  const a = String(address ?? '');
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-5)}` : a;
}
