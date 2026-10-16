/* Tarneeb (طرنيب): two teams, the highest bidder (7–13) names the trump suit. */
(function () {
  const VR = window.VR;
  const { h } = VR;

  // Points for [team A, team B] from one round.
  function deltas(game, r) {
    const team = VR.teamOf(r.bidder);
    const opp = 1 - team;
    const d = [0, 0];
    if (r.tricks >= r.bid) {
      d[team] = r.tricks;
      if (game.settings.oppScoreOnMade) d[opp] = 13 - r.tricks;
    } else {
      d[team] = -r.bid;
      d[opp] = 13 - r.tricks;
    }
    return d;
  }

  function totals(game, rounds) {
    const t = [0, 0];
    for (const r of rounds) {
      const d = deltas(game, r);
      t[0] += d[0];
      t[1] += d[1];
    }
    return t;
  }

  const suitInfo = (s) => VR.SUITS.find((x) => x.s === s) || { s, red: false, name: '' };

  VR.games.tarneeb = {
    id: 'tarneeb',
    name: 'Tarneeb',
    arabic: 'طرنيب',
    suit: '♠',
    suitRed: false,
    teams: true,
    blurb: 'Teams bid 7 to 13 tricks and the highest bidder calls the trump.',
    meta: '4 players · 2 teams',

    defaultSettings: () => ({ target: 31, oppScoreOnMade: false, kabootWins: true }),

    settingsForm(s, rerender) {
      return [
        VR.field('Target score',
          VR.seg([31, 41, 51].map((v) => ({ value: v, label: String(v) })), s.target, (v) => { s.target = v; rerender(); })),
        VR.toggle('Opponents score when the bid is made', 'Off: only the bidding team scores when they make their bid.',
          s.oppScoreOnMade, (v) => { s.oppScoreOnMade = v; rerender(); }),
        VR.toggle('Making a 13 bid wins the game', 'Kaboot: take all 13 tricks and the game ends on the spot.',
          s.kabootWins, (v) => { s.kabootWins = v; rerender(); }),
      ];
    },

    settingsSummary: (s) => [
      `Target: ${s.target}`,
      'Bid made: the bidding team scores the tricks it took',
      s.oppScoreOnMade ? 'Opponents also score their tricks when the bid is made' : 'Opponents score nothing when the bid is made',
      'Bid failed: the bidding team loses its bid, opponents score their tricks',
      s.kabootWins ? 'Bidding 13 and taking every trick wins the game' : 'A 13 bid scores like any other bid',
    ],

    blankRound: () => ({ bidder: null, bid: 7, trump: null, tricks: 7 }),

    validate(game, draft) {
      if (draft.bidder == null) return 'Pick who won the bid.';
      if (!draft.trump) return 'Pick the trump suit.';
      return null;
    },

    form(game, draft, before, rerender) {
      const team = draft.bidder == null ? null : VR.teamOf(draft.bidder);
      const made = draft.tricks >= draft.bid;
      const d = team == null ? null : deltas(game, draft);
      return [
        VR.field('Who won the bid?',
          h('div', { class: 'pchips' }, game.players.map((name, i) =>
            h('button', { type: 'button', class: `pchip ${VR.TEAM_CLASS[VR.teamOf(i)]}${draft.bidder === i ? ' on' : ''}`,
              'aria-pressed': String(draft.bidder === i), onClick: () => { draft.bidder = i; rerender(); } },
              VR.avatar(game, i), h('span', { class: 'pname' }, name))))),
        h('div', { class: 'field field-row' },
          h('div', { class: 'field-label' }, 'Bid'),
          VR.stepper({ value: draft.bid, min: 7, max: 13, label: 'Bid',
            onChange: (v) => { draft.bid = v; rerender(); } })),
        VR.field('Trump suit',
          h('div', { class: 'suits' }, VR.SUITS.map((x) =>
            h('button', { type: 'button', class: `suit-btn${x.red ? ' red' : ''}${draft.trump === x.s ? ' on' : ''}`,
              'aria-pressed': String(draft.trump === x.s), onClick: () => { draft.trump = x.s; rerender(); } },
              h('span', { class: 'suit-glyph' }, x.s), h('span', { class: 'suit-name' }, x.name))))),
        h('div', { class: 'field field-row' },
          h('div', { class: 'field-label' },
            team == null ? 'Tricks won by bidders' : `Tricks won by ${game.teamNames[team]}`,
            h('span', { class: 'sub-label' }, `Opponents took ${13 - draft.tricks}`)),
          VR.stepper({ value: draft.tricks, min: 0, max: 13, label: 'Tricks won',
            onChange: (v) => { draft.tricks = v; rerender(); } })),
        d && h('div', { class: 'preview ' + (made ? 'ok' : 'bad') },
          h('span', null, made ? 'Bid made ✓' : 'Bid failed ✗'),
          h('span', { class: 'preview-pts' }, [0, 1].map((k) =>
            h('span', null, game.teamNames[k] + ' ', h('b', null, VR.signed(d[k])))))),
      ];
    },

    scoreboard(game, rounds) {
      const s = game.settings;
      const t = totals(game, rounds);
      const last = rounds[rounds.length - 1];
      const lead = t[0] === t[1] ? -1 : t[0] > t[1] ? 0 : 1;
      return h('section', { class: 'board' },
        h('div', { class: 'board-chips' },
          VR.chip('Target ' + s.target),
          last && VR.chip('Last trump ' + last.trump, suitInfo(last.trump).red ? 'red' : '')),
        h('div', { class: 'teams' }, [0, 1].map((k) =>
          h('div', { class: `team-card ${VR.TEAM_CLASS[k]}${lead === k ? ' leading' : ''}` },
            h('div', { class: 'team-head' },
              h('span', { class: 'team-name' }, game.teamNames[k]),
              lead === k && h('span', { class: 'lead-badge' }, 'Leading')),
            h('div', { class: 'team-score' + (t[k] < 0 ? ' neg' : '') }, VR.num(t[k])),
            h('div', { class: 'team-members' }, [k, k + 2].map((i) =>
              h('span', { class: 'member-chip' }, VR.avatar(game, i), h('span', { class: 'pname' }, game.players[i])))),
            VR.bar(t[k] / s.target)))));
    },

    historyRow(game, r) {
      const d = deltas(game, r);
      const made = r.tricks >= r.bid;
      return h('div', { class: 'hist-main' },
        h('div', { class: 'hline' },
          h('b', { class: VR.TEAM_CLASS[VR.teamOf(r.bidder)] + '-text' }, game.players[r.bidder]),
          ' bid ', h('b', null, r.bid), ' ',
          h('span', { class: 'suit' + (suitInfo(r.trump).red ? ' red' : '') }, r.trump),
          ' · took ', r.tricks,
          h('span', { class: 'tag ' + (made ? 'ok' : 'bad') }, made ? 'Made' : 'Failed')),
        h('div', { class: 'hline hdeltas' }, [0, 1].map((k) =>
          h('span', { class: VR.TEAM_CLASS[k] + '-text' }, game.teamNames[k] + ' ',
            h('b', { class: 'hd ' + (d[k] < 0 ? 'neg' : 'pos') }, VR.signed(d[k]))))));
    },

    winner(game, rounds) {
      const s = game.settings;
      const last = rounds[rounds.length - 1];
      if (s.kabootWins && last && last.bid === 13 && last.tricks === 13) {
        const k = VR.teamOf(last.bidder);
        return { title: `${game.teamNames[k]} won!`, detail: `${game.players[last.bidder]} bid 13 and took every trick. Kaboot!` };
      }
      const t = totals(game, rounds);
      const teams = [0, 1].filter((k) => t[k] >= s.target);
      if (!teams.length) return null;
      const k = teams.length === 1 ? teams[0] : t[0] === t[1] ? null : t[0] > t[1] ? 0 : 1;
      if (k == null) return null;
      return { title: `${game.teamNames[k]} won!`, detail: `Final score ${VR.num(t[k])} to ${VR.num(t[1 - k])}.` };
    },
  };
})();
