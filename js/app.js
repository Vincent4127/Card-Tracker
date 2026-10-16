/* Screens and navigation. Routes:
   #/              home
   #/new/<type>    game setup
   #/game/<id>     scoreboard and rounds */
(function () {
  const VR = window.VR;
  const { h } = VR;
  const app = document.getElementById('app');

  function mount(...nodes) {
    app.replaceChildren(...nodes.flat().filter(Boolean));
    window.scrollTo(0, 0);
  }

  function logo(size) {
    return h('span', { class: 'logo ' + (size || ''), 'aria-hidden': 'true' },
      h('span', { class: 'logo-pip tl' }, '♥'),
      h('span', { class: 'logo-v' }, 'V'),
      h('span', { class: 'logo-r' }, 'R'),
      h('span', { class: 'logo-pip br' }, '♠'));
  }

  function topbar({ back, title, sub, right }) {
    return h('header', { class: 'topbar' },
      back ? h('a', { class: 'icon-btn', href: back, 'aria-label': 'Back' }, '‹') : logo('sm'),
      h('div', { class: 'topbar-title' },
        h('div', { class: 'tt' }, title),
        sub && h('div', { class: 'ts', lang: 'ar' }, sub)),
      right || h('span', { class: 'icon-spacer' }));
  }

  /* ---------- game state ---------- */

  // A game is over at the first round where the rules report a winner.
  function resolve(game) {
    const mod = VR.games[game.type];
    game.result = null;
    for (let k = 1; k <= game.rounds.length; k++) {
      const w = mod.winner(game, game.rounds.slice(0, k));
      if (w) { game.result = w; break; }
    }
    game.finished = !!game.result;
  }

  function commit(game) {
    resolve(game);
    VR.store.put(game);
    route();
  }

  function newGame(type, players, teamNames, settings) {
    const game = {
      id: VR.uid(), type, players, teamNames,
      settings: JSON.parse(JSON.stringify(settings)),
      rounds: [], createdAt: Date.now(), finished: false, result: null,
    };
    VR.store.put(game);
    location.hash = '#/game/' + game.id;
  }

  const playAgain = (game) => newGame(game.type, game.players, game.teamNames, game.settings);

  function undoLast(game) {
    game.rounds.pop();
    commit(game);
  }

  /* ---------- home ---------- */

  function renderHome() {
    document.title = 'VR · Card Score Tracker';
    const games = VR.store.all();
    const live = games.find((g) => !g.finished && VR.games[g.type]);

    mount(h('div', { class: 'screen home' },
      h('section', { class: 'hero' },
        h('h1', { class: 'sr-only' }, 'VR'),
        h('div', { class: 'hero-cards' }, h('span', { class: 'back-card', 'aria-hidden': 'true' }), logo('lg')),
        h('p', { class: 'hero-sub' }, 'Score tracker for 400, Tarneeb & Leekha'),
        h('p', { class: 'hero-ar', lang: 'ar', dir: 'rtl' }, 'أربعمية · طرنيب · ليخة')),

      live && h('a', { class: 'resume', href: '#/game/' + live.id },
        h('span', { class: 'resume-label' }, 'Continue game'),
        h('span', { class: 'resume-title' }, `${VR.games[live.type].name} · Round ${live.rounds.length + 1}`),
        h('span', { class: 'resume-players' }, live.players.join(' · ')),
        h('span', { class: 'resume-arrow', 'aria-hidden': 'true' }, '›')),

      h('h2', { class: 'section-title' }, 'New game'),
      h('div', { class: 'game-grid' }, Object.values(VR.games).map((m) =>
        h('a', { class: 'game-card', href: '#/new/' + m.id },
          h('span', { class: 'gc-suit' + (m.suitRed ? ' red' : ''), 'aria-hidden': 'true' }, m.suit),
          h('span', { class: 'gc-body' },
            h('span', { class: 'gc-name' }, m.name, h('span', { class: 'gc-ar', lang: 'ar' }, m.arabic)),
            h('span', { class: 'gc-blurb' }, m.blurb),
            h('span', { class: 'gc-meta' }, m.meta)),
          h('span', { class: 'gc-go', 'aria-hidden': 'true' }, '›')))),

      games.length > 0 && [
        h('h2', { class: 'section-title' }, 'Recent games'),
        h('ul', { class: 'recent' }, games.filter((g) => VR.games[g.type]).slice(0, 12).map(recentItem)),
      ],

      h('p', { class: 'foot-note' }, 'Games are saved on this device.')));
  }

  function recentItem(g) {
    const mod = VR.games[g.type];
    const date = new Date(g.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const status = g.finished && g.result ? g.result.title : `In progress · round ${g.rounds.length + 1}`;
    return h('li', { class: 'recent-item' },
      h('a', { class: 'recent-link', href: '#/game/' + g.id },
        h('span', { class: 'recent-badge' + (mod.suitRed ? ' red' : '') }, mod.suit),
        h('span', { class: 'recent-text' },
          h('span', { class: 'recent-title' }, `${mod.name} · ${g.players.join(', ')}`),
          h('span', { class: 'recent-sub' + (g.finished ? ' done' : '') }, `${status} · ${date}`))),
      h('button', { type: 'button', class: 'recent-del', 'aria-label': `Delete ${mod.name} game`,
        onClick: () => { if (confirm('Delete this game?')) { VR.store.remove(g.id); renderHome(); } } }, '✕'));
  }

  /* ---------- setup ---------- */

  function renderSetup(type) {
    const mod = VR.games[type];
    const prefs = VR.store.prefs();
    const state = {
      players: [0, 1, 2, 3].map((i) => (prefs.players && prefs.players[i]) || ''),
      teamNames: (prefs.teamNames || ['Team 1', 'Team 2']).slice(),
      settings: Object.assign(mod.defaultSettings(), (prefs.settings || {})[type]),
    };
    document.title = `New ${mod.name} game · VR`;

    const settingsBox = h('div', { class: 'panel' });
    const drawSettings = () =>
      settingsBox.replaceChildren(...[].concat(mod.settingsForm(state.settings, drawSettings)));
    drawSettings();

    const seat = (i, pos) =>
      h('div', { class: `seat pos-${pos} ${mod.teams ? VR.TEAM_CLASS[VR.teamOf(i)] : 'seat-' + i}` },
        h('input', {
          class: 'seat-input', type: 'text', maxlength: '14', autocomplete: 'off',
          placeholder: 'Player ' + (i + 1), value: state.players[i], 'aria-label': `Player ${i + 1} name`,
          onInput: (e) => { state.players[i] = e.target.value; },
        }));

    function start() {
      const players = state.players.map((p, i) => p.trim() || 'Player ' + (i + 1));
      const teamNames = state.teamNames.map((t, k) => t.trim() || 'Team ' + (k + 1));
      VR.store.savePrefs({
        players: state.players.map((p) => p.trim()),
        teamNames,
        settings: Object.assign({}, prefs.settings, { [type]: state.settings }),
      });
      newGame(type, players, teamNames, state.settings);
    }

    mount(h('div', { class: 'screen setup' },
      topbar({ back: '#/', title: `New ${mod.name} game`, sub: mod.arabic }),

      h('h2', { class: 'section-title' }, 'Players'),
      h('div', { class: 'table-layout' },
        seat(2, 'top'), seat(3, 'left'),
        h('div', { class: 'felt-table' },
          h('span', { class: 'table-note' }, mod.teams ? 'Partners sit across' : 'Every player for themselves')),
        seat(1, 'right'), seat(0, 'bottom')),
      h('p', { class: 'setup-hint' }, 'Enter names in seating order. Play goes counter-clockwise.'),

      mod.teams && h('div', { class: 'team-names' }, [0, 1].map((k) =>
        h('label', { class: 'team-name-field ' + VR.TEAM_CLASS[k] },
          h('span', { class: 'team-dot', 'aria-hidden': 'true' }),
          h('input', { class: 'team-input', type: 'text', maxlength: '16', value: state.teamNames[k],
            'aria-label': `Team ${k + 1} name`, onInput: (e) => { state.teamNames[k] = e.target.value; } })))),

      h('h2', { class: 'section-title' }, 'Rules'),
      settingsBox,

      h('div', { class: 'dock' },
        h('button', { type: 'button', class: 'btn btn-primary btn-block', onClick: start }, 'Start game'))));
  }

  /* ---------- game ---------- */

  function renderGame(id) {
    const game = VR.store.get(id);
    if (!game || !VR.games[game.type]) { location.hash = '#/'; return; }
    const mod = VR.games[game.type];
    const n = game.rounds.length;
    document.title = `${mod.name} · VR`;

    mount(h('div', { class: 'screen game-screen' },
      topbar({
        back: '#/', title: mod.name, sub: mod.arabic,
        right: h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Rules and options', onClick: () => openRules(game) }, '⋯'),
      }),
      h('div', { class: 'round-strip' },
        h('span', null, game.finished ? 'Game over' : `Round ${n + 1}`),
        !game.finished && h('span', null, 'Dealer · ', h('b', null, game.players[n % 4]))),

      mod.scoreboard(game, game.rounds),

      game.finished && game.result && h('section', { class: 'winner-banner' },
        h('div', { class: 'wb-mark', 'aria-hidden': 'true' }, '♛'),
        h('div', { class: 'wb-title' }, game.result.title),
        h('div', { class: 'wb-detail' }, game.result.detail),
        h('div', { class: 'wb-actions' },
          h('button', { type: 'button', class: 'btn btn-dark', onClick: () => playAgain(game) }, 'Play again'),
          h('button', { type: 'button', class: 'btn btn-outline-dark', onClick: () => undoLast(game) }, 'Undo last round'))),

      h('section', { class: 'history' },
        h('h2', { class: 'section-title' }, 'Rounds', h('span', { class: 'count' }, n)),
        n
          ? h('ol', { class: 'hist-list' }, game.rounds.map((r, i) =>
              h('li', null,
                h('button', { type: 'button', class: 'hist-btn', 'aria-label': `Edit round ${i + 1}`, onClick: () => openRound(game, i) },
                  h('span', { class: 'hist-no' }, i + 1),
                  mod.historyRow(game, r, game.rounds.slice(0, i)),
                  h('span', { class: 'hist-edit', 'aria-hidden': 'true' }, '✎')))).reverse())
          : h('p', { class: 'empty' }, 'No rounds yet. Tap “Add round” after the first hand.')),

      !game.finished && h('div', { class: 'dock' },
        h('button', { type: 'button', class: 'btn btn-primary btn-block', onClick: () => openRound(game, null) },
          `+ Add round ${n + 1}`))));
  }

  function openRound(game, index) {
    const mod = VR.games[game.type];
    const editing = index != null;
    const before = game.rounds.slice(0, editing ? index : game.rounds.length);
    const draft = editing ? JSON.parse(JSON.stringify(game.rounds[index])) : mod.blankRound(game, before);

    VR.sheet({
      title: editing ? `Edit round ${index + 1}` : `Round ${before.length + 1}`,
      body: (refresh) => h('div', { class: 'form' }, mod.form(game, draft, before, refresh)),
      footer: (refresh, close) => {
        const error = mod.validate(game, draft, before);
        return [
          error && h('p', { class: 'form-error', role: 'alert' }, error),
          h('div', { class: 'sheet-actions' },
            editing && h('button', { type: 'button', class: 'btn btn-danger-ghost',
              onClick: () => {
                if (!confirm(`Delete round ${index + 1}?`)) return;
                game.rounds.splice(index, 1);
                close();
                commit(game);
              } }, 'Delete'),
            h('button', { type: 'button', class: 'btn btn-primary grow', disabled: !!error,
              onClick: () => {
                const wasFinished = game.finished;
                if (editing) game.rounds[index] = draft;
                else game.rounds.push(draft);
                close();
                commit(game);
                if (game.finished && !wasFinished) showWinner(game);
              } }, editing ? 'Save changes' : 'Save round')),
        ];
      },
    });
  }

  function openRules(game) {
    const mod = VR.games[game.type];
    VR.sheet({
      title: `${mod.name} rules`,
      body: () => [
        h('ul', { class: 'rules-list' }, mod.settingsSummary(game.settings).map((line) => h('li', null, line))),
        h('div', { class: 'field' },
          h('div', { class: 'field-label' }, 'Players'),
          h('div', { class: 'pchips static' }, game.players.map((name, i) =>
            h('span', { class: 'pchip ' + VR.colorClass(game, i) }, VR.avatar(game, i), h('span', { class: 'pname' }, name),
              mod.teams && h('span', { class: 'pchip-team' }, game.teamNames[VR.teamOf(i)]))))),
      ],
      footer: (refresh, close) => h('div', { class: 'sheet-actions' },
        h('button', { type: 'button', class: 'btn btn-danger-ghost', onClick: () => {
          if (!confirm('Delete this game? This cannot be undone.')) return;
          VR.store.remove(game.id);
          close();
          location.hash = '#/';
        } }, 'Delete game'),
        h('button', { type: 'button', class: 'btn btn-primary grow', onClick: () => { close(); playAgain(game); } }, 'New game, same players')),
    });
  }

  function showWinner(game) {
    const close = () => overlay.remove();
    const overlay = h('div', { class: 'win-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': game.result.title },
      h('div', { class: 'confetti', 'aria-hidden': 'true' }, Array.from({ length: 28 }, (_, i) =>
        h('span', { class: i % 4 === 1 || i % 4 === 2 ? 'red' : '',
          style: `left:${(i * 37) % 100}%;animation-delay:${(i % 9) * 0.22}s;animation-duration:${2.8 + (i % 5) * 0.45}s;font-size:${16 + (i % 4) * 6}px` },
          '♠♥♦♣'[i % 4]))),
      h('div', { class: 'win-card' },
        h('div', { class: 'win-mark', 'aria-hidden': 'true' }, '♛'),
        h('h2', { class: 'win-title' }, game.result.title),
        h('p', { class: 'win-detail' }, game.result.detail),
        h('div', { class: 'win-actions' },
          h('button', { type: 'button', class: 'btn btn-primary btn-block', onClick: () => { close(); playAgain(game); } }, 'Play again'),
          h('button', { type: 'button', class: 'btn btn-ghost btn-block', onClick: () => { close(); undoLast(game); } }, 'Oops, undo last round'),
          h('button', { type: 'button', class: 'btn btn-link', onClick: close }, 'See final scores'))));
    document.body.appendChild(overlay);
    overlay.querySelector('.btn-primary').focus();
  }

  /* ---------- router ---------- */

  function route() {
    document.querySelectorAll('.sheet-backdrop, .win-overlay').forEach((el) => el.remove());
    document.body.classList.remove('noscroll');
    const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
    if (page === 'new' && VR.games[arg]) renderSetup(arg);
    else if (page === 'game' && arg) renderGame(arg);
    else renderHome();
  }

  window.addEventListener('hashchange', route);
  route();
})();
