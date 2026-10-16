/* Saves games and setup preferences in localStorage, with an in-memory fallback
   for browsers where storage is blocked (private mode, file restrictions). */
(function () {
  const VR = window.VR;
  const GAMES_KEY = 'vr.games.v1';
  const PREFS_KEY = 'vr.prefs.v1';
  const memory = {};

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return key in memory ? memory[key] : fallback;
    }
  }

  function write(key, value) {
    memory[key] = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable: keep the in-memory copy */
    }
  }

  VR.store = {
    all() {
      return read(GAMES_KEY, []);
    },
    get(id) {
      return this.all().find((g) => g.id === id) || null;
    },
    put(game) {
      game.updatedAt = Date.now();
      write(GAMES_KEY, [game, ...this.all().filter((g) => g.id !== game.id)]);
    },
    remove(id) {
      write(GAMES_KEY, this.all().filter((g) => g.id !== id));
    },
    prefs() {
      return read(PREFS_KEY, {});
    },
    savePrefs(prefs) {
      write(PREFS_KEY, prefs);
    },
  };
})();
