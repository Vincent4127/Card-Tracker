/* 400 (أربعمية): hearts are trump, every player bids for themselves.
   Two scoring modes:
   - classic:  individual scores; a team wins when one partner reaches the target
               and the other partner is above zero.
   - combined: both partners' points are added into one team score. */
(function () {
  const VR = window.VR;
  const { h } = VR;

  function points(game, bid) {
    return game.settings.bonusBids && bid >= 5 ? bid * 2 : bid;
  }

  function delta(game, bid, made) {
    return made ? points(game, bid) : -points(game, bid);
  }

  function totals(game, rounds) {
    const players = [0, 0, 0, 0];
    for (const r of rounds) for (let i = 0; i < 4; i++) players[i] += delta(game, r.bids[i], r.made[i]);
    return { players, teams: [players[0] + players[2], players[1] + players[3]] };
  }

  // The table must bid at least 11 tricks in total. In classic mode the minimum rises
  // once someone is close to winning; partners-combined games always stay at 11.
  function minTotal(game, rounds) {
    if (game.settings.mode === 'combined') return 11;
    const top = Math.max(...totals(game, rounds).players);
    return top >= 40 ? 13 : top >= 30 ? 12 : 11;
  }

  VR.games['400'] = {
    id: '400',
    name: '400',
    arabic: 'أربعمية',
    suit: '♥',
    suitRed: true,
    teams: true,
    blurb: 'Hearts are trump. Everyone bids for themselves, partners race to the target.',
    meta: '4 players · 2 teams',

    defaultSettings: () => ({ mode: 'classic', target: 41, bonusBids: true }),

    settingsForm(s, rerender) {
      return [
        VR.field('Scoring',
          VR.seg([{ value: 'classic', label: 'Classic' }, { value: 'combined', label: 'Partners combined' }],
            s.mode, (v) => { s.mode = v; rerender(); }),
          h('p', { class: 'hint' }, s.mode === 'classic'
            ? 'Each player keeps their own score. A team wins when one partner reaches the target and the other is above zero.'
            : 'Both partners’ points are added into one team score. The first team to reach the target wins. Minimum total bids stay at 11 all game.')),
        VR.field('Target score',
          VR.seg([31, 41, 51, 61].map((v) => ({ value: v, label: String(v) })), s.target, (v) => { s.target = v; rerender(); })),
        VR.toggle('Bids of 5+ score double', 'A made bid of 6 is worth 12, a failed one costs 12.',
          s.bonusBids, (v) => { s.bonusBids = v; rerender(); }),
      ];
    },

    settingsSummary: (s) => [
      s.mode === 'classic' ? 'Classic scoring: every player has their own score' : 'Partners combined: both partners’ points make one team score',
      `Target: ${s.target}` + (s.mode === 'classic' ? ' (with partner above zero)' : ''),
      s.bonusBids ? 'Bids of 5 or more score double' : 'Bids score their face value',
      'Hearts are always trump',
      s.mode === 'classic' ? 'Minimum total bids: 11, then 12 once anyone has 30+, 13 at 40+' : 'Minimum total bids: always 11',
    ],

    blankRound: () => ({ bids: [2, 2, 2, 2], made: [true, true, true, true] }),

    validate(game, draft, before) {
      const min = minTotal(game, before);
      const total = VR.sum(draft.bids);
      return total < min ? `Total bids must be at least ${min} (now ${total}).` : null;
    },

    form(game, draft, before, rerender) {
      const min = minTotal(game, before);
      const total = VR.sum(draft.bids);
      return [
        h('div', { class: 'form-status ' + (total >= min ? 'ok' : 'bad') },
          h('span', null, 'Total bids'), h('strong', null, total), h('span', { class: 'fs-min' }, `minimum ${min}`)),
        game.players.map((_, i) => {
          const d = delta(game, draft.bids[i], draft.made[i]);
          return h('div', { class: 'entry' },
            h('div', { class: 'entry-top' },
              VR.playerTag(game, i),
              h('span', { class: 'entry-pts' + (d < 0 ? ' neg' : '') }, VR.signed(d))),
            h('div', { class: 'entry-controls' },
              h('span', { class: 'entry-label' }, 'Bid'),
              VR.stepper({ value: draft.bids[i], min: 2, max: 13, label: `${game.players[i]} bid`,
                onChange: (v) => { draft.bids[i] = v; rerender(); } }),
              h('div', { class: 'result-toggle', role: 'radiogroup', 'aria-label': `${game.players[i]} result` },
                h('button', { type: 'button', class: 'rt made' + (draft.made[i] ? ' on' : ''), role: 'radio',
                  'aria-checked': String(draft.made[i]), onClick: () => { draft.made[i] = true; rerender(); } }, 'Made'),
                h('button', { type: 'button', class: 'rt failed' + (!draft.made[i] ? ' on' : ''), role: 'radio',
                  'aria-checked': String(!draft.made[i]), onClick: () => { draft.made[i] = false; rerender(); } }, 'Failed'))));
        }),
      ];
    },

    scoreboard(game, rounds) {
      const s = game.settings;
      const t = totals(game, rounds);
      const combined = s.mode === 'combined';
      const lead = t.teams[0] === t.teams[1] ? -1 : t.teams[0] > t.teams[1] ? 0 : 1;
      return h('section', { class: 'board' },
        h('div', { class: 'board-chips' },
          VR.chip(combined ? 'Partners combined' : 'Classic'),
          VR.chip('Target ' + s.target),
          VR.chip('Min bids ' + minTotal(game, rounds)),
          VR.chip('♥ trump', 'red')),
        h('div', { class: 'teams' }, [0, 1].map((k) => {
          const members = [k, k + 2];
          const best = combined ? t.teams[k] : Math.max(...members.map((i) => t.players[i]));
          return h('div', { class: `team-card ${VR.TEAM_CLASS[k]}${lead === k ? ' leading' : ''}` },
            h('div', { class: 'team-head' },
              h('span', { class: 'team-name' }, game.teamNames[k]),
              lead === k && h('span', { class: 'lead-badge' }, 'Leading')),
            combined && h('div', { class: 'team-score' + (t.teams[k] < 0 ? ' neg' : '') }, VR.num(t.teams[k])),
            h('ul', { class: 'member-list' }, members.map((i) =>
              h('li', { class: 'member' },
                VR.avatar(game, i),
                h('span', { class: 'pname' }, game.players[i]),
                h('span', { class: 'pscore' + (combined ? ' quiet' : '') + (t.players[i] < 0 ? ' neg' : '') }, VR.num(t.players[i]))))),
            !combined && h('div', { class: 'team-sum' }, 'Team total ', h('b', null, VR.num(t.teams[k]))),
            VR.bar(best / s.target));
        })));
    },

    historyRow(game, r) {
      return h('div', { class: 'hist-main grid4' }, game.players.map((name, i) => {
        const d = delta(game, r.bids[i], r.made[i]);
        return h('span', { class: 'hcell ' + VR.TEAM_CLASS[VR.teamOf(i)] },
          h('span', { class: 'hname' }, name),
          h('span', { class: 'hbid' }, 'bid ' + r.bids[i], h('i', { class: r.made[i] ? 'ok' : 'bad' }, r.made[i] ? ' ✓' : ' ✗')),
          h('span', { class: 'hd ' + (d < 0 ? 'neg' : 'pos') }, VR.signed(d)));
      }));
    },

    winner(game, rounds) {
      const s = game.settings;
      const t = totals(game, rounds);
      const qualifies = (k) => s.mode === 'combined'
        ? t.teams[k] >= s.target
        : [k, k + 2].some((i) => t.players[i] >= s.target && t.players[(i + 2) % 4] > 0);
      const teams = [0, 1].filter(qualifies);
      if (!teams.length) return null;
      const k = teams.length === 1 ? teams[0] : t.teams[0] === t.teams[1] ? null : t.teams[0] > t.teams[1] ? 0 : 1;
      if (k == null) return null;

      let detail;
      if (s.mode === 'combined') {
        detail = `Team total ${VR.num(t.teams[k])} against ${VR.num(t.teams[1 - k])}.`;
      } else {
        const star = [k, k + 2].sort((a, b) => t.players[b] - t.players[a])[0];
        detail = `${game.players[star]} reached ${VR.num(t.players[star])}, partner ${game.players[(star + 2) % 4]} on ${VR.num(t.players[(star + 2) % 4])}.`;
      }
      return { title: `${game.teamNames[k]} won!`, detail };
    },
  };
})();
