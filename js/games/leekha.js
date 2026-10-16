/* Leekha (ليخة): every player for themselves, no trump. Each heart is 1 point,
   the 10♦ is 10 and the Q♠ is 13 (36 per hand). Lowest score wins once
   anyone reaches the target. */
(function () {
  const VR = window.VR;
  const { h } = VR;

  const QUEEN = 13;
  const TEN = 10;

  function handPoints(r, i) {
    return r.hearts[i] + (r.queen === i ? QUEEN : 0) + (r.ten === i ? TEN : 0);
  }

  function totals(rounds) {
    const t = [0, 0, 0, 0];
    for (const r of rounds) for (let i = 0; i < 4; i++) t[i] += handPoints(r, i);
    return t;
  }

  VR.games.leekha = {
    id: 'leekha',
    name: 'Leekha',
    arabic: 'ليخة',
    suit: '♦',
    suitRed: true,
    teams: false,
    blurb: 'Every player for themselves. Dodge the hearts, the Q♠ and the 10♦.',
    meta: '4 players · solo',

    defaultSettings: () => ({ target: 101 }),

    settingsForm(s, rerender) {
      return [
        VR.field('Game ends at',
          VR.seg([61, 101, 151].map((v) => ({ value: v, label: String(v) })), s.target, (v) => { s.target = v; rerender(); }),
          h('p', { class: 'hint' }, 'When anyone reaches this score the game ends and the lowest score wins.')),
      ];
    },

    settingsSummary: (s) => [
      'Each heart: 1 point',
      '10♦: 10 points, Q♠: 13 points (36 per hand)',
      `Game ends when someone reaches ${s.target}`,
      'Lowest score wins',
    ],

    blankRound: () => ({ hearts: [0, 0, 0, 0], queen: null, ten: null }),

    validate(game, draft) {
      const hearts = VR.sum(draft.hearts);
      if (hearts !== 13) return `Hearts must add up to 13 (now ${hearts}).`;
      if (draft.queen == null) return 'Who took the Q♠?';
      if (draft.ten == null) return 'Who took the 10♦?';
      return null;
    },

    form(game, draft, before, rerender) {
      const hearts = VR.sum(draft.hearts);
      return [
        h('div', { class: 'form-status ' + (hearts === 13 ? 'ok' : 'bad') },
          h('span', null, 'Hearts counted'), h('strong', null, hearts), h('span', { class: 'fs-min' }, 'of 13')),
        game.players.map((name, i) =>
          h('div', { class: 'entry' },
            h('div', { class: 'entry-top' },
              VR.playerTag(game, i),
              h('span', { class: 'entry-pts' + (handPoints(draft, i) ? ' neg' : '') }, VR.signed(handPoints(draft, i)))),
            h('div', { class: 'entry-controls' },
              h('span', { class: 'entry-label red' }, '♥'),
              VR.stepper({ value: draft.hearts[i], min: 0, max: 13, label: `${name} hearts`,
                onChange: (v) => { draft.hearts[i] = v; rerender(); } }),
              h('div', { class: 'card-chips' },
                h('button', { type: 'button', class: 'card-chip' + (draft.queen === i ? ' on' : ''), 'aria-pressed': String(draft.queen === i),
                  'aria-label': `${name} took the queen of spades`,
                  onClick: () => { draft.queen = draft.queen === i ? null : i; rerender(); } }, 'Q♠'),
                h('button', { type: 'button', class: 'card-chip' + (draft.ten === i ? ' on' : ''), 'aria-pressed': String(draft.ten === i),
                  'aria-label': `${name} took the ten of diamonds`,
                  onClick: () => { draft.ten = draft.ten === i ? null : i; rerender(); } }, '10', h('span', { class: 'red' }, '♦')))))),
      ];
    },

    scoreboard(game, rounds) {
      const s = game.settings;
      const t = totals(rounds);
      const low = Math.min(...t);
      const order = [0, 1, 2, 3].sort((a, b) => t[a] - t[b]);
      return h('section', { class: 'board' },
        h('div', { class: 'board-chips' },
          VR.chip('Ends at ' + s.target), VR.chip('Lowest wins'), VR.chip('Q♠ 13 · 10♦ 10')),
        h('ol', { class: 'leek-board' }, order.map((i, rank) => {
          const frac = t[i] / s.target;
          const danger = frac >= 0.8 ? 'hot' : frac >= 0.5 ? 'warm' : 'cool';
          return h('li', { class: 'leek-row' + (rounds.length && t[i] === low ? ' leading' : '') },
            h('span', { class: 'leek-rank' }, rank + 1),
            VR.avatar(game, i),
            h('span', { class: 'leek-name' },
              h('span', { class: 'pname' }, game.players[i],
                rounds.length && t[i] === low ? h('span', { class: 'lead-badge' }, 'Leading') : null),
              VR.bar(frac, danger)),
            h('span', { class: 'leek-score' }, t[i]));
        })));
    },

    historyRow(game, r) {
      return h('div', { class: 'hist-main grid4' }, game.players.map((name, i) =>
        h('span', { class: 'hcell seat-' + i },
          h('span', { class: 'hname' }, name),
          h('span', { class: 'hbid' }, '♥' + r.hearts[i],
            r.queen === i ? ' Q♠' : '', r.ten === i ? ' 10♦' : ''),
          h('span', { class: 'hd ' + (handPoints(r, i) ? 'neg' : 'pos') }, VR.signed(handPoints(r, i))))));
    },

    winner(game, rounds) {
      const t = totals(rounds);
      const high = Math.max(...t);
      if (high < game.settings.target) return null;
      const low = Math.min(...t);
      const winners = [0, 1, 2, 3].filter((i) => t[i] === low).map((i) => game.players[i]);
      const loser = game.players[t.indexOf(high)];
      return {
        title: winners.length === 1 ? `${winners[0]} won!` : `${winners.join(' & ')} share the win!`,
        detail: `Lowest score ${low}. ${loser} reached ${high}.`,
      };
    },
  };
})();
