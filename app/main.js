// Ledgerline's router. Hash routes, one per surface:
//
//   #/                              the bounty board
//   #/bounty/<slug>                 a bounty's page
//   #/bounty/<slug>/leaderboard    that bounty's leaderboard
//   #/u/<handle>                    an account's public profile
//
// The board ships in the first load; the other three views load lazily with
// import() the first time a route asks for them, so the board paints fast.
// window.__shotReady is false while a route loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { boardView } from './board.js';

const app = document.getElementById('app');

const lazy = {
  bounty: () => import('./bounty.js'),
  leaderboard: () => import('./leaderboard.js'),
  profile: () => import('./profile.js'),
};

function route(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1] && parts.length === 2) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1] };
  if (parts[0] === 'u' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

function loading(label) {
  app.innerHTML = `<p class="loading" role="status">${label}</p>`;
}

function failed(error) {
  app.innerHTML = `
    <section class="notice error">
      <h1>That page could not be loaded</h1>
      <p>${String(error && error.message ? error.message : error)}</p>
      <p><a href="#/">Back to the bounty board</a></p>
    </section>`;
}

let navigation = 0;

async function render() {
  const mine = ++navigation;
  const target = route(location.hash);
  window.__shotReady = false;
  try {
    if (target.name === 'board') {
      loading('Loading the live bounties…');
      await boardView(app);
    } else {
      loading('Loading…');
      const view = await lazy[target.name]();
      if (target.name === 'bounty') await view.bountyView(app, target.slug);
      if (target.name === 'leaderboard') await view.leaderboardView(app, target.slug);
      if (target.name === 'profile') await view.profileView(app, target.handle);
    }
  } catch (error) {
    if (mine === navigation) failed(error);
  }
  if (mine === navigation) {
    window.scrollTo(0, 0);
    window.__shotReady = true;
  }
}

window.addEventListener('hashchange', render);
render();
