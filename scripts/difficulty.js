// =====================================================================
// difficulty.js — objective per-level difficulty metric (HYBRID config)
//
// Role split (see .claude/agents/game-critic.md):
//   • THIS SCRIPT measures — it emits raw features + a weighted score per
//     level. It does NOT pass verdicts (no 🔴/🟡). Judgment lives in the
//     game-critic agent; hard CI gates live in test/.
//   • A `--check` helper is provided so a CI test can assert back-half
//     cognitive monotonicity, but it is opt-in and prints data, not opinions.
//
// The move generator is a faithful copy of game.js applyMove():
//   color-accept check (pre-shift)  →  blend (W8)  →  mix (W7)  →  placement.
// Shift (W6) transforms the ball on entry; stacking uses the post-shift color.
// BFS is shortest-path-counting and stops when the goal is dequeued, so it
// also yields the number of optimal paths, branching factor, and a sample
// optimal path for the regressive-move analysis.
//
// DESIGN INTENT: cognitive difficulty is weighted heavily (≈70% of the linear
// score), per the project directive that late-world levels must escalate the
// *kind* of thinking, not just the move count. See memory/design-cognitive-back-half.
// =====================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(file, suffix) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  return vm.runInContext(source + suffix, context, { filename: file });
}

const WORLDS = loadScript('levels.js', '; WORLDS;');
const MIXING = loadScript('pigment-mixing.js', '; window.PIGMENT_MIXING;');

// ---------------------------------------------------------------------
// Move rules — mirror of game.js
// ---------------------------------------------------------------------
const SHIFT_CYCLE = { R: 'G', G: 'B', B: 'Y', Y: 'R' };
const SHIFT_CYCLE_BACK = { R: 'Y', Y: 'B', B: 'G', G: 'R' };

function accepts(level, to, ball) {
  const c = level.tubeColors && level.tubeColors[to];
  if (c === null || c === undefined) return true;
  return ball === c || ball === 'J';
}

function isLocked(level, tubeIndex, moves) {
  return (level.locks || []).some(L => L.tubeIndex === tubeIndex && moves < L.unlockAt);
}

// Shift (W6): forward tubes advance R→G→B→Y→R; reverse tubes (shiftsBack)
// retreat R→Y→B→G→R. Joker is immune to both. A tube is at most one of these.
function shifted(level, ball, to) {
  if (ball === 'J') return ball;
  if ((level.shifts || []).includes(to)) return SHIFT_CYCLE[ball] || ball;
  if ((level.shiftsBack || []).includes(to)) return SHIFT_CYCLE_BACK[ball] || ball;
  return ball;
}

function key(tubes) { return JSON.stringify(tubes); }
function clone(tubes) { return tubes.map(t => t.slice()); }

// Faithful copy of applyMove() ordering: blend > mix > normal placement.
function nextStates(level, tubes, moves) {
  const out = [];
  const caps = level.capacities;
  const mixers = level.mixers || [];
  const blenders = level.blenders || [];
  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;
    if (isLocked(level, from, moves)) continue;
    const moving = tubes[from][tubes[from].length - 1];
    for (let to = 0; to < tubes.length; to++) {
      if (to === from) continue;
      if (isLocked(level, to, moves)) continue;
      if (!accepts(level, to, moving)) continue;          // pre-shift color gate
      const effective = shifted(level, moving, to);
      const dest = tubes[to];
      const destTop = dest.length ? dest[dest.length - 1] : null;
      const blendResult = blenders.includes(to) && destTop !== null
        ? MIXING.mixPair(destTop, effective) : null;
      const wouldStack = destTop === null || destTop === effective
        || destTop === 'J' || effective === 'J';
      if (blendResult) {
        const n = clone(tubes); n[from].pop(); n[to].pop(); n[to].push(blendResult);
        out.push(n); continue;
      }
      if (mixers.includes(to) && !wouldStack) {
        const n = clone(tubes); n[from].pop(); n[to].pop(); n[to].push('J');
        out.push(n); continue;
      }
      if (dest.length < caps[to] && wouldStack) {
        const n = clone(tubes); n[from].pop(); n[to].push(effective);
        out.push(n);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// BFS — shortest length, # optimal paths, branching, one optimal path
// ---------------------------------------------------------------------
const STATE_CAP = 3000000;

function bfs(level) {
  // Lock status is time-dependent, so the SAME tube configuration at a
  // different moveCount is a DIFFERENT state. Key on (tubes, clampedMoves),
  // where moveCount is clamped to the last unlock (beyond it locks never
  // change, so moveCount stops mattering and the space stays bounded). For
  // lock-free levels maxUnlock is 0 → key collapses to tubes, no blowup.
  const maxUnlock = (level.locks || []).reduce((m, L) => Math.max(m, L.unlockAt), 0);
  const skey = (tubes, moves) => key(tubes) + '|' + Math.min(moves, maxUnlock);
  const goalConfig = key(level.target);

  const start = clone(level.initial);
  const seen = new Map();
  seen.set(skey(start, 0), { dist: 0, paths: 1, parent: null, tubes: start });
  const queue = [skey(start, 0)];
  let head = 0, branchSum = 0, branchCount = 0, goal = null;

  while (head < queue.length) {
    const ck = queue[head++];
    const node = seen.get(ck);
    if (key(node.tubes) === goalConfig) { goal = node; break; }   // goal by config
    const nbrs = nextStates(level, node.tubes, node.dist);
    branchSum += nbrs.length; branchCount++;
    for (const nt of nbrs) {
      const nk = skey(nt, node.dist + 1);
      const ex = seen.get(nk);
      if (!ex) {
        if (seen.size < STATE_CAP) {
          seen.set(nk, { dist: node.dist + 1, paths: node.paths, parent: ck, tubes: nt });
          queue.push(nk);
        }
      } else if (ex.dist === node.dist + 1) {
        ex.paths = Math.min(ex.paths + node.paths, 1e6);
      }
    }
  }

  if (!goal) return null;
  const pathStates = [];
  for (let k = skey(goal.tubes, goal.dist); k !== null; k = seen.get(k).parent) pathStates.push(seen.get(k).tubes);
  pathStates.reverse();
  return {
    optimalMoves: goal.dist,
    numOptimalPaths: goal.paths,
    statesExplored: branchCount,
    avgBranching: branchCount ? branchSum / branchCount : 0,
    path: pathStates
  };
}

// ---------------------------------------------------------------------
// Heuristic: misplaced balls = balls above the correct bottom-aligned prefix
// ---------------------------------------------------------------------
function misplaced(tubes, target) {
  let m = 0;
  for (let i = 0; i < tubes.length; i++) {
    const c = tubes[i], t = target[i];
    let k = 0;
    while (k < c.length && k < t.length && c[k] === t[k]) k++;
    m += c.length - k;
  }
  return m;
}

// Non-progressive moves along the optimal path: a move whose misplaced-count
// does not strictly decrease. These are the setup/staging/conversion moves —
// the lookahead burden — the single strongest proxy for "trickiness".
function nonProgressiveMoves(path, target) {
  let np = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    if (misplaced(path[i + 1], target) >= misplaced(path[i], target)) np++;
  }
  return np;
}

// ---------------------------------------------------------------------
// Static structural features
// ---------------------------------------------------------------------
function staticFeatures(level) {
  const initial = level.initial, caps = level.capacities;
  const totalBalls = initial.reduce((s, t) => s + t.length, 0);
  const totalCap = caps.reduce((s, c) => s + c, 0);
  const colors = new Set();
  for (const tube of initial) for (const b of tube) if (b !== 'J') colors.add(b);
  for (const tube of level.target) for (const b of tube) if (b !== 'J') colors.add(b);

  let colorBreaks = 0, buried = 0;
  for (let i = 0; i < initial.length; i++) {
    const c = initial[i], t = level.target[i] || [];
    for (let j = 0; j + 1 < c.length; j++) if (c[j] !== c[j + 1]) colorBreaks++;
    let k = 0; while (k < c.length && k < t.length && c[k] === t[k]) k++;
    buried = Math.max(buried, c.length - k);
  }
  const tubeCount = caps.length;
  const rows = tubeCount <= 5 ? 1 : tubeCount <= 8 ? 2 : 3;
  const bufferScarcity = totalCap > 0 ? 1 - (totalCap - totalBalls) / totalCap : 1;

  return { numColors: colors.size, tubeCount, rows, colorBreaks, buried, bufferScarcity };
}

// ---------------------------------------------------------------------
// Mechanic multiplier — special rules amplify cognitive load super-linearly
// ---------------------------------------------------------------------
function mechanicMultiplier(level, optimalMoves) {
  let load = 0;
  for (const L of (level.locks || [])) load += 0.10 * Math.min(L.unlockAt / Math.max(optimalMoves, 1), 1);
  load += 0.12 * (level.blenders || []).length;
  load += 0.12 * (level.mixers || []).length;
  const shifts = (level.shifts || []).length + (level.shiftsBack || []).length;
  load += 0.08 * shifts + (shifts >= 2 ? 0.04 : 0);
  // A forward AND a reverse tube in the same level = genuine routing choice.
  if ((level.shifts || []).length && (level.shiftsBack || []).length) load += 0.06;
  load += 0.06 * (level.tubeColors || []).filter(Boolean).length;
  load += 0.08 * level.capacities.filter(c => c < 4).length;
  return 1 + Math.min(load, 0.6);
}

// ---------------------------------------------------------------------
// Weights — cognitive signals dominate (regressive+branching+uniqueness+buried
// = 58%, plus bufferScarcity 12% ≈ 70% cognitive; length only 14%).
// ---------------------------------------------------------------------
const WEIGHTS = {
  regressive:     22,   // lookahead / counter-intuitive moves — top signal
  branching:      13,   // decision load
  uniqueness:     12,   // single optimal path = needle in haystack
  buried:         11,   // depth of the first-needed ball
  bufferScarcity: 12,   // tight space forces planning
  moves:          14,   // raw length — deliberately not dominant
  colorBreaks:     6,   // initial entropy
  logStates:       4,   // size of the solving funnel
  numColors:       3,   // tracking load
  rows:            3    // visual scanning (extraneous load)
};
const COGNITIVE_KEYS = ['regressive', 'branching', 'uniqueness', 'buried'];

// ---------------------------------------------------------------------
// Analyze every level: raw features → min-max normalize → weighted score
// ---------------------------------------------------------------------
function rawFeatures(level) {
  const b = bfs(level);
  if (!b) return null;
  const s = staticFeatures(level);
  return {
    moves: b.optimalMoves,
    declaredMoves: level.optimalMoves,
    regressive: nonProgressiveMoves(b.path, level.target),
    branching: b.avgBranching,
    uniqueness: 1 / b.numOptimalPaths,
    numOptimalPaths: b.numOptimalPaths,
    buried: s.buried,
    bufferScarcity: s.bufferScarcity,
    colorBreaks: s.colorBreaks,
    logStates: Math.log(b.statesExplored + 1),
    numColors: s.numColors,
    rows: s.rows
  };
}

function analyzeAll(worlds) {
  const rows = [];
  for (const w of worlds) {
    w.levels.forEach((level, idx) => {
      const f = rawFeatures(level);   // null when the level is UNSOLVABLE under real rules
      rows.push({ worldId: w.id, worldName: w.name, level: idx + 1,
        levelCount: w.levels.length, declaredMoves: level.optimalMoves, f });
    });
  }
  const solvable = rows.filter(r => r.f);
  // min-max normalize each weighted feature across the solvable set
  const keys = Object.keys(WEIGHTS);
  const minmax = {};
  for (const k of keys) {
    const vals = solvable.map(r => r.f[k]);
    minmax[k] = { min: Math.min(...vals), max: Math.max(...vals) };
  }
  const norm = (k, v) => {
    const { min, max } = minmax[k];
    return max === min ? 0 : (v - min) / (max - min);
  };
  // score
  let scoreMin = Infinity, scoreMax = -Infinity;
  for (const r of solvable) {
    let lin = 0, cog = 0, cogW = 0;
    for (const k of keys) {
      const n = norm(k, r.f[k]);
      lin += WEIGHTS[k] * n;
      if (COGNITIVE_KEYS.includes(k)) { cog += WEIGHTS[k] * n; cogW += WEIGHTS[k]; }
    }
    r.mult = mechanicMultiplier(WORLDS.find(w => w.id === r.worldId).levels[r.level - 1], r.f.moves);
    r.rawScore = lin * r.mult;
    r.cogLoad = cogW ? (cog / cogW) * 100 : 0;   // 0–100, pre-multiplier (germane load)
    scoreMin = Math.min(scoreMin, r.rawScore);
    scoreMax = Math.max(scoreMax, r.rawScore);
  }
  for (const r of solvable) {
    r.score = scoreMax === scoreMin ? 50 : ((r.rawScore - scoreMin) / (scoreMax - scoreMin)) * 100;
    r.tier = Math.min(5, Math.max(1, Math.floor(r.score / 20) + 1));
  }
  return rows;
}

// ---------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------
const HIDDEN = [2, 5, 7];
function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
function rnd(x, d = 0) { return Number(x.toFixed(d)); }

function report(rows, { includeHidden = false } = {}) {
  const worldIds = [...new Set(rows.map(r => r.worldId))]
    .filter(id => includeHidden || !HIDDEN.includes(id));
  for (const id of worldIds) {
    const wr = rows.filter(r => r.worldId === id);
    const name = wr[0].worldName;
    const mid = Math.ceil(wr[0].levelCount / 2);
    console.log(`\n══ World ${id}: ${name}${HIDDEN.includes(id) ? '  (hidden)' : ''} ══`);
    console.log(`   ${pad('Lvl', 5)}${pad('opt', 5)}${pad('cogLoad', 9)}${pad('Δcog', 7)}${pad('score', 7)}${pad('tier', 6)}${pad('mult', 6)}`);
    let prevCog = null;
    wr.forEach(r => {
      const marker = r.level === mid ? ' ┄ midpoint' : '';
      if (!r.f) {
        console.log(`   ${pad(r.level, 5)}${pad(r.declaredMoves, 5)}${pad('— UNSOLVABLE under real lock rules', 0)}${marker}`);
        return;
      }
      const dcog = prevCog === null ? '' : (r.cogLoad - prevCog >= 0 ? '+' : '') + rnd(r.cogLoad - prevCog);
      console.log(`   ${pad(r.level, 5)}${pad(r.f.moves, 5)}${pad(rnd(r.cogLoad), 9)}${pad(dcog, 7)}${pad(rnd(r.score), 7)}${pad(r.tier, 6)}${pad(rnd(r.mult, 2), 6)}${marker}`);
      prevCog = r.cogLoad;
    });
  }
}

// Opt-in gate helper for CI: back-half cognitive load must be non-decreasing,
// and no late level may score below an earlier one (monotonicity). Returns a
// list of violations (data, not verdicts).
function checkMonotonicity(rows, { includeHidden = false, tol = 3 } = {}) {
  const violations = [];
  const worldIds = [...new Set(rows.map(r => r.worldId))]
    .filter(id => includeHidden || !HIDDEN.includes(id));
  for (const id of worldIds) {
    const wr = rows.filter(r => r.worldId === id);
    const mid = Math.ceil(wr[0].levelCount / 2);
    const back = wr.filter(r => r.level >= mid);
    let peakCog = -Infinity, peakScore = -Infinity;
    for (const r of back) {
      if (!r.f) { violations.push({ world: id, level: r.level, type: 'unsolvable' }); continue; }
      if (r.cogLoad + tol < peakCog) {
        violations.push({ world: id, level: r.level, type: 'cogLoad-dip', value: rnd(r.cogLoad), peak: rnd(peakCog) });
      }
      if (r.score + tol < peakScore) {
        violations.push({ world: id, level: r.level, type: 'score-dip', value: rnd(r.score), peak: rnd(peakScore) });
      }
      peakCog = Math.max(peakCog, r.cogLoad);
      peakScore = Math.max(peakScore, r.score);
    }
  }
  return violations;
}

// ---------------------------------------------------------------------
// Library exports + CLI
// ---------------------------------------------------------------------
module.exports = {
  bfs, rawFeatures, analyzeAll, checkMonotonicity, WEIGHTS, COGNITIVE_KEYS, mechanicMultiplier
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const includeHidden = args.includes('--all');
  const rows = analyzeAll(WORLDS);

  // Validate the move logic against declared optimalMoves before reporting.
  const unsolvable = rows.filter(r => !r.f);
  const mismatches = rows.filter(r => r.f && r.f.moves !== r.declaredMoves);
  if (unsolvable.length) {
    console.log('✗ UNSOLVABLE under real game rules (no solution exists):');
    unsolvable.forEach(r => console.log(`   W${r.worldId} L${r.level} (declared ${r.declaredMoves})`));
  }
  if (mismatches.length) {
    console.log('⚠ BFS optimalMoves mismatch (declared value is wrong):');
    mismatches.forEach(r => console.log(`   W${r.worldId} L${r.level}: bfs=${r.f.moves} declared=${r.declaredMoves}`));
  }
  if (!unsolvable.length && !mismatches.length) {
    console.log('✓ BFS optimalMoves match all declared values.');
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(rows.map(r => ({
      world: r.worldId, level: r.level, ...r.f, cogLoad: rnd(r.cogLoad, 1),
      score: rnd(r.score, 1), tier: r.tier, mult: rnd(r.mult, 3)
    })), null, 2));
  } else if (args.includes('--check')) {
    const v = checkMonotonicity(rows, { includeHidden });
    if (!v.length) console.log('\n✓ Back-half cognitive load and score are monotonic in every visible world.');
    else { console.log('\n✗ Monotonicity violations (back half):'); v.forEach(x => console.log('  ', JSON.stringify(x))); }
  } else {
    report(rows, { includeHidden });
  }
}
