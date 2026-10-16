/* Shared DOM helpers and small UI components used by every screen. */
(function () {
  const VR = (window.VR = window.VR || {});
  VR.games = {};

  function append(el, kids) {
    for (const kid of kids) {
      if (kid == null || kid === false) continue;
      if (Array.isArray(kid)) append(el, kid);
      else el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
  }

  // h('button', { class: 'btn', onClick: fn }, 'Label') -> <button class="btn">Label</button>
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs || {})) {
      if (val == null || val === false) continue;
      if (key === 'class') el.className = val;
      else if (key === 'style') el.style.cssText = val;
      else if (key === 'value') el.value = val;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), val);
      else el.setAttribute(key, val === true ? '' : val);
    }
    append(el, kids);
    return el;
  }
  VR.h = h;

  VR.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  VR.num = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
  VR.signed = (n) => (n > 0 ? '+' + n : VR.num(n));
  VR.sum = (arr) => arr.reduce((a, b) => a + b, 0);
  VR.clamp01 = (x) => Math.max(0, Math.min(1, x));

  // Seats 0 & 2 are partners (team A), seats 1 & 3 are partners (team B).
  VR.teamOf = (i) => i % 2;
  VR.TEAM_CLASS = ['team-a', 'team-b'];

  VR.SUITS = [
    { s: '♠', name: 'Spades', red: false },
    { s: '♥', name: 'Hearts', red: true },
    { s: '♦', name: 'Diamonds', red: true },
    { s: '♣', name: 'Clubs', red: false },
  ];

  VR.colorClass = (game, i) =>
    VR.games[game.type].teams ? VR.TEAM_CLASS[VR.teamOf(i)] : 'seat-' + i;

  VR.avatar = (game, i) =>
    h('span', { class: 'avatar ' + VR.colorClass(game, i), 'aria-hidden': 'true' },
      (game.players[i] || '?').trim().charAt(0).toUpperCase());

  VR.playerTag = (game, i) =>
    h('span', { class: 'player-tag' }, VR.avatar(game, i), h('span', { class: 'pname' }, game.players[i]));

  VR.bar = (fraction, cls) =>
    h('div', { class: 'bar ' + (cls || ''), role: 'presentation' },
      h('span', { style: `width:${Math.round(VR.clamp01(fraction) * 100)}%` }));

  VR.chip = (text, cls) => h('span', { class: 'chip ' + (cls || '') }, text);

  VR.field = (label, ...content) =>
    h('div', { class: 'field' }, h('div', { class: 'field-label' }, label), ...content);

  VR.stepper = ({ value, min, max, onChange, label }) =>
    h('div', { class: 'stepper', role: 'group', 'aria-label': label || 'Value' },
      h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Decrease', disabled: value <= min, onClick: () => onChange(value - 1) }, '−'),
      h('span', { class: 'step-val', 'aria-live': 'polite' }, value),
      h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Increase', disabled: value >= max, onClick: () => onChange(value + 1) }, '+'));

  // options: [{ value, label }]
  VR.seg = (options, current, onChange) =>
    h('div', { class: 'seg', role: 'radiogroup' },
      options.map((o) =>
        h('button', {
          type: 'button',
          class: 'seg-btn' + (o.value === current ? ' on' : ''),
          role: 'radio',
          'aria-checked': String(o.value === current),
          onClick: () => onChange(o.value),
        }, o.label)));

  VR.toggle = (label, hint, on, onChange) =>
    h('label', { class: 'toggle-row' },
      h('span', { class: 'toggle-text' },
        h('span', { class: 'toggle-label' }, label),
        hint && h('span', { class: 'hint' }, hint)),
      h('input', { type: 'checkbox', class: 'switch', checked: on, onChange: (e) => onChange(e.target.checked) }));

  // Bottom sheet. body/footer are functions (refresh, close) -> nodes, re-run on refresh().
  VR.sheet = function ({ title, body, footer }) {
    const prevFocus = document.activeElement;
    const bodyEl = h('div', { class: 'sheet-body' });
    const footEl = h('div', { class: 'sheet-foot' });
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    const backdrop = h('div', { class: 'sheet-backdrop', onClick: (e) => { if (e.target === backdrop) close(); } },
      h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
        h('div', { class: 'sheet-head' },
          h('h2', { class: 'sheet-title' }, title),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onClick: () => close() }, '✕')),
        bodyEl,
        footer && footEl));

    function refresh() {
      const scroll = bodyEl.scrollTop;
      bodyEl.replaceChildren(...[].concat(body(refresh, close)).filter(Boolean));
      if (footer) footEl.replaceChildren(...[].concat(footer(refresh, close)).filter(Boolean));
      bodyEl.scrollTop = scroll;
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('noscroll');
      backdrop.classList.add('closing');
      setTimeout(() => backdrop.remove(), 180);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }

    document.body.appendChild(backdrop);
    document.body.classList.add('noscroll');
    document.addEventListener('keydown', onKey);
    refresh();
    return { refresh, close };
  };
})();
