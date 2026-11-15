// An account's public profile: who they are, their record across every bounty
// they have entered, and each of their solutions with its score and placement,
// linking back to the bounties. One API request for the whole page.
//
// Avatars come from the API's own answers and are served with
// Cross-Origin-Resource-Policy: same-origin, so the <img> carries
// crossorigin="anonymous" (set in the markup, before the src is read).

import { getProfile } from './api.js';
import { count, day, esc, microPct, money, shortAddress } from './format.js';

function avatar(p) {
  const url = p.avatar || p.image;
  if (url) return `<img class="avatar" crossorigin="anonymous" src="${esc(url)}" alt="" width="72" height="72">`;
  const initials = (p.display_name || p.handle || '?').trim().slice(0, 2).toUpperCase();
  return `<span class="avatar initials" aria-hidden="true">${esc(initials)}</span>`;
}

function recordTiles(record) {
  const r = record || {};
  const tiles = [
    ['Entered', count(r.competitions_entered)],
    ['Placed', count(r.competitions_placed)],
    ['Won', count(r.competitions_won)],
    ['Podiums', count(r.podium_finishes)],
    ['Best placement', r.best_placement ? `#${count(r.best_placement)}` : '—'],
    ['Prizes won', money(r.prize_usd ?? 0)],
  ];
  return `<div class="stats tiles">${tiles
    .map(([label, value]) => `<div class="stat"><span class="stat-num small">${value}</span><span class="stat-label">${label}</span></div>`)
    .join('')}</div>`;
}

function scoreText(solution) {
  const score = solution.score;
  if (!score || score.value == null) return '';
  const key = score.column?.key || '';
  let value;
  if (key === 'judge') value = microPct(score.value);
  else if (key === 'net_pnl') value = money(Number(score.value) / 1000000);
  else value = score.display ?? score.value;
  return `<span class="sol-score">${esc(score.column?.title || 'Score')}: <strong>${esc(value)}</strong></span>`;
}

function solutionRow(s) {
  const comp = s.competition || {};
  const placed = s.placement
    ? `<span class="tag paid">Placed #${count(s.placement)}${s.prize_usd ? ` · won ${money(s.prize_usd)}` : ''}</span>`
    : '';
  return `
    <li class="sol">
      <div class="sol-main">
        <a class="sol-comp" href="#/bounty/${encodeURIComponent(comp.slug)}">${esc(comp.title || comp.slug)}</a>
        <span class="c-meta">${esc(comp.category || '')} · entered ${day(s.entered_at)}</span>
        <span class="sol-title">${esc(s.title || 'Untitled entry')}</span>
      </div>
      <div class="sol-side">${scoreText(s)}${placed}</div>
    </li>`;
}

function payoutsList(payouts) {
  if (!Array.isArray(payouts) || !payouts.length) return '';
  const rows = payouts
    .map((p) => {
      const amount = p.amountUsd ?? p.amount_usd ?? p.amount ?? '';
      const label = p.competition?.title || p.title || p.competition_slug || 'Prize';
      const when = p.paid_at || p.created_at || p.date || '';
      return `<li class="sol"><div class="sol-main"><span class="sol-comp">${esc(label)}</span>
        <span class="c-meta">${when ? day(when) : ''}</span></div>
        <div class="sol-side"><span class="sol-score"><strong>${amount !== '' ? money(amount) : ''}</strong></span></div></li>`;
    })
    .join('');
  return `<h2>Payouts</h2><ul class="sols">${rows}</ul>`;
}

/** Render one account's public profile into the given element. */
export async function profileView(app, handle) {
  const p = await getProfile(handle);
  document.title = `@${p.handle} — Ledgerline for make.fun`;
  const name = p.display_name || p.handle;
  const badges = [p.house ? '<span class="tag">house account</span>' : '', p.demo ? '<span class="tag">demo</span>' : ''].join('');
  const wallet = p.wallet?.address
    ? `<p class="wallet">Wallet
        ${p.wallet.explorer_url
          ? `<a href="${esc(p.wallet.explorer_url)}" rel="noopener">${esc(shortAddress(p.wallet.address))} ↗</a>`
          : esc(shortAddress(p.wallet.address))}
      </p>`
    : '';
  const github = p.github_login
    ? `<p class="wallet">GitHub <a href="https://github.com/${encodeURIComponent(p.github_login)}" rel="noopener">@${esc(p.github_login)} ↗</a></p>`
    : '';
  app.innerHTML = `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <article class="profile-page">
      <header class="profile-head">
        ${avatar(p)}
        <div class="profile-id">
          <h1>${esc(name)} ${badges}</h1>
          <p class="handle-line">@${esc(p.handle)} · joined ${day(p.joined_at)}</p>
          ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
          ${wallet}${github}
        </div>
      </header>
      <h2>Record</h2>
      ${recordTiles(p.record)}
      <h2>Entries (${count((p.solutions || []).length)})</h2>
      ${p.solutions?.length
        ? `<ul class="sols">${p.solutions.map(solutionRow).join('')}</ul>`
        : '<p class="empty">No entries yet.</p>'}
      ${payoutsList(p.payouts)}
    </article>`;
}
