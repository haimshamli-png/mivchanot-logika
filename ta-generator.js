(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TA_GENERATOR = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // =====================================================================
  // Time Attack board generator.
  //
  // Time Attack used to cycle a fixed pool of six World 1 puzzles, which a
  // player memorises in a few runs. This module builds fresh plain-rule
  // boards (no special mechanics) on the fly and verifies each one with a
  // small BFS so every board is solvable inside a known move band. Boards
  // are tiny (2–3 colours, 3–5 tubes), so the search is a few thousand
  // states at most and runs in well under a frame on a phone.
  // =====================================================================

  // Deterministic PRNG (mulberry32) so tests can pin a seed.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function key(tubes) { return tubes.map(t => t.join('')).join('|'); }

  // Plain-rule BFS: top ball moves onto an empty tube or a matching colour.
  function solve(initial, target, capacities, stateCap) {
    const goal = key(target);
    const start = key(initial);
    if (start === goal) return 0;
    const seen = new Set([start]);
    const queue = [{ tubes: initial.map(t => t.slice()), d: 0 }];
    let head = 0;
    while (head < queue.length) {
      const { tubes, d } = queue[head++];
      for (let from = 0; from < tubes.length; from++) {
        if (!tubes[from].length) continue;
        const ball = tubes[from][tubes[from].length - 1];
        for (let to = 0; to < tubes.length; to++) {
          if (to === from) continue;
          const dest = tubes[to];
          if (dest.length >= capacities[to]) continue;
          if (dest.length && dest[dest.length - 1] !== ball) continue;
          const next = tubes.map(t => t.slice());
          next[from].pop(); next[to].push(ball);
          const k = key(next);
          if (seen.has(k)) continue;
          if (k === goal) return d + 1;
          if (seen.size >= stateCap) return null;
          seen.add(k);
          queue.push({ tubes: next, d: d + 1 });
        }
      }
    }
    return null;
  }

  const COLORS = ['R', 'G', 'B', 'Y'];

  // Difficulty bands by round: the later the round, the more colours/balls.
  function bandFor(round) {
    if (round < 3) return { colors: 2, perColor: 2, minOpt: 2, maxOpt: 5 };
    if (round < 7) return { colors: 3, perColor: 2, minOpt: 4, maxOpt: 8 };
    if (round < 12) return { colors: 3, perColor: 3, minOpt: 6, maxOpt: 11 };
    return { colors: 4, perColor: 3, minOpt: 8, maxOpt: 14 };
  }

  function generateLevel(rng, band, attempts = 60) {
    const capacity = 4;
    const tubeCount = band.colors + 1;
    const capacities = Array.from({ length: tubeCount }, () => capacity);
    const target = [];
    for (let c = 0; c < band.colors; c++) target.push(Array(band.perColor).fill(COLORS[c]));
    target.push([]);
    for (let a = 0; a < attempts; a++) {
      const balls = [];
      for (let c = 0; c < band.colors; c++) for (let i = 0; i < band.perColor; i++) balls.push(COLORS[c]);
      // Fisher–Yates shuffle, then deal into tubes respecting capacity and
      // leaving at least one free slot per tube so the board can breathe.
      for (let i = balls.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [balls[i], balls[j]] = [balls[j], balls[i]];
      }
      const initial = Array.from({ length: tubeCount }, () => []);
      let ok = true;
      for (const b of balls) {
        const open = [];
        for (let t = 0; t < tubeCount; t++) if (initial[t].length < capacity - 1) open.push(t);
        if (!open.length) { ok = false; break; }
        initial[open[Math.floor(rng() * open.length)]].push(b);
      }
      if (!ok) continue;
      const opt = solve(initial, target, capacities, 60000);
      if (opt === null || opt < band.minOpt || opt > band.maxOpt) continue;
      return { capacities, optimalMoves: opt, initial, target, _generated: true };
    }
    return null;
  }

  // Fallback boards if generation somehow fails (never expected in practice).
  const FALLBACK = [
    { capacities: [4,4,4], optimalMoves: 2, initial: [['R'],['G'],['G','R']], target: [['R','R'],['G','G'],[]] },
    { capacities: [4,4,4,4], optimalMoves: 3, initial: [['R','G'],['G','R'],['B','B'],[]], target: [['R','R'],['G','G'],['B','B'],[]] }
  ];

  function nextLevel(rng, round) {
    return generateLevel(rng, bandFor(round)) || FALLBACK[round % FALLBACK.length];
  }

  // Accuracy scoring. Every solved board is worth up to 100 points, scaled by
  // how close the solve was to the optimum (optimal / moves). Nine boards at
  // the optimum score 900; nine sloppy boards at 80% accuracy score 720 — so
  // speed still matters (more boards) but wild pouring costs points.
  const BOARD_POINTS = 100;

  function boardScore(moves, optimalMoves) {
    if (!optimalMoves || !moves) return 0;
    return Math.round(BOARD_POINTS * Math.min(1, optimalMoves / Math.max(moves, optimalMoves)));
  }

  function runScore(boards) {
    const solved = boards.length;
    const score = boards.reduce((sum, b) => sum + boardScore(b.moves, b.optimalMoves), 0);
    const precision = solved ? score / (solved * BOARD_POINTS) : 0;
    return { solved, score, precision };
  }

  return { makeRng, bandFor, generateLevel, nextLevel, solve, boardScore, runScore, BOARD_POINTS };
});
