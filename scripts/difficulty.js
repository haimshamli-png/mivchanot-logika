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
// The move generator is a faithful copy of game.js onTubeTap():
//   lock/valve gates → portal routing (chute = bottom insertion) →
//   colour-accept check (pre-shift) → blend (W8) → placement.
// Shift (W6) transforms the ball on entry; stacking uses the post-shift color.
// BFS is shortest-path-counting and stops when the goal is dequeued, so it
// also yields the number of optimal paths, branching factor, and a sample
// optimal path (states AND moves) for the regressive-move analysis and for
// the in-game opening hint.
//
// DESIGN INTENT: cognitive difficulty is weighted heavily (≈70% of the linear
// score). Raw move count is deliberately a minor component (14%): late-world
// levels must escalate the *kind* of thinking, not the move count.
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
const VALVES = loadScript('valves.js', '; window.VALVES;');
const PORTALS = loadScript('portals.js', '; window.PORTALS;');

// Single source of truth for hidden worlds: parse game.js.
function readHiddenWorldIds() {
  try {
    const src = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
    const m = src.match(/const HIDDEN_WORLD_IDS = \[([^\]]*)\]/);
    return m ? m[1].split(',').map(s => Number(s.trim())).filter(Number.isFinite) : [];
  } catch (e) { return []; }
}
const HIDDEN = readHiddenWorldIds();

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

function sameStack(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Locks come in two kinds:
//   { tubeIndex, unlockAt: N }              — sealed while moves < N
//   { tubeIndex, until: { tube: k, equals: [...] } }
//   { tubeIndex, until: { tube: k } }        — sealed until tube k equals
//                                              its target ("מנעול-תנאי")
function lockCondition(level, L) {
  if (!L.until) return null;
  const tube = L.until.tube;
  const contents = L.until.equals || level.target[tube];
  return { tube, contents };
}

function isLocked(level, tubeIndex, moves, tubes) {
  return (level.locks || []).some(L => {
    if (L.tubeIndex !== tubeIndex) return false;
    if (L.until) {
      const cond = lockCondition(level, L);
      return !sameStack(tubes[cond.tube], cond.contents);
    }
    return moves < L.unlockAt;
  });
}

// Shift (W6): forward tubes advance R→G→B→Y→R; reverse tubes (shiftsBack)
// retreat R→Y→B→G→R. Joker is immune to both. A tube is at most one of these.
function shifted(level, ball, to) {
  if (ball === 'J') return ball;
  if ((level.shifts || []).includes(to)) return SHIFT_CYCLE[ball] || ball;
  if ((level.shiftsBack || []).includes(to)) return SHIFT_CYCLE_BACK[ball] || ball;
  return ball;
}

// Hardening balls ("כדור מתקשה"): a ball string may carry a move budget after
// its colour, e.g. 'R2' = a red ball that may still be moved twice. Every move
// spends one; at 0 the ball is hardened in place and can never move again.
// Targets, stacking and blends only look at the colour.
function colorOf(ball) { return ball[0]; }
function budgetOf(ball) { return ball.length > 1 ? Number(ball.slice(1)) : Infinity; }
function withBudget(color, budget) { return budget === Infinity ? color : color + String(budget); }
function sameColorStack(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (colorOf(a[i]) !== colorOf(b[i])) return false;
  return true;
}

// Pipes ("צנרת"): when a level declares `pipes` (undirected [a, b] pairs) and/or
// `oneWay` (directed [from, to] pairs), a ball may only be poured along an
// existing pipe. Levels without either field allow every pair, as before.
function pipeAllows(level, from, to) {
  if (!level.pipes && !level.oneWay) return true;
  if ((level.pipes || []).some(([a, b]) => (a === from && b === to) || (a === to && b === from))) return true;
  if ((level.oneWay || []).some(([a, b]) => a === from && b === to)) return true;
  return false;
}

// Centrifuge ("צנטריפוגה"): a tube that flips (reverses its contents) the
// moment it becomes full.
function settle(level, tubes, to) {
  if ((level.centrifuges || []).includes(to) && tubes[to].length === level.capacities[to]) tubes[to].reverse();
  return tubes;
}

function key(tubes) { return JSON.stringify(tubes); }
function clone(tubes) { return tubes.map(t => t.slice()); }

// Faithful copy of onTubeTap() ordering: pipe gate > chute > blend > placement.
function nextStates(level, tubes, moves, valveStates = {}) {
  const out = [];
  const caps = level.capacities;
  const blenders = level.blenders || [];
  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;
    if (isLocked(level, from, moves, tubes)) continue;
    if (!VALVES.canUseValveAsSource(level, valveStates, from)) continue;
    const movingRaw = tubes[from][tubes[from].length - 1];
    const budget = budgetOf(movingRaw);
    if (budget === 0) continue;                                 // hardened in place
    const moving = colorOf(movingRaw);
    const spent = budget === Infinity ? Infinity : budget - 1;
    for (let requestedTo = 0; requestedTo < tubes.length; requestedTo++) {
      if (requestedTo === from) continue;
      if (!pipeAllows(level, from, requestedTo)) continue;
      if (isLocked(level, requestedTo, moves, tubes)) continue;
      if (!VALVES.canUseValveAsDestination(level, valveStates, requestedTo)) continue;
      const route = PORTALS.resolvePortalMove(level, requestedTo);
      const to = route.to;
      if (to === from) continue;
      if (to !== requestedTo && isLocked(level, to, moves, tubes)) continue;
      if (to !== requestedTo && !VALVES.canUseValveAsDestination(level, valveStates, to)) continue;
      if (!accepts(level, to, moving)) continue;          // pre-shift color gate
      const effectiveColor = shifted(level, moving, to);
      const effective = withBudget(effectiveColor, spent);
      const dest = tubes[to];
      const nextValves = VALVES.toggleValvesAfterMove(level, valveStates, from, requestedTo);
      const move = { from, to: requestedTo };
      if (route.viaBottom) {
        // CHUTE: slide under the stack. No colour rule; capacity applies. In a
        // blender the chute meets the BOTTOM ball; a recipe pair blends there.
        const destBottom = dest.length ? colorOf(dest[0]) : null;
        const bottomBlend = blenders.includes(to) && destBottom !== null
          ? MIXING.mixPair(destBottom, effectiveColor) : null;
        if (bottomBlend) {
          const n = clone(tubes); n[from].pop(); n[to].shift(); n[to].unshift(bottomBlend);
          out.push({ tubes: n, valveStates: nextValves, move }); continue;
        }
        if (dest.length < caps[to]) {
          const n = clone(tubes); n[from].pop(); n[to].unshift(effective);
          out.push({ tubes: settle(level, n, to), valveStates: nextValves, move });
        }
        continue;
      }
      const destTop = dest.length ? colorOf(dest[dest.length - 1]) : null;
      const blendResult = blenders.includes(to) && destTop !== null
        ? MIXING.mixPair(destTop, effectiveColor) : null;
      const wouldStack = destTop === null || destTop === effectiveColor
        || destTop === 'J' || effectiveColor === 'J';
      if (blendResult) {
        const n = clone(tubes); n[from].pop(); n[to].pop(); n[to].push(blendResult);
        out.push({ tubes: n, valveStates: nextValves, move }); continue;
      }
      if (dest.length < caps[to] && wouldStack) {
        const n = clone(tubes); n[from].pop(); n[to].push(effective);
        out.push({ tubes: settle(level, n, to), valveStates: nextValves, move });
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
  // Move-count locks are time-dependent, so the SAME tube configuration at a
  // different moveCount is a DIFFERENT state. Key on (tubes, clampedMoves),
  // where moveCount is clamped to the last unlock (beyond it locks never
  // change, so moveCount stops mattering and the space stays bounded). For
  // lock-free levels maxUnlock is 0 → key collapses to tubes, no blowup.
  // Conditional locks derive from the tubes themselves and need no key part.
  const maxUnlock = (level.locks || []).reduce((m, L) => Math.max(m, L.unlockAt || 0), 0);
  const valveKey = (states) => JSON.stringify(states || {});
  const skey = (tubes, moves, valveStates) => key(tubes) + '|' + Math.min(moves, maxUnlock) + '|' + valveKey(valveStates);
  // Goal by colour: a hardened 'R0' in a slot that wants 'R' is home.
  const isGoal = (tubes) => tubes.length === level.target.length && tubes.every((t, i) => sameColorStack(t, level.target[i]));

  const start = clone(level.initial);
  const startValveStates = VALVES.initialValveStates(level);
  const seen = new Map();
  seen.set(skey(start, 0, startValveStates), {
    dist: 0, paths: 1, parent: null, move: null, tubes: start, valveStates: startValveStates
  });
  const queue = [skey(start, 0, startValveStates)];
  let head = 0, branchSum = 0, branchCount = 0, goal = null;

  while (head < queue.length) {
    const ck = queue[head++];
    const node = seen.get(ck);
    if (isGoal(node.tubes)) { goal = node; break; }   // goal by config
    const nbrs = nextStates(level, node.tubes, node.dist, node.valveStates);
    branchSum += nbrs.length; branchCount++;
    for (const next of nbrs) {
      const nt = next.tubes;
      const nextValveStates = next.valveStates;
      const nk = skey(nt, node.dist + 1, nextValveStates);
      const ex = seen.get(nk);
      if (!ex) {
        if (seen.size < STATE_CAP) {
          seen.set(nk, {
            dist: node.dist + 1,
            paths: node.paths,
            parent: ck,
            move: next.move,
            tubes: nt,
            valveStates: nextValveStates
          });
          queue.push(nk);
        }
      } else if (ex.dist === node.dist + 1) {
        ex.paths = Math.min(ex.paths + node.paths, 1e6);
      }
    }
  }

  if (!goal) return null;
  const pathStates = [];
  const moves = [];
  for (let k = skey(goal.tubes, goal.dist, goal.valveStates); k !== null; k = seen.get(k).parent) {
    const n = seen.get(k);
    pathStates.push(n.tubes);
    if (n.move) moves.push(n.move);
  }
  pathStates.reverse();
  moves.reverse();
  return {
    optimalMoves: goal.dist,
    numOptimalPaths: goal.paths,
    statesExplored: branchCount,
    avgBranching: branchCount ? branchSum / branchCount : 0,
    path: pathStates,
    moves
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
    while (k < c.length && k < t.length && colorOf(c[k]) === colorOf(t[k])) k++;
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
  for (const tube of initial) for (const b of tube) if (colorOf(b) !== 'J') colors.add(colorOf(b));
  for (const tube of level.target) for (const b of tube) if (colorOf(b) !== 'J') colors.add(colorOf(b));

  let colorBreaks = 0, buried = 0;
  for (let i = 0; i < initial.length; i++) {
    const c = initial[i], t = level.target[i] || [];
    for (let j = 0; j + 1 < c.length; j++) if (colorOf(c[j]) !== colorOf(c[j + 1])) colorBreaks++;
    let k = 0; while (k < c.length && k < t.length && colorOf(c[k]) === colorOf(t[k])) k++;
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
  for (const L of (level.locks || [])) {
    if (L.until) load += 0.12;                                   // dependency lock = ordering problem
    else load += 0.10 * Math.min(L.unlockAt / Math.max(optimalMoves, 1), 1);
  }
  load += 0.12 * (level.blenders || []).length;
  const shifts = (level.shifts || []).length + (level.shiftsBack || []).length;
  load += 0.08 * shifts + (shifts >= 2 ? 0.04 : 0);
  // A forward AND a reverse tube in the same level = genuine routing choice.
  if ((level.shifts || []).length && (level.shiftsBack || []).length) load += 0.06;
  const valves = level.valves || [];
  load += 0.06 * valves.length;
  if (valves.some(v => v.mode === 'flip')) load += 0.12;
  for (const p of (level.portals || [])) load += (p.mode === 'redirect') ? 0.10 : 0.12;  // chute = commitment
  load += 0.06 * (level.tubeColors || []).filter(Boolean).length;
  load += 0.08 * level.capacities.filter(c => c < 4).length;
  // Pipes: routing load grows as the graph gets sparser (fewer edges per tube).
  if (level.pipes || level.oneWay) {
    const edges = (level.pipes || []).length + (level.oneWay || []).length;
    const n = level.capacities.length;
    load += 0.10 + 0.10 * Math.max(0, 1 - edges / Math.max(1, n * (n - 1) / 2));
    if ((level.oneWay || []).length) load += 0.06;
  }
  load += 0.12 * (level.centrifuges || []).length;
  const hardening = level.initial.reduce((s, t) => s + t.filter(b => b.length > 1).length, 0);
  load += 0.10 * Math.min(hardening, 3);
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

// Difficulty tiers — by composite score, never by move count.
const TIERS = [
  { id: 'intro',    label: 'מבוא',   min: 0 },
  { id: 'practice', label: 'תרגול',  min: 20 },
  { id: 'puzzle',   label: 'פאזל',   min: 38 },
  { id: 'lab',      label: 'מעבדה',  min: 55 },
  { id: 'expert',   label: 'מומחה',  min: 70 },
  { id: 'master',   label: 'מאסטר',  min: 85 }
];
function tierFor(score) {
  let t = TIERS[0];
  for (const tier of TIERS) if (score >= tier.min) t = tier;
  return t;
}

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
    rows: s.rows,
    hint: b.moves.slice(0, 3)
  };
}

function analyzeAll(worlds) {
  const rows = [];
  for (const w of worlds) {
    w.levels.forEach((level, idx) => {
      const f = rawFeatures(level);   // null when the level is UNSOLVABLE under real rules
      rows.push({ worldId: w.id, worldName: w.name, level: idx + 1,
        levelCount: w.levels.length, declaredMoves: level.optimalMoves, f, _level: level });
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
    r.mult = mechanicMultiplier(r._level, r.f.moves);
    r.rawScore = lin * r.mult;
    r.cogLoad = cogW ? (cog / cogW) * 100 : 0;   // 0–100, pre-multiplier (germane load)
    scoreMin = Math.min(scoreMin, r.rawScore);
    scoreMax = Math.max(scoreMax, r.rawScore);
  }
  for (const r of solvable) {
    r.score = scoreMax === scoreMin ? 50 : ((r.rawScore - scoreMin) / (scoreMax - scoreMin)) * 100;
    r.tier = tierFor(r.score);
  }
  for (const r of rows) delete r._level;
  return rows;
}

// ---------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------
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
    console.log(`   ${pad('Lvl', 5)}${pad('score', 7)}${pad('tier', 10)}${pad('cogLoad', 9)}${pad('Δcog', 7)}${pad('regr', 6)}${pad('paths', 8)}${pad('opt', 5)}${pad('mult', 6)}`);
    let prevCog = null;
    wr.forEach(r => {
      const marker = r.level === mid ? ' ┄ midpoint' : '';
      if (!r.f) {
        console.log(`   ${pad(r.level, 5)}${pad('— UNSOLVABLE under real rules (declared ' + r.declaredMoves + ')', 0)}${marker}`);
        return;
      }
      const dcog = prevCog === null ? '' : (r.cogLoad - prevCog >= 0 ? '+' : '') + rnd(r.cogLoad - prevCog);
      console.log(`   ${pad(r.level, 5)}${pad(rnd(r.score), 7)}${pad(r.tier.id, 10)}${pad(rnd(r.cogLoad), 9)}${pad(dcog, 7)}${pad(r.f.regressive, 6)}${pad(r.f.numOptimalPaths, 8)}${pad(r.f.moves, 5)}${pad(rnd(r.mult, 2), 6)}${marker}`);
      prevCog = r.cogLoad;
    });
  }
}

// Opt-in gate helper for CI: back-half cognitive load must be non-decreasing,
// and no late level may score below an earlier one (monotonicity). Returns a
// list of violations (data, not verdicts). The tolerance absorbs small global
// normalization shifts when a new high-complexity world extends the scale.
function checkMonotonicity(rows, { includeHidden = false, tol = 4, worldIds: only } = {}) {
  const violations = [];
  const worldIds = [...new Set(rows.map(r => r.worldId))]
    .filter(id => includeHidden || !HIDDEN.includes(id))
    .filter(id => !only || only.includes(id));
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

// Cross-world gate helper: in the given (visible, in-order) world id list,
// each world's peak score must not fall below the previous world's peak by
// more than `tol`. Returns violations (data).
function checkWorldEscalation(rows, worldOrder, { tol = 6 } = {}) {
  const violations = [];
  let prevPeak = -Infinity, prevId = null;
  for (const id of worldOrder) {
    const wr = rows.filter(r => r.worldId === id && r.f);
    if (!wr.length) continue;
    const peak = Math.max(...wr.map(r => r.score));
    if (peak + tol < prevPeak) violations.push({ world: id, peak: rnd(peak), previousWorld: prevId, previousPeak: rnd(prevPeak) });
    prevPeak = Math.max(prevPeak, peak);
    prevId = id;
  }
  return violations;
}

// ---------------------------------------------------------------------
// Library exports + CLI
// ---------------------------------------------------------------------
module.exports = {
  bfs, rawFeatures, analyzeAll, checkMonotonicity, checkWorldEscalation,
  WEIGHTS, COGNITIVE_KEYS, TIERS, tierFor, mechanicMultiplier, HIDDEN, nextStates,
  colorOf, budgetOf, pipeAllows, sameColorStack
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
      score: rnd(r.score, 1), tier: r.tier && r.tier.id, mult: rnd(r.mult, 3)
    })), null, 2));
  } else if (args.includes('--check')) {
    const v = checkMonotonicity(rows, { includeHidden });
    if (!v.length) console.log('\n✓ Back-half cognitive load and score are monotonic in every visible world.');
    else { console.log('\n✗ Monotonicity violations (back half):'); v.forEach(x => console.log('  ', JSON.stringify(x))); }
  } else {
    report(rows, { includeHidden });
  }
}
