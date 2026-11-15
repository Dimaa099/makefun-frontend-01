// A bounty's page: what it asks for, what it pays (the rewards table priced
// with the live pot, entry fees included), and its dates and status — judged
// by its deadline, since a bounty past it may still read "open" in the API
// until its results are published. One API request for the whole page.

import { getBounty } from './api.js';
import { date, day, entriesWord, esc, money, msLeft, timeLeft } from './format.js';
import { md } from './md.js';

function statusLine(b) {
  if (msLeft(b.deadline) > 0) {
    return `<p class="status open-now"><span class="dot" aria-hidden="true"></span>
      Open for entries — closes ${date(b.deadline)} (${timeLeft(b.deadline)})</p>`;
  }
  return `<p class="status closed-now"><span class="dot off" aria-hidden="true"></span>
    Entries closed ${day(b.deadline)} — results are being settled</p>`;
}

function tiles(b) {
  const fee = b.entryFeeUsd != null && Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) : 'Free';
  const tiles = [
    ['Live pot', money(b.potUsd ?? b.rewardAmount)],
    ['Base prize', money(b.rewardAmount)],
    ['Entry fee', fee],
    ['Entries so far', entriesWord(b.submissionCount)],
    ['Opened', day(b.opensAt || b.publishedAt)],
    ['Deadline', day(b.deadline)],
  ];
  return `<div class="stats tiles">${tiles
    .map(([label, value]) => `<div class="stat"><span class="stat-num small">${value}</span><span class="stat-label">${label}</span></div>`)
    .join('')}</div>`;
}

function rewardsTable(b) {
  const now = Array.isArray(b.rewardsNow) ? b.rewardsNow : [];
  if (now.length) {
    const rows = now
      .map((r) => `<tr><td>${placeLabel(r.place)}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td class="c-pot">${money(r.amountUsd)}</td></tr>`)
      .join('');
    return `
      <h2>Rewards — the live pot, split</h2>
      <p class="note">The pot is the base prize plus every entry fee paid in; each place's share
      below already includes its cut of those fees.</p>
      <div class="tablewrap"><table class="rewards-table">
        <thead><tr><th scope="col">Place</th><th scope="col">Base prize</th><th scope="col">Fee share</th><th scope="col">Pays now</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }
  const places = Object.entries(b.rewards || {}).sort((a, c) => Number(a[0]) - Number(c[0]));
  if (!places.length) return '';
  const rows = places.map(([place, amount]) => `<tr><td>${placeLabel(place)}</td><td class="c-pot">${money(amount)}</td></tr>`).join('');
  return `
    <h2>Rewards</h2>
    <div class="tablewrap"><table class="rewards-table">
      <thead><tr><th scope="col">Place</th><th scope="col">Prize</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

const placeLabel = (place) => {
  const n = Number(place);
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
};

/** Render one bounty's page into the given element. */
export async function bountyView(app, slug) {
  const b = await getBounty(slug);
  document.title = `${b.title} — Ledgerline for make.fun`;
  const skills = (b.skills || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('');
  app.innerHTML = `
    <p class="crumbs"><a href="#/">← All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
    <article class="bounty-page">
      <h1>${esc(b.title)}</h1>
      <p class="lede">${esc(b.summary || '')}</p>
      ${statusLine(b)}
      ${tiles(b)}
      ${skills ? `<p class="chips" aria-label="Skills">${skills}</p>` : ''}
      ${rewardsTable(b)}
      <h2>About this bounty</h2>
      <div class="prose">${md(b.description || '')}</div>
      ${b.rules ? `<h2>Rules</h2><div class="prose">${md(b.rules)}</div>` : ''}
      <p class="actions">
        <a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">See the leaderboard</a>
        <a class="button ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}" rel="noopener">Enter on make.fun ↗</a>
      </p>
    </article>`;
}
