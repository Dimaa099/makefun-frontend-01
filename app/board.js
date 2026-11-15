// The bounty board: every open bounty on one dense screen, from a single API
// answer (the list endpoint already carries each bounty's live pot, entry fee,
// deadline and entry count, so the board costs exactly one request).
//
// Bounties still taking entries come first, soonest deadline first; a bounty
// past its deadline may still read "open" in the API until its results are
// published, so the board judges by the deadline and lists those after, as
// closed. Search, category and sort re-render from the cached answer — no
// refetch, no page rebuild beyond the table body.

import { getBoard } from './api.js';
import { count, day, entriesWord, esc, money, msLeft, timeLeft, urgency } from './format.js';

const state = { items: [], query: '', category: 'all', sort: 'ending' };

const accepting = (b) => msLeft(b.deadline) > 0;
const potOf = (b) => Number(b.potUsd ?? b.rewardAmount ?? 0);

function summary(items) {
  const open = items.filter(accepting);
  const pot = items.reduce((sum, b) => sum + potOf(b), 0);
  const soon = open.filter((b) => msLeft(b.deadline) < 48 * 3600000).length;
  const entries = items.reduce((sum, b) => sum + Number(b.submissionCount ?? 0), 0);
  return `
    <div class="stats" role="list">
      <div class="stat" role="listitem"><span class="stat-num">${money(pot)}</span><span class="stat-label">in live pots right now</span></div>
      <div class="stat" role="listitem"><span class="stat-num">${open.length}</span><span class="stat-label">bounties taking entries</span></div>
      <div class="stat" role="listitem"><span class="stat-num">${soon}</span><span class="stat-label">closing within 48 hours</span></div>
      <div class="stat" role="listitem"><span class="stat-num">${count(entries)}</span><span class="stat-label">entries submitted</span></div>
    </div>`;
}

function row(b) {
  const open = accepting(b);
  const fee = b.entryFeeUsd != null && Number(b.entryFeeUsd) > 0
    ? `<span class="fee">${money(b.entryFeeUsd)} fee</span>`
    : '<span class="fee free">Free entry</span>';
  return `
    <tr class="${open ? '' : 'is-closed'}">
      <td class="c-title">
        <a class="bounty-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <span class="c-meta">${esc(b.category || 'Bounty')} · by ${esc(b.sponsor?.name || 'make.fun')}</span>
      </td>
      <td class="c-pot">${money(potOf(b))}</td>
      <td class="c-fee">${fee}</td>
      <td class="c-time"><span class="pill ${urgency(b.deadline)}">${open ? timeLeft(b.deadline) : 'Closed'}</span>
        <span class="c-meta">${day(b.deadline)}</span></td>
      <td class="c-entries">${entriesWord(b.submissionCount)}</td>
      <td class="c-links"><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></td>
    </tr>`;
}

function visible() {
  let items = state.items.slice();
  if (state.category !== 'all') items = items.filter((b) => (b.category || 'Bounty') === state.category);
  if (state.query) {
    const q = state.query.toLowerCase();
    items = items.filter((b) => `${b.title} ${b.category || ''} ${b.slug}`.toLowerCase().includes(q));
  }
  const by = {
    ending: (a, b) => Number(accepting(b)) - Number(accepting(a)) || new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => potOf(b) - potOf(a),
    entries: (a, b) => Number(b.submissionCount ?? 0) - Number(a.submissionCount ?? 0),
  }[state.sort];
  return items.sort(by);
}

function table() {
  const items = visible();
  if (!items.length) return '<p class="empty">No bounties match that filter.</p>';
  return `
    <div class="tablewrap">
      <table class="board-table">
        <thead><tr>
          <th scope="col">Bounty</th><th scope="col">Live pot</th><th scope="col">Entry fee</th>
          <th scope="col">Time left</th><th scope="col">Entries</th><th scope="col"><span class="sr">More</span></th>
        </tr></thead>
        <tbody>${items.map(row).join('')}</tbody>
      </table>
    </div>`;
}

/** Render the board into the given element (one API request, then local filtering). */
export async function boardView(app) {
  const data = await getBoard();
  state.items = data.items || [];
  document.title = 'Bounty board — Ledgerline for make.fun';
  const categories = [...new Set(state.items.map((b) => b.category || 'Bounty'))].sort();
  app.innerHTML = `
    <section class="board-head">
      <h1>Live bounties</h1>
      <p class="lede">Every bounty open on make.fun right now. The pot is live: the prize plus
      every entry fee paid in so far. Soonest deadline first.</p>
      ${summary(state.items)}
      <form class="controls" id="board-controls" role="search">
        <label class="ctl grow">Search
          <input id="f-query" type="search" placeholder="Title, category or slug" autocomplete="off">
        </label>
        <label class="ctl">Category
          <select id="f-category">
            <option value="all">All categories</option>
            ${categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </label>
        <label class="ctl">Sort by
          <select id="f-sort">
            <option value="ending">Ending soonest</option>
            <option value="pot">Biggest pot</option>
            <option value="entries">Most entries</option>
          </select>
        </label>
      </form>
    </section>
    <section id="board-table">${table()}</section>`;
  const refresh = () => {
    document.getElementById('board-table').innerHTML = table();
  };
  document.getElementById('f-query').addEventListener('input', (e) => { state.query = e.target.value; refresh(); });
  document.getElementById('f-category').addEventListener('change', (e) => { state.category = e.target.value; refresh(); });
  document.getElementById('f-sort').addEventListener('change', (e) => { state.sort = e.target.value; refresh(); });
}
