// A bounty's leaderboard. The API answers with the whole field in one response
// (there is no server-side paging), so this view fetches it once — through the
// ETag cache in api.js — and pages and filters on the client: 50 rows at a
// time, no further requests while you browse the table.
//
// Columns come from the answer itself: each competition names its own score
// columns (a judge win rate, a net PnL, a size), and rows carry a raw value
// plus the API's own display string per column. Judge rates arrive in micro
// units and are shown as percents; everything else uses the display string.

import { getLeaderboard } from './api.js';
import { bytes, count, esc, microPct } from './format.js';

const PAGE_SIZE = 50;

function cellValue(entry, column) {
  const raw = entry.values ? entry.values[column.key] : undefined;
  if (column.key === 'judge' || column.key === 'judge_low' || column.key === 'judge_high') return microPct(raw);
  if (column.key === 'valid') return Number(raw) === 1 ? '✓ valid' : '—';
  if (column.key === 'bytes') return bytes(raw);
  const shown = entry.display ? entry.display[column.key] : undefined;
  return shown != null && shown !== '' ? esc(shown) : raw != null ? esc(raw) : '—';
}

function entrantCell(entry) {
  const tags = [
    entry.house ? '<span class="tag">house</span>' : '',
    entry.baseline ? '<span class="tag">baseline</span>' : '',
    entry.prize_eligible ? '<span class="tag paid">paid place</span>' : '',
  ].join('');
  return `
    <a class="entrant" href="#/u/${encodeURIComponent(entry.handle)}">@${esc(entry.handle)}</a>${tags}
    <span class="c-meta entry-title">${esc(entry.title || '')}</span>`;
}

function tablePage(data, page, query) {
  const columns = (data.columns || []).filter((c) => !c.hidden);
  let entries = data.entries || [];
  if (query) {
    const q = query.toLowerCase();
    entries = entries.filter((e) => `${e.handle} ${e.title || ''}`.toLowerCase().includes(q));
  }
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const at = Math.min(page, pages);
  const slice = entries.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE);
  const head = ['#', 'Entrant', ...columns.map((c) => c.title)]
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join('');
  const rows = slice
    .map((e) => `<tr>
      <td class="c-rank">${e.rank ?? ''}</td>
      <td class="c-entrant">${entrantCell(e)}</td>
      ${columns.map((c) => `<td class="c-score">${cellValue(e, c)}</td>`).join('')}
    </tr>`)
    .join('');
  return {
    pages,
    at,
    total: entries.length,
    html: slice.length
      ? `<div class="tablewrap"><table class="lb-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
      : '<p class="empty">No entries match.</p>',
  };
}

function pager(pages, at) {
  if (pages <= 1) return '';
  const buttons = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - at) <= 1) {
      buttons.push(`<button type="button" class="page-btn ${p === at ? 'current' : ''}" data-page="${p}">${p}</button>`);
    } else if (buttons[buttons.length - 1] !== '<span class="gap">…</span>') buttons.push('<span class="gap">…</span>');
  }
  return `<nav class="pager" aria-label="Leaderboard pages">
    <button type="button" class="page-btn" data-page="${at - 1}" ${at <= 1 ? 'disabled' : ''}>← Prev</button>
    ${buttons.join('')}
    <button type="button" class="page-btn" data-page="${at + 1}" ${at >= pages ? 'disabled' : ''}>Next →</button>
  </nav>`;
}

/** Render one bounty's leaderboard into the given element. */
export async function leaderboardView(app, slug) {
  const data = await getLeaderboard(slug);
  const comp = data.competition || {};
  document.title = `${comp.title || slug} leaderboard — Ledgerline for make.fun`;
  const state = { page: 1, query: '' };
  app.innerHTML = `
    <p class="crumbs"><a href="#/">← All bounties</a> · <a href="#/bounty/${encodeURIComponent(slug)}">Bounty page</a></p>
    <section class="lb-head">
      <h1>${esc(comp.title || slug)} — leaderboard</h1>
      <p class="lede">${esc(data.phase?.title || 'Results')} · ${count((data.entries || []).length)} ranked entries
      ${data.metrics_withheld ? ' · some scores are withheld in this phase' : ''}</p>
      <form class="controls" role="search">
        <label class="ctl grow">Filter entries
          <input id="lb-query" type="search" placeholder="Handle or entry title" autocomplete="off">
        </label>
      </form>
    </section>
    <section id="lb-body"></section>`;
  const body = document.getElementById('lb-body');
  const draw = () => {
    const view = tablePage(data, state.page, state.query);
    body.innerHTML = `${pager(view.pages, view.at)}${view.html}${pager(view.pages, view.at)}`;
    body.querySelectorAll('.page-btn[data-page]').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.page = Number(btn.dataset.page);
        draw();
      }),
    );
  };
  draw();
  document.getElementById('lb-query').addEventListener('input', (e) => {
    state.query = e.target.value;
    state.page = 1;
    draw();
  });
}
