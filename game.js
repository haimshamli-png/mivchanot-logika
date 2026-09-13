/* =====================================================================
   STATE
   ===================================================================== */

const state = {
  screen: 'select',
  mode: 'solo',               // 'solo' | 'daily' | 'ta'
  currentWorld: 1,            // world id (matches WORLDS[i].id)
  currentLevel: 0,            // level index within the world
  capacities: [],             // per-tube capacity for current level
  tubes: [],
  target: [],
  locks: [],                  // [{ tubeIndex, unlockAt }] or [{ tubeIndex, until: { tube, equals? } }]
  tubeColors: [],             // per-tube color tag (null = agnostic, 'R'/'G'/'B'/'Y' = color-locked)
  shifts: [],                 // tube indices that shift incoming balls forward R→G→B→Y→R (W6)
  shiftsBack: [],             // tube indices that shift incoming balls backward R→Y→B→G→R (W6)
  blenders: [],               // tube indices that combine recipe colors into a new color (W8)
  valves: [],                 // [{ tubeIndex, mode: 'in'|'out'|'flip', starts?: 'in'|'out' }]
  valveStates: {},            // mutable state only for flip valves
  portals: [],                // [{ pair: [chute, exit], mode: 'bottom'|'redirect' }] — see portals.js
  pipes: [],                  // [[a, b], ...] undirected pipes — pour only along a pipe (צנרת)
  oneWay: [],                 // [[from, to], ...] directed pipes
  centrifuges: [],            // tube indices that flip (reverse) the moment they become full
  selectedTubeIndex: null,
  moveCount: 0,
  moveHistory: [],
  undoCount: 0,
  violationCount: 0,
  hintUsed: false,            // a hint forfeits the "optimal" stamp for this run
  hintActive: false,          // a hint arrow/banner is showing for the current move
  hintFree: false,            // this run's hint was paid with a free-hint token (stamp reward)
  lastViolation: null,        // rule key of the most recent illegal-move feedback (for toast escalation)
  taTimeLeft: 0,
  taTimerId: null,
  taSolved: 0,
  taRound: 0,
  taRng: null,
  taBoards: [],               // { moves, optimalMoves } per solved Time Attack board (accuracy score)
  dailyChallenge: null,
  serial: null,               // { season, index } while playing the weekly serial
  replaying: false,           // a recorded solution is playing on the board
  replayTimers: [],
  ladder: null,               // { rungs, index, climbed, dateKey } while climbing the calibration ladder
  expandedWorld: null         // world id whose level grid is open on the home shelf
};

/* =====================================================================
   SETTINGS (persisted) — theme, sound, haptics, ghost target, symbols, motion
   ===================================================================== */

const THEME_KEY = 'tubes-theme';
const PROGRESS_KEY = 'tubes-progress';
const TA_BEST_KEY = 'tubes-ta-best';
const TA_BEST_SCORE_KEY = 'tubes-ta-best-score';
const FREE_HINTS_USED_KEY = 'tubes-free-hints-used';
const DAILY_RESULTS_KEY = 'tubes-daily-results';
const REDUCE_ANIM_KEY = 'tubes-reduce-anim';
const SOUND_KEY = 'tubes-sound';
const HAPTICS_KEY = 'tubes-haptics';
const GHOST_KEY = 'tubes-ghost';
const SYMBOLS_KEY = 'tubes-symbols';
const LAST_KEY = 'tubes-last-level';
const SERIAL_KEY = 'tubes-serial';
const LADDER_KEY = 'tubes-ladder';
const VALID_THEMES = ['nostalgic', 'modern'];

const settings = { theme: 'nostalgic', reduceAnim: false, sound: true, haptics: true, ghost: true, symbols: false };

function readFlag(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1';
  } catch (e) { return fallback; }
}
function writeFlag(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
}

/* =====================================================================
   SOUND — tiny synthesized cues, no asset files. Theme-aware timbre:
   nostalgic = glass "tock", modern = soft synth blip.
   ===================================================================== */

let audioCtx = null;
function getAudio() {
  if (!settings.sound) return null;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (e) { return null; }
}

function playSound(kind) {
  const ctx = getAudio();
  if (!ctx) return;
  const modern = settings.theme === 'modern';
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.connect(gain);
  const cues = {
    tap:   { f: modern ? 660 : 520, f2: modern ? 660 : 480, d: 0.05, v: 0.08, type: modern ? 'triangle' : 'sine' },
    drop:  { f: modern ? 420 : 300, f2: modern ? 300 : 180, d: 0.09, v: 0.14, type: modern ? 'triangle' : 'sine' },
    home:  { f: modern ? 880 : 740, f2: modern ? 1320 : 990, d: 0.14, v: 0.10, type: modern ? 'sine' : 'triangle' },
    error: { f: 160, f2: 120, d: 0.12, v: 0.08, type: 'square' },
    win:   { f: 523, f2: 1046, d: 0.5, v: 0.12, type: modern ? 'sawtooth' : 'triangle' },
    tick:  { f: 1000, f2: 1000, d: 0.02, v: 0.05, type: 'sine' }
  };
  const c = cues[kind] || cues.tap;
  osc.type = c.type;
  osc.frequency.setValueAtTime(c.f, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, c.f2), t + c.d);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(c.v, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + c.d);
  osc.start(t);
  osc.stop(t + c.d + 0.02);
  if (kind === 'win') {
    // a second, higher voice for the win chord
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(784, t + 0.08);
    o2.frequency.exponentialRampToValueAtTime(1568, t + 0.5);
    g2.gain.setValueAtTime(0.0001, t + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.08, t + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o2.start(t + 0.08); o2.stop(t + 0.65);
  }
}

function haptic(kind) {
  if (!settings.haptics) return;
  const ms = { tap: 6, drop: 12, home: 20, error: 30, win: 60 }[kind] || 8;
  try {
    const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
    if (H && H.impact) {
      H.impact({ style: kind === 'win' ? 'HEAVY' : kind === 'home' ? 'MEDIUM' : 'LIGHT' });
      return;
    }
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
}

/* =====================================================================
   VIOLATION TOAST
   First time the player breaks a rule → short icon-led hint.
   Second time the SAME rule is broken in a row → full sentence.
   A successful move resets the counter so a new violation starts short again.
   ===================================================================== */

const VIOLATION_COPY = {
  lock:     { short: '🔒 נעולה',
              full: (ctx) => ctx.condition
                ? 'המבחנה נעולה עד שהמבחנה עם המפתח 🗝 תגיע בדיוק למצב שמצויר על התג.'
                : `המבחנה נעולה. עוד ${ctx.remaining} מהלכים והיא תיפתח.` },
  color:    { short: '🎯 צבע אחר',
              full: (ctx) => `המבחנה מקבלת רק כדור ${COLOR_NAME[ctx.color] || ctx.color} או ג'וקר.` },
  capacity: { short: '🚫 מלא',  full: () => 'המבחנה מלאה ולא יכולה לקבל עוד כדורים.' },
  stack:    { short: '❌ לא תואם',
              full: () => 'אפשר להניח כדור רק על אותו צבע, על ג\'וקר, או במבחנה ריקה.' },
  blend:    { short: '⚗️ אין מתכון',
              full: () => 'במבחנת ערבוב צריך זוג צבעים שיוצר צבע חדש לפי המתכונים.' },
  valveSource: { short: '↓ כניסה בלבד', full: () => 'השסתום הזה מקבל כדורים בלבד. אי אפשר לשפוך ממנו.' },
  valveDest:   { short: '↑ יציאה בלבד', full: () => 'השסתום הזה משחרר כדורים בלבד. אי אפשר לשפוך אליו.' },
  portalBack:  { short: '🌀 חוזר לכאן', full: () => 'הצינור הזה מוביל אל המבחנה שממנה יצא הכדור, לכן אין תנועה.' },
  pipe:        { short: '🔗 אין צינור', full: () => 'אפשר לשפוך רק אל מבחנה שמחוברת למקור בצינור. המבחנות המחוברות מוארות.' },
  hardened:    { short: '⌛ התקשה', full: () => 'הכדור הזה סיים את תקציב המהלכים שלו והתקשה במקומו לתמיד.' }
};
const COLOR_NAME = { R: 'אדום', G: 'ירוק', B: 'כחול', Y: 'צהוב', P: 'סגול', K: 'שחור', J: 'ג\'וקר' };

// `counts` = false for information taps (reading a lock, probing a chute):
// those show the hint but never cost the "clean hands" contract.
function showViolation(tubeIndex, rule, ctx, counts = true) {
  if (counts) state.violationCount++;
  const repeat = state.lastViolation === rule;
  state.lastViolation = rule;
  const copy = VIOLATION_COPY[rule];
  if (!copy) return;
  const text = repeat ? copy.full(ctx || {}) : copy.short;
  if (counts) { playSound('error'); haptic('error'); }

  const host = el.gameSection;
  if (!host) return;
  host.querySelectorAll('.violation-toast').forEach((t) => t.remove());
  const toast = document.createElement('div');
  toast.className = 'violation-toast' + (repeat ? ' full' : '');
  toast.textContent = text;
  host.appendChild(toast);
  const gs = host.getBoundingClientRect();
  const tubesTop = el.gameTubes.getBoundingClientRect().top;
  const gapTop = el.targetSection ? el.targetSection.getBoundingClientRect().bottom : gs.top;
  const gapMid = (gapTop + tubesTop) / 2;
  toast.style.top = Math.max(8, Math.round(gapMid - gs.top)) + 'px';
  setTimeout(() => toast.classList.add('fading'), repeat ? 3000 : 1100);
  setTimeout(() => toast.remove(), repeat ? 3350 : 1500);
}

function clearViolation() {
  state.lastViolation = null;
}

function dismissViolationToast() {
  if (!el.gameSection) return;
  el.gameSection.querySelectorAll('.violation-toast').forEach((t) => t.remove());
}

// Generic transient toast (hints, "copied").
let toastTimer = null;
function showToast(text, ms = 2200) {
  if (!el.toast) return;
  el.toast.textContent = text;
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), ms);
}

/* =====================================================================
   WORLD VISIBILITY + ROUTE ORDER
   Some worlds are retired from the main route but kept in levels.js so old
   progress entries stay loadable and their mechanics can be reused as side
   content. They don't appear in UI and don't count toward star totals.
   ===================================================================== */
const HIDDEN_WORLD_IDS = [2, 5, 9];
function isWorldVisible(world) {
  return !HIDDEN_WORLD_IDS.includes(world.id);
}
// The route the player sees: visible worlds sorted by their explicit `order`.
function visibleWorlds() {
  return WORLDS.filter(isWorldVisible)
    .slice()
    .sort((a, b) => (a.order || a.id) - (b.order || b.id));
}
function getWorld(id) { return WORLDS.find(w => w.id === id); }

/* =====================================================================
   LOCKS — derived from moveCount / tube contents, so undo rewinds them free.
   ===================================================================== */
function lockCondition(L) {
  if (!L.until) return null;
  const tube = L.until.tube;
  return { tube, contents: L.until.equals || state.target[tube] };
}

function stacksEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function tubeLockInfo(tubeIndex) {
  for (const L of state.locks) {
    if (L.tubeIndex !== tubeIndex) continue;
    if (L.until) {
      const condition = lockCondition(L);
      if (!stacksEqual(state.tubes[condition.tube], condition.contents)) {
        return { locked: true, remaining: 0, condition };
      }
    } else if (state.moveCount < L.unlockAt) {
      return { locked: true, remaining: L.unlockAt - state.moveCount };
    }
  }
  return { locked: false, remaining: 0 };
}

// Is this tube the "key" of a currently sealed conditional lock?
function isLockKeyTube(tubeIndex) {
  return state.locks.some(L => L.until && L.until.tube === tubeIndex && tubeLockInfo(L.tubeIndex).locked);
}

// A color-locked tube accepts only its color (or the joker wildcard).
function tubeAcceptsColor(tubeIndex, ball) {
  const c = state.tubeColors[tubeIndex];
  if (c === null || c === undefined) return true;
  return ball === c || ball === 'J';
}

function blendedBall(topBall, incomingBall) {
  const api = window.PIGMENT_MIXING || (typeof PIGMENT_MIXING !== 'undefined' ? PIGMENT_MIXING : null);
  if (!api) return null;
  return api.mixPair(topBall, incomingBall);
}

// Shift cycle (W6): forward R→G→B→Y→R, reverse R→Y→B→G→R. Joker is immune.
const SHIFT_CYCLE = { R: 'G', G: 'B', B: 'Y', Y: 'R' };
const SHIFT_CYCLE_BACK = { R: 'Y', Y: 'B', B: 'G', G: 'R' };
function shiftedBall(ball, tubeIndex) {
  if (ball === 'J') return ball;
  if (state.shifts.includes(tubeIndex)) return SHIFT_CYCLE[ball] || ball;
  if (state.shiftsBack.includes(tubeIndex)) return SHIFT_CYCLE_BACK[ball] || ball;
  return ball;
}

// Hardening balls ("כדור מתקשה"): 'R2' = red with two moves left. Every move
// spends one; at 0 the ball is hardened in place. Colour is all that matters
// for stacking, blending and the target.
function colorOf(ball) { return ball[0]; }
function budgetOf(ball) { return ball.length > 1 ? Number(ball.slice(1)) : Infinity; }
function withBudget(color, budget) { return budget === Infinity ? color : color + String(budget); }

// Pipes ("צנרת"): pour only along a drawn pipe. Levels without pipes allow all.
function pipeAllows(from, to) {
  if (!state.pipes.length && !state.oneWay.length) return true;
  if (state.pipes.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) return true;
  if (state.oneWay.some(([a, b]) => a === from && b === to)) return true;
  return false;
}
function hasPipes() { return state.pipes.length > 0 || state.oneWay.length > 0; }

// Centrifuge ("צנטריפוגה"): a tube flips the moment it becomes full.
function settleCentrifuge(to) {
  if (state.centrifuges.includes(to) && state.tubes[to].length === state.capacities[to]) {
    state.tubes[to].reverse();
    return true;
  }
  return false;
}

function getPortalApi() { return window.PORTALS || (typeof PORTALS !== 'undefined' ? PORTALS : null); }
function getContractApi() { return window.CONTRACTS || (typeof CONTRACTS !== 'undefined' ? CONTRACTS : null); }
function getDailyApi() { return window.DAILY_CHALLENGE || (typeof DAILY_CHALLENGE !== 'undefined' ? DAILY_CHALLENGE : null); }
function getValveApi() { return window.VALVES || (typeof VALVES !== 'undefined' ? VALVES : null); }
function getTaApi() { return window.TA_GENERATOR || (typeof TA_GENERATOR !== 'undefined' ? TA_GENERATOR : null); }
function getSerialApi() { return window.SERIAL || (typeof SERIAL !== 'undefined' ? SERIAL : null); }
function getLevelMeta(worldId, levelIndex) {
  const meta = typeof LEVEL_META !== 'undefined' ? LEVEL_META : (window.LEVEL_META || null);
  if (!meta) return null;
  const w = meta[String(worldId)];
  return (w && w[String(levelIndex)]) || null;
}
function getSerialMeta(seasonId, episodeIndex) {
  const meta = typeof LEVEL_META !== 'undefined' ? LEVEL_META : (window.LEVEL_META || null);
  const s = meta && meta.serial && meta.serial[seasonId];
  return (s && s[String(episodeIndex)]) || null;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const TIER_LABEL = { intro: 'מבוא', practice: 'תרגול', puzzle: 'פאזל', lab: 'מעבדה', expert: 'מומחה', master: 'מאסטר' };

/* =====================================================================
   DOM
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const el = {
  screenSelect: $('screen-select'),
  screenGame: $('screen-game'),
  worldsContainer: $('worlds-container'),
  totalStars: $('total-stars'),
  maxStars: $('max-stars'),
  totalContracts: $('total-contracts'),
  maxContracts: $('max-contracts'),
  stampRank: $('stamp-rank'),
  settingsBtnSelect: $('settings-btn-select'),
  resetProgressBtn: $('reset-progress-btn'),
  continueCard: $('continue-card'),
  continueKicker: $('continue-kicker'),
  continueTitle: $('continue-title'),
  continueBar: $('continue-bar'),
  continueSub: $('continue-sub'),
  timeAttackBtn: $('time-attack-btn'),
  taBest: $('ta-best'),
  taBestScore: $('ta-best-score'),
  dailyBtn: $('daily-btn'),
  dailySub: $('daily-sub'),
  dailyOverlay: $('daily-overlay'),
  dailyKicker: $('daily-kicker'),
  dailyTiers: $('daily-tiers'),
  dailyCloseBtn: $('daily-close-btn'),
  serialBtn: $('serial-btn'),
  serialSub: $('serial-sub'),
  ladderBtn: $('ladder-btn'),
  ladderSub: $('ladder-sub'),
  serialOverlay: $('serial-overlay'),
  serialKicker: $('serial-kicker'),
  serialTitle: $('serial-title'),
  serialBody: $('serial-body'),
  serialPlayBtn: $('serial-play-btn'),
  serialRecapBtn: $('serial-recap-btn'),
  serialCloseBtn: $('serial-close-btn'),
  replayBanner: $('replay-banner'),
  hintBanner: $('hint-banner'),
  hintBannerText: $('hint-banner-text'),
  replayText: $('replay-text'),
  replaySkipBtn: $('replay-skip-btn'),
  ladderOverlay: $('ladder-overlay'),
  ladderTitle: $('ladder-title'),
  ladderBody: $('ladder-body'),
  ladderRungs: $('ladder-rungs'),
  ladderShareBtn: $('ladder-share-btn'),
  ladderBackBtn: $('ladder-back-btn'),

  soloHeader: $('solo-header'),
  backBtn: $('back-btn'),
  worldName: $('world-name'),
  levelNumber: $('level-number'),
  levelTier: $('level-tier'),
  moves: $('moves'),
  par: $('par'),
  liveStars: $('live-stars'),
  settingsBtn: $('settings-btn'),
  soloFooter: $('solo-footer'),

  taHeader: $('ta-header'),
  taBackBtn: $('ta-back-btn'),
  taSolved: $('ta-solved'),
  taScore: $('ta-score'),
  taTime: $('ta-time'),
  settingsBtnTa: $('settings-btn-ta'),
  quickFlash: $('quick-flash'),

  targetSection: $('target-section'),
  targetTubes: $('target-tubes'),
  targetZoom: $('target-zoom'),
  targetZoomTubes: $('target-zoom-tubes'),
  ruleCard: $('rule-card'),
  gameSection: $('game-section'),
  gameTubes: $('game-tubes'),
  pipesLayer: $('pipes-layer'),
  undoBtn: $('undo-btn'),
  undoCount: $('undo-count'),
  hintBtn: $('hint-btn'),
  resetBtn: $('reset-btn'),

  winOverlay: $('win-overlay'),
  winTitle: $('win-title'),
  winMoves: $('win-moves'),
  winOptimal: $('win-optimal'),
  winBest: $('win-best'),
  winBestWrap: $('win-best-wrap'),
  winRecord: $('win-record'),
  winStars: $('win-stars'),
  winStarHint: $('win-star-hint'),
  winMilestone: $('win-milestone'),
  winContracts: $('win-contracts'),
  nextBtn: $('next-btn'),
  retryBtn: $('retry-btn'),
  shareBtn: $('share-btn'),
  backToSelectBtn: $('back-to-select-btn'),
  completeOverlay: $('game-complete-overlay'),
  completeTitle: $('complete-title'),
  completeBody: $('complete-body'),
  completeBackBtn: $('complete-back-btn'),
  taResultOverlay: $('ta-result-overlay'),
  taResultSolved: $('ta-result-solved'),
  taResultScore: $('ta-result-score'),
  taResultPrecision: $('ta-result-precision'),
  taResultNewBest: $('ta-result-new-best'),
  taResultNewBestScore: $('ta-result-new-best-score'),
  taResultPrev: $('ta-result-prev'),
  taResultPrevScore: $('ta-result-prev-score'),
  taResultBackBtn: $('ta-result-back-btn'),
  taResultRetryBtn: $('ta-result-retry-btn'),

  settingsOverlay: $('settings-overlay'),
  settingsCloseBtn: $('settings-close-btn'),
  themeButtons: document.querySelectorAll('[data-theme-value]'),
  reduceAnimToggle: $('reduce-anim-toggle'),
  soundToggle: $('sound-toggle'),
  hapticsToggle: $('haptics-toggle'),
  ghostToggle: $('ghost-toggle'),
  symbolsToggle: $('symbols-toggle'),
  celebration: $('celebration'),
  fxLayer: $('fx-layer'),
  toast: $('toast')
};

/* =====================================================================
   PERSISTENCE
   progress shape:
     { "1": { "0": {stars, bestMoves, contracts}, "1": ... }, "2": { ... } }
   keyed by world id (string), then level index (string).
   ===================================================================== */

let progress = {};

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    // Migration: old flat format { "0": {stars,...}, "1": ... } → wrap as world 1
    const values = Object.values(parsed);
    const isOldFormat = values.length > 0 && values[0] && typeof values[0].stars === 'number';
    progress = isOldFormat ? { '1': parsed } : parsed;
    if (isOldFormat) saveProgress();
  } catch (e) { progress = {}; }
}

function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) {}
}

function getWorldProgress(worldId) { return progress[String(worldId)] || {}; }
function getLevelRecord(worldId, levelIndex) { return getWorldProgress(worldId)[String(levelIndex)]; }

function recordResult(worldId, levelIndex, moves, stars, earnedContracts = {}) {
  const wid = String(worldId);
  const lid = String(levelIndex);
  if (!progress[wid]) progress[wid] = {};
  const existing = progress[wid][lid];
  const contractApi = getContractApi();
  const contracts = contractApi
    ? contractApi.mergeContracts(existing && existing.contracts, earnedContracts)
    : (existing && existing.contracts) || earnedContracts;
  const contractCount = contractApi ? contractApi.countContracts(contracts) : 0;
  const existingContractCount = contractApi ? contractApi.countContracts(existing && existing.contracts) : 0;
  const isRecord = !existing || stars > existing.stars || (stars === existing.stars && moves < existing.bestMoves);
  if (isRecord) {
    progress[wid][lid] = { stars, bestMoves: moves, contracts };
    saveProgress();
  } else if (contractCount > existingContractCount) {
    progress[wid][lid] = { ...existing, contracts };
    saveProgress();
  }
  return { isRecord: !!existing && isRecord, previous: existing };
}

function getWorldStars(worldId) {
  return Object.values(getWorldProgress(worldId)).reduce((sum, r) => sum + (r.stars || 0), 0);
}
function getWorldSolved(worldId) {
  return Object.values(getWorldProgress(worldId)).filter(r => r && r.stars > 0).length;
}
function getTotalStars() {
  return visibleWorlds().reduce((sum, w) => sum + getWorldStars(w.id), 0);
}
function getMaxStars() {
  return visibleWorlds().reduce((sum, w) => sum + w.levels.length * 3, 0);
}

// Challenge stamps (contracts) earned across every visible world.
function getTotalContracts() {
  const api = getContractApi();
  if (!api) return 0;
  return visibleWorlds().reduce((sum, w) => {
    const wp = getWorldProgress(w.id);
    return sum + Object.values(wp).reduce((s, r) => s + api.countContracts(r && r.contracts), 0);
  }, 0);
}
function getMaxContracts() { return getMaxStars(); }

// Star gates open the main route; the expert route opens by stamps instead.
function isWorldUnlocked(world) {
  if (world.unlockContracts) return getTotalContracts() >= world.unlockContracts;
  return getTotalStars() >= world.unlockStars;
}

// Soft gating inside a world: a level opens when the previous level is
// solved, OR the one before it — so a player may skip a single stuck level.
function isLevelUnlocked(worldId, levelIndex) {
  const world = getWorld(worldId);
  if (!isWorldUnlocked(world)) return false;
  if (levelIndex === 0) return true;
  const prev = getLevelRecord(worldId, levelIndex - 1);
  if (prev && prev.stars > 0) return true;
  if (levelIndex >= 2) {
    const prev2 = getLevelRecord(worldId, levelIndex - 2);
    return !!(prev2 && prev2.stars > 0);
  }
  return false;
}

function getTABest() {
  const v = parseInt(localStorage.getItem(TA_BEST_KEY) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}
function setTABest(n) { try { localStorage.setItem(TA_BEST_KEY, String(n)); } catch (e) {} }
function getTABestScore() {
  const v = parseInt(localStorage.getItem(TA_BEST_SCORE_KEY) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}
function setTABestScore(n) { try { localStorage.setItem(TA_BEST_SCORE_KEY, String(n)); } catch (e) {} }

// Stamp rewards: every 25 challenge stamps grants one free hint — a hint
// that keeps the "optimal" stamp. Tokens = milestones reached − tokens spent.
function getFreeHintsUsed() {
  const v = parseInt(localStorage.getItem(FREE_HINTS_USED_KEY) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}
function setFreeHintsUsed(n) { try { localStorage.setItem(FREE_HINTS_USED_KEY, String(n)); } catch (e) {} }
function getFreeHints() {
  const api = getContractApi();
  if (!api) return 0;
  return Math.max(0, api.milestonesReached(getTotalContracts()) - getFreeHintsUsed());
}

// Day entries are normalised on read so pre-tier history (one result per
// day) still counts for streaks and shows up as the middle tier.
function getDailyResults() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(DAILY_RESULTS_KEY) || '{}'); }
  catch (e) { raw = {}; }
  const api = getDailyApi();
  if (!api) return raw;
  const out = {};
  Object.keys(raw).forEach((k) => { out[k] = api.normalizeDayResult(raw[k]); });
  return out;
}
function saveDailyResults(results) {
  try { localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(results)); } catch (e) {}
}
function recordDailyResult(challenge, moves, stars, modifierPassed) {
  if (!challenge) return;
  const results = getDailyResults();
  const day = results[challenge.key] || { modifierId: challenge.modifier.id, tiers: {} };
  if (!day.tiers) day.tiers = {};
  const existing = day.tiers[challenge.tier];
  if (!existing || stars > existing.stars || (stars === existing.stars && moves < existing.bestMoves)) {
    day.tiers[challenge.tier] = {
      worldId: challenge.worldId,
      levelIndex: challenge.levelIndex,
      stars,
      bestMoves: moves,
      modifierPassed: !!modifierPassed || !!(existing && existing.modifierPassed)
    };
  } else if (modifierPassed && !existing.modifierPassed) {
    day.tiers[challenge.tier] = { ...existing, modifierPassed: true };
  }
  results[challenge.key] = day;
  saveDailyResults(results);
}

function getLastPlayed() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch (e) { return null; }
}
function setLastPlayed(worldId, levelIndex) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ worldId, levelIndex })); } catch (e) {}
}
function getSerialRecord() {
  try { return JSON.parse(localStorage.getItem(SERIAL_KEY) || 'null'); } catch (e) { return null; }
}
function saveSerialRecord(rec) {
  try { localStorage.setItem(SERIAL_KEY, JSON.stringify(rec)); } catch (e) {}
}
function getLadderResults() {
  try { return JSON.parse(localStorage.getItem(LADDER_KEY) || '{}'); } catch (e) { return {}; }
}
function saveLadderResults(results) {
  try { localStorage.setItem(LADDER_KEY, JSON.stringify(results)); } catch (e) {}
}
function todayKey() {
  const api = getDailyApi();
  return api ? api.getDateKey(new Date()) : new Date().toISOString().slice(0, 10);
}

/* =====================================================================
   THEME + SETTINGS APPLY
   ===================================================================== */

function applyTheme(theme) {
  if (!VALID_THEMES.includes(theme)) theme = 'nostalgic';
  settings.theme = theme;
  document.body.setAttribute('data-theme', theme);
  el.themeButtons.forEach(b => b.classList.toggle('active', b.dataset.themeValue === theme));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'modern' ? '#0a0e1a' : '#6b2a14');
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function applyReduceAnim(on) {
  settings.reduceAnim = on;
  document.body.classList.toggle('reduce-anim', on);
  el.reduceAnimToggle.checked = on;
  writeFlag(REDUCE_ANIM_KEY, on);
}
function applySound(on) { settings.sound = on; el.soundToggle.checked = on; writeFlag(SOUND_KEY, on); }
function applyHaptics(on) { settings.haptics = on; el.hapticsToggle.checked = on; writeFlag(HAPTICS_KEY, on); }
function applyGhost(on) {
  settings.ghost = on;
  document.body.classList.toggle('ghost-on', on);
  el.ghostToggle.checked = on;
  writeFlag(GHOST_KEY, on);
  if (state.screen === 'game') renderGame(true);
}
function applySymbols(on) {
  settings.symbols = on;
  document.body.classList.toggle('symbols-on', on);
  el.symbolsToggle.checked = on;
  writeFlag(SYMBOLS_KEY, on);
}

function initSettings() {
  let theme = 'nostalgic';
  try { theme = localStorage.getItem(THEME_KEY) || 'nostalgic'; } catch (e) {}
  applyTheme(theme);
  applyReduceAnim(readFlag(REDUCE_ANIM_KEY, false));
  applySound(readFlag(SOUND_KEY, true));
  applyHaptics(readFlag(HAPTICS_KEY, true));
  applyGhost(readFlag(GHOST_KEY, true));
  applySymbols(readFlag(SYMBOLS_KEY, false));
}

/* =====================================================================
   SCREEN ROUTING
   ===================================================================== */

function showScreen(name) {
  state.screen = name;
  el.screenSelect.classList.toggle('hidden', name !== 'select');
  el.screenGame.classList.toggle('hidden', name !== 'game');
  document.body.classList.toggle('in-game', name === 'game');
  if (name === 'select') renderLevelSelect();
}

function showModeUI() {
  const ta = state.mode === 'ta';
  el.soloHeader.classList.toggle('hidden', ta);
  el.taHeader.classList.toggle('hidden', !ta);
  el.soloFooter.classList.toggle('hidden', ta);
  document.body.classList.toggle('ta-mode', ta);
}

/* =====================================================================
   HOME — continue card, mode tiles, worlds shelf
   ===================================================================== */

function renderStarsRow(starsEarned, total = 3, wrap = true) {
  let html = wrap ? '<span class="stars-row">' : '';
  let remaining = Math.max(0, starsEarned);
  for (let i = 0; i < total; i++) {
    const fill = Math.max(0, Math.min(1, remaining));
    remaining -= 1;
    html += `<span class="star" style="--fill: ${fill * 100}%"></span>`;
  }
  if (wrap) html += '</span>';
  return html;
}

function formatStars(n) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
}

function getCurrentWorld() { return getWorld(state.currentWorld); }

// Where should "continue" take the player? The last played level if it is
// still unsolved, else the first unlocked-and-unsolved level on the route.
function findContinueTarget() {
  const last = getLastPlayed();
  if (last) {
    const w = getWorld(last.worldId);
    const rec = w && getLevelRecord(w.id, last.levelIndex);
    if (w && isWorldVisible(w) && w.levels[last.levelIndex] && !(rec && rec.stars > 0) && isLevelUnlocked(w.id, last.levelIndex)) {
      return { world: w, levelIndex: last.levelIndex };
    }
  }
  for (const w of visibleWorlds()) {
    if (!isWorldUnlocked(w)) continue;
    for (let i = 0; i < w.levels.length; i++) {
      const rec = getLevelRecord(w.id, i);
      if (!(rec && rec.stars > 0) && isLevelUnlocked(w.id, i)) return { world: w, levelIndex: i };
    }
  }
  // Everything solved: offer the weakest 3★ chase instead.
  let weakest = null;
  for (const w of visibleWorlds()) {
    if (!isWorldUnlocked(w)) continue;
    w.levels.forEach((lvl, i) => {
      const rec = getLevelRecord(w.id, i);
      const stars = rec ? rec.stars : 0;
      if (stars < 3 && (!weakest || stars < weakest.stars)) weakest = { world: w, levelIndex: i, stars, chase: true };
    });
  }
  return weakest;
}

function renderContinueCard() {
  const t = findContinueTarget();
  if (!t) {
    el.continueKicker.textContent = 'סיימת הכול';
    el.continueTitle.textContent = 'כל השלבים פתורים עם 3 כוכבים';
    el.continueBar.style.width = '100%';
    el.continueSub.textContent = 'נסה את הניסוי היומי או Time Attack';
    el.continueCard.onclick = null;
    return;
  }
  const meta = getLevelMeta(t.world.id, t.levelIndex);
  const tier = meta ? TIER_LABEL[meta.tier] : '';
  const solved = getWorldSolved(t.world.id);
  el.continueKicker.textContent = t.chase ? 'מרדף 3 כוכבים' : 'המשך מאיפה שעצרת';
  el.continueTitle.textContent = `${t.world.icon} ${t.world.name} · שלב ${t.levelIndex + 1}${tier ? ' · ' + tier : ''}`;
  el.continueBar.style.width = `${Math.round((solved / t.world.levels.length) * 100)}%`;
  el.continueSub.textContent = `${solved} / ${t.world.levels.length} שלבים בעולם · ${formatStars(getWorldStars(t.world.id))} / ${t.world.levels.length * 3} ★`;
  el.continueCard.onclick = () => startSoloLevel(t.world.id, t.levelIndex);
  state.expandedWorld = state.expandedWorld || t.world.id;
}

function getUnlockedWorldIds() {
  return visibleWorlds().filter(w => isWorldUnlocked(w) && !w.expert).map(w => w.id);
}

// Today's bundle: one lab rule, three puzzles (easy / medium / hard) drawn
// from the unlocked pool ranked by composite difficulty score.
function getTodaysDaily() {
  const api = getDailyApi();
  if (!api) return null;
  return api.pickDailyChallenges(WORLDS, new Date(), {
    hiddenWorldIds: HIDDEN_WORLD_IDS,
    allowedWorldIds: getUnlockedWorldIds(),
    scoreOf: (worldId, levelIndex) => { const m = getLevelMeta(worldId, levelIndex); return m ? m.score : null; }
  });
}
function getTodaysDailyChallenge(tierId = 'medium') {
  const bundle = getTodaysDaily();
  if (!bundle) return null;
  return bundle.tiers.find(t => t.tier === tierId) || bundle.tiers[1];
}
function dailyTierStatus(tierId, dayEntry) {
  const api = getDailyApi();
  return api ? api.tierResult(dayEntry, tierId) : null;
}

function renderDailyCard() {
  if (!el.dailyBtn || !el.dailySub) return;
  const api = getDailyApi();
  const bundle = getTodaysDaily();
  if (!bundle) {
    el.dailyBtn.disabled = true;
    el.dailySub.textContent = 'אין היום ניסוי זמין';
    return;
  }
  const results = getDailyResults();
  const day = results[bundle.key];
  const streak = api.computeStreak(results, bundle.key);
  const tiersRow = bundle.tiers.map((t) => {
    const r = dailyTierStatus(t.tier, day);
    return `${t.tierIcon}${r ? (r.modifierPassed ? '✓' : '○') : ''}`;
  }).join(' ');
  const parts = [`${bundle.modifier.icon} ${bundle.modifier.label}`, tiersRow];
  if (streak.current > 0) parts.push(`🔥 רצף ${streak.current}`);
  el.dailyBtn.disabled = false;
  el.dailySub.textContent = parts.join(' · ');
}

// Tier chooser overlay: three cards, each with its puzzle, level tier and
// today's result on it.
function openDailyChooser() {
  const bundle = getTodaysDaily();
  if (!bundle) return;
  const results = getDailyResults();
  const day = results[bundle.key];
  const streak = getDailyApi().computeStreak(results, bundle.key);
  el.dailyKicker.textContent = `🗓 ניסוי יומי · ${bundle.key}` + (streak.current > 0 ? ` · 🔥 רצף ${streak.current}` : '');
  el.dailyTiers.innerHTML = '';
  bundle.tiers.forEach((t) => {
    const world = getWorld(t.worldId);
    const meta = getLevelMeta(t.worldId, t.levelIndex);
    const r = dailyTierStatus(t.tier, day);
    const btn = document.createElement('button');
    btn.className = `daily-tier tier-${t.tier}` + (r ? ' done' : '');
    const status = r
      ? (r.modifierPassed ? `הושלם ✓ · ${r.bestMoves} מהלכים` : `נפתר ○ · שיא ${r.bestMoves} · הכלל עוד פתוח`)
      : `יעד ${t.level.optimalMoves} מהלכים`;
    btn.innerHTML =
      `<span class="daily-tier-head"><span class="daily-tier-name">${t.tierIcon} ${t.tierLabel}</span>` +
      (meta && TIER_LABEL[meta.tier] ? `<span class="tier-chip tier-${meta.tier}">${TIER_LABEL[meta.tier]}</span>` : '') + `</span>` +
      `<span class="daily-tier-level">${world.icon} ${world.name} · שלב ${t.levelIndex + 1}</span>` +
      `<span class="daily-tier-status">${status}</span>`;
    btn.addEventListener('click', () => { closeDailyChooser(); startDailyChallenge(t.tier); });
    el.dailyTiers.appendChild(btn);
  });
  const m = bundle.modifier;
  el.dailyTiers.insertAdjacentHTML('beforeend',
    `<p class="daily-rule">${m.icon} <b>${m.label}</b> — ${m.description} הכלל של היום חל על שלוש הדרגות.</p>`);
  el.dailyOverlay.classList.remove('hidden');
}
function closeDailyChooser() { el.dailyOverlay.classList.add('hidden'); }

// Stamp rank line under the totals: current title, distance to the next
// reward, and unspent free hints.
function renderStampRank() {
  if (!el.stampRank) return;
  const api = getContractApi();
  if (!api) { el.stampRank.textContent = ''; return; }
  const total = getTotalContracts();
  const rank = api.rankFor(total);
  const free = getFreeHints();
  const parts = [];
  if (rank.title) parts.push(`◎ ${rank.title}`);
  if (!rank.maxed) parts.push(`עוד ${rank.remaining} חותמות לפרס הבא`);
  if (free > 0) parts.push(`💡 ${free} ${free === 1 ? 'רמז חופשי' : 'רמזים חופשיים'}`);
  el.stampRank.textContent = parts.join(' · ');
  el.stampRank.classList.toggle('hidden', parts.length === 0);
}

function renderLevelSelect() {
  renderContinueCard();
  el.worldsContainer.innerHTML = '';
  const contractApi = getContractApi();
  visibleWorlds().forEach(world => {
    const unlocked = isWorldUnlocked(world);
    const row = document.createElement('div');
    row.className = 'world-row' + (unlocked ? '' : ' locked') + (world.expert ? ' expert' : '');
    const worldStars = getWorldStars(world.id);
    const worldMax = world.levels.length * 3;
    const solved = getWorldSolved(world.id);
    const expanded = unlocked && state.expandedWorld === world.id;
    if (expanded) row.classList.add('open');

    let lockText = '';
    if (!unlocked) {
      if (world.unlockContracts) {
        lockText = `עוד ${Math.max(0, world.unlockContracts - getTotalContracts())} חותמות אתגר`;
      } else {
        lockText = `עוד ${formatStars(Math.max(0, world.unlockStars - getTotalStars()))} כוכבים`;
      }
    }

    const head = document.createElement('button');
    head.className = 'world-head';
    head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    head.innerHTML = `
      <span class="world-icon">${world.icon}</span>
      <span class="world-main">
        <span class="world-title-row">
          <span class="world-title">${world.name}</span>
          <span class="world-stars num">${unlocked ? `${formatStars(worldStars)} / ${worldMax} ★` : '🔒'}</span>
        </span>
        ${unlocked
          ? `<span class="progress-bar"><i style="width:${Math.round((solved / world.levels.length) * 100)}%"></i></span>`
          : `<span class="world-lock-text">${lockText}</span>`}
      </span>
      <span class="world-chevron">${unlocked ? '▾' : ''}</span>
    `;
    if (unlocked) {
      head.addEventListener('click', () => {
        state.expandedWorld = state.expandedWorld === world.id ? null : world.id;
        renderLevelSelect();
      });
    } else {
      head.disabled = true;
    }
    row.appendChild(head);

    if (expanded) {
      const desc = document.createElement('div');
      desc.className = 'world-desc';
      desc.textContent = world.description;
      row.appendChild(desc);

      const grid = document.createElement('div');
      grid.className = 'level-grid';
      world.levels.forEach((level, i) => {
        const lvlUnlocked = isLevelUnlocked(world.id, i);
        const rec = getLevelRecord(world.id, i);
        const stars = rec ? rec.stars : 0;
        const contractCount = contractApi ? contractApi.countContracts(rec && rec.contracts) : 0;
        const meta = getLevelMeta(world.id, i);
        const card = document.createElement('button');
        card.className = 'level-card' + (lvlUnlocked ? '' : ' locked') + (meta ? ` tier-${meta.tier}` : '');
        card.disabled = !lvlUnlocked;
        card.setAttribute('aria-label', rec
          ? `שלב ${i + 1}, ${formatStars(stars)} כוכבים, ${contractCount} מתוך 3 חותמות`
          : `שלב ${i + 1}`);
        card.innerHTML =
          `<span class="num">${i + 1}</span>` +
          (meta ? `<span class="tier-chip small">${TIER_LABEL[meta.tier] || ''}</span>` : '') +
          (lvlUnlocked ? renderStarsRow(stars) : '') +
          (rec ? `<span class="level-contracts" title="חותמות אתגר">${contractCount}/3</span>` : '');
        if (lvlUnlocked) card.addEventListener('click', () => startSoloLevel(world.id, i));
        grid.appendChild(card);
      });
      row.appendChild(grid);
    }
    el.worldsContainer.appendChild(row);
  });

  el.totalStars.textContent = formatStars(getTotalStars());
  el.maxStars.textContent = getMaxStars();
  el.totalContracts.textContent = getTotalContracts();
  el.maxContracts.textContent = getMaxContracts();
  el.taBest.textContent = getTABest() || '—';
  el.taBestScore.textContent = getTABestScore() ? `${getTABestScore()} נק'` : '—';
  renderStampRank();
  renderDailyCard();
  renderSerialCard();
  renderLadderCard();
}

/* =====================================================================
   WEEKLY SERIAL — "ניסוי השבוע": seven chained episodes, one per day
   ===================================================================== */

function currentSeason() {
  const api = getSerialApi();
  if (!api || !api.SERIAL_SEASONS.length) return null;
  const rec = getSerialRecord();
  const seasons = api.SERIAL_SEASONS;
  const active = rec && seasons.find(s => s.id === rec.seasonId);
  return active || seasons[0];
}

// The season after the active one, if it exists (offered once the active
// season is complete).
function nextSeason() {
  const api = getSerialApi();
  const season = currentSeason();
  if (!api || !season) return null;
  const i = api.SERIAL_SEASONS.findIndex(s => s.id === season.id);
  return api.SERIAL_SEASONS[i + 1] || null;
}

function serialProgress() {
  const api = getSerialApi();
  const season = currentSeason();
  if (!api || !season) return null;
  return { season, progress: api.seasonProgress(season, getSerialRecord(), todayKey()) };
}

function renderSerialCard() {
  if (!el.serialBtn) return;
  const sp = serialProgress();
  if (!sp) { el.serialBtn.disabled = true; el.serialSub.textContent = 'אין עונה זמינה'; return; }
  const { season, progress } = sp;
  el.serialBtn.disabled = false;
  if (progress.complete) {
    const next = nextSeason();
    el.serialSub.textContent = next ? `${season.title} הושלמה ✓ · ${next.title}: פרק 1 מוכן` : `${season.title} · העונה הושלמה ✓`;
  }
  else if (!progress.started) el.serialSub.textContent = `${season.title} · פרק 1 מוכן`;
  else if (progress.waitingForTomorrow) el.serialSub.textContent = `${progress.solvedCount} / ${progress.total} · הפרק הבא מחר`;
  else el.serialSub.textContent = `פרק ${progress.currentIndex + 1} מתוך ${progress.total} מחכה`;
}

function openSerial() {
  const sp = serialProgress();
  if (!sp) return;
  const { season, progress } = sp;
  const i = progress.currentIndex;
  const ep = season.episodes[i];
  el.serialKicker.textContent = `📺 ניסוי השבוע · ${season.title}`;
  const next = progress.complete ? nextSeason() : null;
  if (progress.complete && next) {
    el.serialTitle.textContent = `העונה הבאה: ${next.title}`;
    el.serialBody.textContent = `"${season.title}" הושלמה. ${ep.teaser || ''} שבעה פרקים חדשים, פרק ביום.`;
    el.serialPlayBtn.textContent = 'להתחיל את העונה החדשה ←';
    el.serialPlayBtn.disabled = false;
    el.serialRecapBtn.classList.remove('hidden');
    el.serialRecapBtn.textContent = `▶ הפתרון של הפרק האחרון ב"${season.title}"`;
    el.serialRecapBtn.onclick = () => playRecap(season, progress.total - 1, () => { showScreen('select'); });
    el.serialPlayBtn.onclick = () => startSerialEpisode(next, 0);
    el.serialOverlay.classList.remove('hidden');
    return;
  }
  if (progress.complete) {
    el.serialTitle.textContent = 'העונה הושלמה';
    el.serialBody.textContent = `כל ${progress.total} הפרקים פתורים. אפשר לצפות שוב בפתרון של הפרק האחרון, או לשחק אותו שוב.`;
    el.serialPlayBtn.textContent = `שחק שוב את פרק ${progress.total}`;
    el.serialPlayBtn.disabled = false;
    el.serialRecapBtn.classList.remove('hidden');
    el.serialRecapBtn.textContent = '▶ הפתרון של הפרק האחרון';
    el.serialRecapBtn.onclick = () => playRecap(season, progress.total - 1, () => startSerialEpisode(season, progress.total - 1));
  } else if (progress.waitingForTomorrow) {
    const nextIndex = progress.solvedCount;
    el.serialTitle.textContent = `פרק ${nextIndex + 1} נפתח מחר`;
    el.serialBody.textContent = season.episodes[nextIndex - 1].teaser || 'הפרק הבא ממשיך מהמקום שבו סיימת היום.';
    el.serialPlayBtn.textContent = 'מחר…';
    el.serialPlayBtn.disabled = true;
    el.serialRecapBtn.classList.remove('hidden');
    el.serialRecapBtn.textContent = `▶ הפתרון של פרק ${nextIndex}`;
    el.serialRecapBtn.onclick = () => playRecap(season, nextIndex - 1, () => { showScreen('select'); });
  } else {
    el.serialTitle.textContent = `פרק ${i + 1}: ${ep.title}`;
    el.serialBody.textContent = i === 0
      ? 'שבעה פרקים, פרק ביום. כל פרק מתחיל בדיוק איפה שהקודם נגמר, ובכל יום המעבדה גדלה באלמנט אחד.'
      : (season.episodes[i - 1].teaser || 'ממשיכים מהמקום שבו עצרת אתמול.');
    el.serialPlayBtn.textContent = i === 0 ? 'להתחיל את השבוע ←' : 'לפרק ←';
    el.serialPlayBtn.disabled = false;
    el.serialRecapBtn.classList.toggle('hidden', i === 0);
    el.serialRecapBtn.textContent = '▶ בפרקים הקודמים';
    el.serialRecapBtn.onclick = () => playRecap(season, i - 1, () => startSerialEpisode(season, i));
  }
  el.serialPlayBtn.onclick = () => startSerialEpisode(season, i);
  el.serialOverlay.classList.remove('hidden');
}

function closeSerial() { el.serialOverlay.classList.add('hidden'); }

function startSerialEpisode(season, index) {
  closeSerial();
  let rec = getSerialRecord();
  if (!rec || rec.seasonId !== season.id) rec = { seasonId: season.id, startKey: todayKey(), solved: {} };
  if (!rec.startKey) rec.startKey = todayKey();
  saveSerialRecord(rec);
  state.mode = 'serial';
  state.serial = { season, index };
  state.dailyChallenge = null;
  loadLevelData(season.episodes[index].level);
  showScreen('game');
  showModeUI();
  renderGame();
  showToast(`פרק ${index + 1}: ${season.episodes[index].title}`, 2600);
}

// "Previously on": the optimal solution of an earlier episode plays on the
// real board, then `done` runs (usually: start the current episode).
function playRecap(season, index, done) {
  closeSerial();
  const meta = getSerialMeta(season.id, index);
  const solution = meta && meta.solution;
  if (!solution || !solution.length) { done(); return; }
  state.mode = 'serial';
  state.serial = { season, index, recap: true };
  loadLevelData(season.episodes[index].level);
  showScreen('game');
  showModeUI();
  renderGame();
  state.replaying = true;
  state.replayDone = done;
  document.body.classList.add('replaying');
  el.replayBanner.classList.remove('hidden');
  el.replayText.textContent = `▶ בפרקים הקודמים · פרק ${index + 1}: ${season.episodes[index].title}`;
  const step = settings.reduceAnim ? 320 : 640;
  solution.forEach(([from, to], k) => {
    state.replayTimers.push(setTimeout(() => onTubeTap(from, true), 900 + k * step));
    state.replayTimers.push(setTimeout(() => onTubeTap(to, true), 900 + k * step + step * 0.45));
  });
  state.replayTimers.push(setTimeout(finishReplay, 900 + solution.length * step + 700));
}

function finishReplay() {
  state.replayTimers.forEach(clearTimeout);
  state.replayTimers = [];
  if (!state.replaying) return;
  state.replaying = false;
  document.body.classList.remove('replaying');
  el.replayBanner.classList.add('hidden');
  const done = state.replayDone;
  state.replayDone = null;
  if (done) done();
}

function recordSerialResult(moves, stars) {
  const { season, index } = state.serial;
  let rec = getSerialRecord();
  if (!rec || rec.seasonId !== season.id) rec = { seasonId: season.id, startKey: todayKey(), solved: {} };
  const prev = rec.solved[String(index)];
  if (!prev || stars > prev.stars || (stars === prev.stars && moves < prev.moves)) rec.solved[String(index)] = { moves, stars };
  saveSerialRecord(rec);
}

/* =====================================================================
   CALIBRATION LADDER — "סולם הכיול": ten rungs by cognitive load, one try
   ===================================================================== */

const LADDER_RUNGS = 10;

function buildLadderRungs(dateKey) {
  const pool = [];
  visibleWorlds().forEach(w => {
    if (w.expert || !isWorldUnlocked(w)) return;
    w.levels.forEach((level, i) => {
      const meta = getLevelMeta(w.id, i);
      if (meta && meta.opt >= 3) pool.push({ worldId: w.id, levelIndex: i, level, cog: meta.cog, score: meta.score });
    });
  });
  pool.sort((a, b) => a.cog - b.cog || a.score - b.score);
  if (pool.length <= LADDER_RUNGS) return pool;
  const rungs = [];
  for (let i = 0; i < LADDER_RUNGS; i++) {
    const lo = Math.floor(i * pool.length / LADDER_RUNGS), hi = Math.floor((i + 1) * pool.length / LADDER_RUNGS);
    const bin = pool.slice(lo, Math.max(lo + 1, hi));
    rungs.push(bin[hashString(`${dateKey}:ladder:${i}`) % bin.length]);
  }
  return rungs;
}

function renderLadderCard() {
  if (!el.ladderBtn) return;
  const results = getLadderResults();
  const today = results[todayKey()];
  const best = results.best || 0;
  const pool = buildLadderRungs(todayKey());
  el.ladderBtn.disabled = pool.length < 3;
  if (pool.length < 3) { el.ladderSub.textContent = 'נפתח אחרי כמה שלבים'; return; }
  if (today !== undefined) el.ladderSub.textContent = `היום: ${today} / ${pool.length} · שיא ${best}`;
  else el.ladderSub.textContent = `${pool.length} שלבים לפי עומס, ניסיון אחד ליום${best ? ` · שיא ${best}` : ''}`;
}

function startLadder() {
  const key = todayKey();
  const results = getLadderResults();
  const rungs = buildLadderRungs(key);
  if (results[key] !== undefined) { showLadderResult(results[key], rungs, null); return; }
  if (!rungs.length) return;
  state.mode = 'ladder';
  state.ladder = { rungs, index: 0, climbed: 0, dateKey: key };
  state.dailyChallenge = null;
  loadLadderRung();
  showScreen('game');
  showModeUI();
  renderGame();
  showToast(`שלב 1 מתוך ${rungs.length} · בלי חזרה, ניסיון אחד`, 2600);
}

function loadLadderRung() {
  const rung = state.ladder.rungs[state.ladder.index];
  state.currentWorld = rung.worldId;
  state.currentLevel = rung.levelIndex;
  loadLevelData(rung.level);
}

function ladderFailed() {
  const level = currentLevelData();
  return computeStars(state.moveCount, level.optimalMoves) < 3;
}

function endLadder(reason) {
  const L = state.ladder;
  if (!L) return;
  const results = getLadderResults();
  results[L.dateKey] = L.climbed;
  results.best = Math.max(results.best || 0, L.climbed);
  saveLadderResults(results);
  const failedRung = reason === 'complete' ? null : L.rungs[L.index];
  state.ladder = null;
  showLadderResult(L.climbed, L.rungs, failedRung);
}

function showLadderResult(climbed, rungs, failedRung) {
  const total = rungs.length;
  el.ladderTitle.textContent = climbed >= total ? 'טיפסת עד הסוף' : `הגעת לשלב ${climbed + 1} מתוך ${total}`;
  const failedText = failedRung
    ? `נפלת ב${getWorld(failedRung.worldId).name} שלב ${failedRung.levelIndex + 1}. `
    : '';
  el.ladderBody.textContent = failedText + (climbed >= total ? 'כל השלבים בטווח האופטימלי, בלי חזרה.' : `${climbed} שלבים בטווח האופטימלי, בלי חזרה. ניסיון חדש מחר.`);
  el.ladderRungs.innerHTML = rungs.map((r, i) => {
    const cls = i < climbed ? 'done' : (failedRung && i === climbed ? 'fail' : '');
    const w = getWorld(r.worldId);
    return `<span class="rung ${cls}" title="${w.name} שלב ${r.levelIndex + 1}">${w.icon}</span>`;
  }).join('');
  el.ladderOverlay.classList.remove('hidden');
  el.ladderShareBtn.onclick = () => {
    const bar = rungs.map((r, i) => i < climbed ? '▮' : '▯').join('');
    const text = `🪜 מבחנות הלוגיקה · סולם הכיול ${todayKey()}\n${climbed} / ${total} ${bar}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => showToast('התוצאה הועתקה 📋'));
    else showToast(text, 5000);
  };
}

function closeLadderResult() {
  el.ladderOverlay.classList.add('hidden');
  showScreen('select');
}

/* =====================================================================
   GAME PLAY
   ===================================================================== */

function startSoloLevel(worldId, levelIndex) {
  state.mode = 'solo';
  state.dailyChallenge = null;
  state.currentWorld = worldId;
  state.currentLevel = levelIndex;
  state.expandedWorld = worldId;
  setLastPlayed(worldId, levelIndex);
  loadLevelData(getWorld(worldId).levels[levelIndex]);
  showScreen('game');
  showModeUI();
  renderGame();
}

function startDailyChallenge(tierId = 'medium') {
  const challenge = getTodaysDailyChallenge(tierId);
  if (!challenge) return;
  state.mode = 'daily';
  state.dailyChallenge = challenge;
  state.currentWorld = challenge.worldId;
  state.currentLevel = challenge.levelIndex;
  loadLevelData(challenge.level);
  showScreen('game');
  showModeUI();
  renderGame();
}

function loadLevelData(level) {
  state.capacities = [...level.capacities];
  state.tubes = level.initial.map(t => [...t]);
  state.target = level.target.map(t => [...t]);
  state.locks = (level.locks || []).map(L => ({ ...L }));
  state.tubeColors = level.tubeColors ? [...level.tubeColors] : level.capacities.map(() => null);
  state.shifts = level.shifts ? [...level.shifts] : [];
  state.shiftsBack = level.shiftsBack ? [...level.shiftsBack] : [];
  state.blenders = level.blenders ? [...level.blenders] : [];
  state.valves = (level.valves || []).map(valve => ({ ...valve }));
  const valveApi = getValveApi();
  state.valveStates = valveApi ? valveApi.initialValveStates(level) : {};
  state.portals = (level.portals || []).map(portal => ({ ...portal, pair: [...portal.pair] }));
  state.pipes = (level.pipes || []).map(p => [...p]);
  state.oneWay = (level.oneWay || []).map(p => [...p]);
  state.centrifuges = level.centrifuges ? [...level.centrifuges] : [];
  state.selectedTubeIndex = null;
  state.moveCount = 0;
  state.moveHistory = [];
  state.undoCount = 0;
  state.violationCount = 0;
  state.hintUsed = false;
  state.hintFree = false;
  state.irreversibleSeen = {};
  state.lastViolation = null;
  clearHintMarks();
}

function currentLevelData() {
  if (state.mode === 'daily') return state.dailyChallenge.level;
  if (state.mode === 'ta') return state.taLevel;
  if (state.mode === 'serial') return state.serial.season.episodes[state.serial.index].level;
  if (state.mode === 'ladder') return state.ladder.rungs[state.ladder.index].level;
  return getCurrentWorld().levels[state.currentLevel];
}

// Rect of the top real ball in a game tube (for the travel animation).
function topBallRect(tubeIndex) {
  const tubeEl = document.querySelectorAll('#game-tubes .tube.game')[tubeIndex];
  if (!tubeEl) return null;
  const balls = tubeEl.querySelectorAll('.ball.real');
  const b = balls[balls.length - 1];
  return b ? b.getBoundingClientRect() : null;
}

function onTubeTap(index, fromReplay = false) {
  if (state.replaying && !fromReplay) return;   // a recap is playing — watch, don't touch
  dismissViolationToast();
  if (state.selectedTubeIndex === index) {
    state.selectedTubeIndex = null;
    renderGame(true);
    return;
  }
  if (state.selectedTubeIndex === null) {
    if (state.tubes[index].length === 0) return;
    const lock = tubeLockInfo(index);
    if (lock.locked) {
      // Reading a lock is a question, not a mistake — it never costs "clean hands".
      showViolation(index, 'lock', lock, false);
      return;
    }
    const valveApi = getValveApi();
    if (valveApi && !valveApi.canUseValveAsSource({ valves: state.valves }, state.valveStates, index)) {
      showViolation(index, 'valveSource');
      return;
    }
    if (budgetOf(state.tubes[index][state.tubes[index].length - 1]) === 0) {
      showViolation(index, 'hardened', {}, false);
      return;
    }
    state.selectedTubeIndex = index;
    playSound('tap'); haptic('tap');
    renderGame(true);
    return;
  }
  const from = state.selectedTubeIndex;
  const requestedTo = index;
  if (!pipeAllows(from, requestedTo)) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(requestedTo, 'pipe');
    return;
  }
  const requestedLock = tubeLockInfo(requestedTo);
  if (requestedLock.locked) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(requestedTo, 'lock', requestedLock, false);
    return;
  }
  const valveApi = getValveApi();
  if (valveApi && !valveApi.canUseValveAsDestination({ valves: state.valves }, state.valveStates, requestedTo)) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(requestedTo, 'valveDest');
    return;
  }
  const portalApi = getPortalApi();
  const route = portalApi
    ? portalApi.resolvePortalMove({ portals: state.portals }, requestedTo)
    : { to: requestedTo, viaBottom: false };
  const to = route.to;
  const viaBottom = route.viaBottom;
  if (to === from) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(requestedTo, 'portalBack', {}, false);
    return;
  }
  if (to !== requestedTo) {
    const exitLock = tubeLockInfo(to);
    if (exitLock.locked) {
      state.selectedTubeIndex = null;
      renderGame(true);
      showViolation(to, 'lock', exitLock, false);
      return;
    }
    if (valveApi && !valveApi.canUseValveAsDestination({ valves: state.valves }, state.valveStates, to)) {
      state.selectedTubeIndex = null;
      renderGame(true);
      showViolation(to, 'valveDest');
      return;
    }
  }
  const movingBall = state.tubes[from][state.tubes[from].length - 1];
  const movingColor = colorOf(movingBall);
  const budget = budgetOf(movingBall);
  const spent = budget === Infinity ? Infinity : budget - 1;
  if (!tubeAcceptsColor(to, movingColor)) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(to, 'color', { color: state.tubeColors[to] });
    return;
  }
  // Stacking check uses the POST-shift color.
  const effectiveColor = shiftedBall(movingColor, to);
  const effective = withBudget(effectiveColor, spent);
  const isBlender = state.blenders.includes(to);
  const valveStatesBefore = { ...state.valveStates };
  const valveStatesAfter = valveApi
    ? valveApi.toggleValvesAfterMove({ valves: state.valves }, state.valveStates, from, requestedTo)
    : state.valveStates;
  const fromRect = topBallRect(from);

  // CHUTE ("צינור תחתי", W10): the ball slides UNDER the exit tube's stack.
  // No colour rule — a pipe pushes — but capacity still applies. In a blender
  // the chute meets the BOTTOM ball, and a recipe pair blends there.
  if (viaBottom) {
    const destBottom = state.tubes[to].length > 0 ? colorOf(state.tubes[to][0]) : null;
    const bottomBlend = isBlender && destBottom !== null ? blendedBall(destBottom, effectiveColor) : null;
    if (bottomBlend) {
      clearViolation();
      state.tubes[from].pop();
      const consumedTop = state.tubes[to].shift();
      state.tubes[to].unshift(bottomBlend);
      state.valveStates = valveStatesAfter;
      commitMove({ from, to, original: movingBall, mixed: true, viaBottom: true, consumedTop, valveStatesBefore },
        { fromRect, color: effectiveColor, to, atBottom: true, blend: true });
      return;
    }
    if (state.tubes[to].length >= state.capacities[to]) {
      state.selectedTubeIndex = null;
      renderGame(true);
      showViolation(to, 'capacity');
      return;
    }
    clearViolation();
    state.tubes[from].pop();
    state.tubes[to].unshift(effective);
    state.valveStates = valveStatesAfter;
    const flipped = settleCentrifuge(to);
    commitMove({ from, to, original: movingBall, viaBottom: true, flipped, valveStatesBefore },
      { fromRect, color: effectiveColor, to, atBottom: !flipped, flipped });
    return;
  }

  const destTop = state.tubes[to].length > 0 ? colorOf(state.tubes[to][state.tubes[to].length - 1]) : null;
  const blendResult = isBlender && destTop !== null ? blendedBall(destTop, effectiveColor) : null;
  const wouldStack = destTop === null || destTop === effectiveColor || destTop === 'J' || effectiveColor === 'J';

  // BLEND (W8): a recipe pair inside a blender tube consumes the incoming
  // ball and the current top, replacing them with the recipe result.
  if (blendResult) {
    clearViolation();
    state.tubes[from].pop();
    const consumedTop = state.tubes[to].pop();
    state.tubes[to].push(blendResult);
    state.valveStates = valveStatesAfter;
    commitMove({ from, to, original: movingBall, mixed: true, consumedTop, valveStatesBefore },
      { fromRect, color: effectiveColor, to, atBottom: false, blend: true });
    return;
  }

  if (state.tubes[to].length >= state.capacities[to]) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(to, 'capacity');
    return;
  }
  if (!wouldStack) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(to, isBlender ? 'blend' : 'stack');
    return;
  }
  clearViolation();
  state.tubes[from].pop();
  state.tubes[to].push(effective);
  state.valveStates = valveStatesAfter;
  const flipped = settleCentrifuge(to);
  commitMove({ from, to, original: movingBall, flipped, valveStatesBefore },
    { fromRect, color: effectiveColor, to, atBottom: flipped, flipped });
}

// Shared tail of every legal move: record it, advance the counter, re-render,
// fly the ball, then check for the win.
function commitMove(entry, fx) {
  state.moveHistory.push(entry);
  state.moveCount++;
  state.selectedTubeIndex = null;
  const hintWasActive = state.hintActive;
  renderGame(true);
  if (hintWasActive) { state.hintActive = true; continueHint(); }
  const landedHome = isBallHome(fx.to, fx.atBottom ? 0 : state.tubes[fx.to].length - 1);
  noteIrreversible(entry, fx, landedHome);
  const won = checkWin();
  const fell = !won && state.mode === 'ladder' && !state.replaying && ladderFailed();
  animateMove(fx, () => {
    if (fx.blend) flashMixedBall(fx.to, fx.atBottom);
    if (fx.flipped) flipTube(fx.to);
    playSound(landedHome ? 'home' : 'drop');
    haptic(landedHome ? 'home' : 'drop');
    if (won) handleWin();
    else if (fell) { playSound('error'); haptic('error'); setTimeout(() => endLadder('fell'), 350); }
  });
}

// First-time-in-this-level notices for moves that only Undo can take back
// (chute, blend, centrifuge flip), and for a ball that just hardened away
// from home. Skipped during replays and in Time Attack.
function noteIrreversible(entry, fx, landedHome) {
  if (state.replaying || state.mode === 'ta') return;
  const seen = state.irreversibleSeen || (state.irreversibleSeen = {});
  const first = (k) => { if (seen[k]) return false; seen[k] = true; return true; };
  const hardened = entry.original !== undefined && budgetOf(entry.original) === 1 && !entry.mixed;
  if (hardened) {
    const inBlender = state.blenders.includes(fx.to);
    if (landedHome) { if (first('hard-home')) showToast('⌛ הכדור התקשה — בבית שלו.', 2200); }
    else if (inBlender) { if (first('hard-blender')) showToast('⌛ הכדור התקשה במעבדה. רק ערבוב עם בן-הזוג שלו יזיז אותו מכאן.', 3200); }
    else showToast('⌛ הכדור התקשה מחוץ לביתו. רק Undo מחזיר אותו.', 3200);
    return;
  }
  if (entry.mixed && first('blend')) showToast('⚗️ שני כדורים הפכו לאחד. רק Undo מפריד אותם.', 2600);
  else if (entry.flipped && first('flip')) showToast('🌪 הצנטריפוגה התהפכה: התחתון למעלה. Undo מחזיר את ההיפוך.', 2600);
  else if (entry.viaBottom && first('chute')) showToast('⤵ הכדור נקבר בתחתית. Undo מחזיר אותו.', 2400);
}

// Does the ball at position `pos` of tube `t` sit in its final target slot
// (i.e. inside the bottom-aligned matching prefix)? Colour only.
function isBallHome(t, pos) {
  const cur = state.tubes[t], tgt = state.target[t];
  if (pos < 0 || pos >= cur.length || pos >= tgt.length) return false;
  for (let i = 0; i <= pos; i++) if (colorOf(cur[i]) !== colorOf(tgt[i])) return false;
  return true;
}

// Centrifuge flip: the tube spins once after its contents reversed.
function flipTube(tubeIndex) {
  const tubeEl = document.querySelectorAll('#game-tubes .tube.game')[tubeIndex];
  if (!tubeEl || settings.reduceAnim) return;
  tubeEl.classList.add('flipping');
  playSound('home');
  setTimeout(() => tubeEl.classList.remove('flipping'), 520);
}

function flashMixedBall(tubeIndex, atBottom = false) {
  const tubeEl = document.querySelectorAll('#game-tubes .tube.game')[tubeIndex];
  if (!tubeEl) return;
  const balls = tubeEl.querySelectorAll('.ball.real');
  const ball = atBottom ? balls[0] : balls[balls.length - 1];
  if (!ball) return;
  ball.classList.add('just-mixed');
  setTimeout(() => ball.classList.remove('just-mixed'), 700);
}

/* ----- travel animation: a clone flies in an arc from source to landing ----- */
function animateMove(fx, done) {
  const tubeEls = document.querySelectorAll('#game-tubes .tube.game');
  const destTube = tubeEls[fx.to];
  const balls = destTube ? destTube.querySelectorAll('.ball.real') : [];
  const destBall = fx.atBottom ? balls[0] : balls[balls.length - 1];
  if (settings.reduceAnim || state.mode === 'ta' || !fx.fromRect || !destBall || !el.fxLayer
      || typeof destBall.animate !== 'function') {
    done();
    return;
  }
  const toRect = destBall.getBoundingClientRect();
  const clone = document.createElement('div');
  clone.className = `ball ball-${fx.color} fly`;
  clone.style.width = `${toRect.width}px`;
  clone.style.height = `${toRect.height}px`;
  clone.style.left = `${fx.fromRect.left}px`;
  clone.style.top = `${fx.fromRect.top}px`;
  el.fxLayer.appendChild(clone);
  destBall.classList.add('landing');
  const dx = toRect.left - fx.fromRect.left;
  const dy = toRect.top - fx.fromRect.top;
  const lift = -Math.max(56, Math.abs(dx) * 0.25);
  const anim = clone.animate([
    { transform: 'translate(0, 0) scale(1)', offset: 0 },
    { transform: `translate(${dx * 0.5}px, ${Math.min(dy, 0) + lift}px) scale(1.08)`, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(1)`, offset: 1 }
  ], { duration: 240, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clone.remove();
    destBall.classList.remove('landing');
    destBall.classList.add('landed');
    setTimeout(() => destBall.classList.remove('landed'), 260);
    done();
  };
  anim.onfinish = finish;
  anim.oncancel = finish;
  setTimeout(finish, 400);   // safety net if the tab was hidden
}

function checkWin() {
  for (let i = 0; i < state.tubes.length; i++) {
    const a = state.tubes[i], b = state.target[i];
    if (a.length !== b.length) return false;
    for (let j = 0; j < a.length; j++) if (colorOf(a[j]) !== colorOf(b[j])) return false;
  }
  return true;
}

function undo() {
  if (state.moveHistory.length === 0) return;
  if (isDailyNoUndo() || state.mode === 'ladder') return;
  clearHintMarks();
  state.undoCount++;
  const m = state.moveHistory.pop();
  if (m.flipped) state.tubes[m.to].reverse();   // un-spin the centrifuge first
  if (m.viaBottom) {
    state.tubes[m.to].shift();
    if (m.mixed) state.tubes[m.to].unshift(m.consumedTop);
    state.tubes[m.from].push(m.original);
  } else if (m.mixed) {
    state.tubes[m.to].pop();
    state.tubes[m.to].push(m.consumedTop);
    state.tubes[m.from].push(m.original);
  } else {
    const popped = state.tubes[m.to].pop();
    state.tubes[m.from].push(m.original !== undefined ? m.original : popped);
  }
  if (m.valveStatesBefore) state.valveStates = { ...m.valveStatesBefore };
  state.moveCount = Math.max(0, state.moveCount - 1);
  state.selectedTubeIndex = null;
  playSound('tap');
  renderGame(true);
}

function resetLevel() {
  if (state.replaying) return;
  if (state.mode === 'solo') startSoloLevel(state.currentWorld, state.currentLevel);
  if (state.mode === 'daily') startDailyChallenge(state.dailyChallenge.tier);
  if (state.mode === 'serial') startSerialEpisode(state.serial.season, state.serial.index);
  if (state.mode === 'ladder') {
    // One try per rung: resetting is giving up on it.
    if (confirm('בסולם יש ניסיון אחד לכל שלב. לוותר על השלב הזה ולסיים את הריצה?')) endLadder('reset');
  }
}

/* ----- hint: the first three moves of one optimal solution ----- */
function clearHintMarks() {
  document.querySelectorAll('#game-tubes .tube.hint-from, #game-tubes .tube.hint-to')
    .forEach(t => t.classList.remove('hint-from', 'hint-to'));
  const arrow = document.getElementById('hint-arrow');
  if (arrow) arrow.remove();
  if (el.hintBanner) el.hintBanner.classList.add('hidden');
  state.hintActive = false;
}

// The hint as a picture: an arrow from the source tube to the destination
// tube, plus a banner that stays until the move is made.
function drawHintArrow(from, to, step, total) {
  const tubeEls = document.querySelectorAll('#game-tubes .tube.game');
  const a = tubeEls[from], b = tubeEls[to];
  if (!a || !b) return;
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  const x1 = ra.left + ra.width / 2, x2 = rb.left + rb.width / 2;
  const y1 = ra.top - 6, y2 = rb.top - 6;
  const lift = Math.max(34, Math.min(90, Math.abs(x2 - x1) * 0.35 + 24));
  const cy = Math.min(y1, y2) - lift;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'hint-arrow';
  svg.setAttribute('class', 'hint-arrow');
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  svg.innerHTML =
    `<defs><marker id="hint-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0,0 L10,5 L0,10 z" fill="var(--gold)"/></marker></defs>` +
    `<path d="M${x1},${y1} Q${(x1 + x2) / 2},${cy} ${x2},${y2}" fill="none" stroke="var(--gold)" stroke-width="4" stroke-linecap="round" marker-end="url(#hint-head)"/>` +
    `<circle cx="${x1}" cy="${y1}" r="6" fill="var(--gold)"/>`;
  el.fxLayer.appendChild(svg);
  if (el.hintBanner) {
    el.hintBannerText.textContent = `💡 רמז ${step + 1}/${total}: העבר את הכדור העליון מהמבחנה המהבהבת אל המבחנה המקווקוה, לאורך החץ.`;
    el.hintBanner.classList.remove('hidden');
  }
  state.hintActive = true;
  state.hintMove = [from, to];
}

function historyMatchesHint(hint, upTo) {
  for (let i = 0; i < upTo; i++) {
    const m = state.moveHistory[i];
    if (!m || !hint[i] || m.from !== hint[i][0]) return false;
    // compare the *requested* destination for chutes: history stores the resolved tube,
    // so accept either the resolved exit or the chute itself.
    const portalApi = getPortalApi();
    const resolved = portalApi ? portalApi.resolvePortalDestination({ portals: state.portals }, hint[i][1]) : hint[i][1];
    if (m.to !== resolved) return false;
  }
  return true;
}

function showHint() {
  if (state.mode === 'ta' || state.mode === 'ladder' || state.replaying) return;
  let meta;
  if (state.mode === 'daily') meta = getLevelMeta(state.dailyChallenge.worldId, state.dailyChallenge.levelIndex);
  else if (state.mode === 'serial') {
    const sm = getSerialMeta(state.serial.season.id, state.serial.index);
    meta = sm && sm.solution ? { hint: sm.solution.slice(0, 3) } : null;
  } else meta = getLevelMeta(state.currentWorld, state.currentLevel);
  const hint = meta && meta.hint;
  if (!hint || !hint.length) { showToast('אין רמז לשלב הזה'); return; }
  const step = state.moveCount;
  if (step < hint.length && historyMatchesHint(hint, step)) {
    const spentToken = markHintUsed();
    renderHintButton();
    clearHintMarks();
    const tubeEls = document.querySelectorAll('#game-tubes .tube.game');
    const [from, to] = hint[step];
    if (tubeEls[from]) tubeEls[from].classList.add('hint-from');
    if (tubeEls[to]) tubeEls[to].classList.add('hint-to');
    drawHintArrow(from, to, step, hint.length);
    if (step === 0 && el.hintBannerText) {
      el.hintBannerText.textContent += spentToken
        ? ` רמז חופשי מפרס החותמות (נותרו ${getFreeHints()}).`
        : state.hintFree ? '' : ' הריצה הזו מוותרת על חותמת "אופטימום".';
    }
    return;
  }
  if (step >= hint.length && historyMatchesHint(hint, hint.length)) {
    showToast('הרמז מכסה רק את שלושת המהלכים הראשונים — מכאן זה עליך.', 3000);
    return;
  }
  // The board has left the hinted opening: say so, never reset on the player's behalf.
  showToast('הרמז מראה את שלושת המהלכים הראשונים, והלוח כבר סטה מהם. לחץ ↺ אפס ואז 💡 רמז.', 3600);
}

// After each move: if a hint is showing and the player followed it, advance
// to the next hinted move on its own; if they went another way, drop it.
function continueHint() {
  if (!state.hintActive) return;
  let hint = null;
  if (state.mode === 'daily') hint = (getLevelMeta(state.dailyChallenge.worldId, state.dailyChallenge.levelIndex) || {}).hint;
  else if (state.mode === 'serial') { const sm = getSerialMeta(state.serial.season.id, state.serial.index); hint = sm && sm.solution ? sm.solution.slice(0, 3) : null; }
  else hint = (getLevelMeta(state.currentWorld, state.currentLevel) || {}).hint;
  clearHintMarks();
  if (!hint) return;
  const step = state.moveCount;
  if (step < hint.length && historyMatchesHint(hint, step)) showHint();
  else if (step >= hint.length && historyMatchesHint(hint, hint.length)) showToast('זה היה המהלך האחרון ברמז — מכאן זה עליך.', 2600);
}

// Charge for a hint: spend a free-hint token if one is available (keeps the
// "optimal" stamp), otherwise the run forfeits that stamp. One charge per run.
// Returns true when a token was spent just now.
function markHintUsed() {
  if (state.hintFree || state.hintUsed) return false;
  if ((state.mode === 'solo' || state.mode === 'daily') && getFreeHints() > 0) {
    setFreeHintsUsed(getFreeHintsUsed() + 1);
    state.hintFree = true;
    return true;
  }
  state.hintUsed = true;
  return false;
}

/* =====================================================================
   WIN
   ===================================================================== */

function handleWin() {
  if (state.replaying) return;                       // a recap finished on its own
  if (state.mode === 'ladder') { setTimeout(handleLadderSolve, 320); return; }
  if (state.mode === 'solo' || state.mode === 'daily' || state.mode === 'serial') setTimeout(showSoloWin, 320);
  else handleTASolve();
}

function handleLadderSolve() {
  const L = state.ladder;
  if (!L) return;
  L.climbed++;
  playSound('home'); haptic('home');
  if (L.climbed >= L.rungs.length) { endLadder('complete'); return; }
  L.index++;
  loadLadderRung();
  renderGame();
  showToast(`שלב ${L.index + 1} מתוך ${L.rungs.length}`, 1600);
}

function showSoloWin() {
  const level = currentLevelData();
  const stars = computeStars(state.moveCount, level.optimalMoves);
  const contractApi = getContractApi();
  const dailyApi = getDailyApi();
  const isDaily = state.mode === 'daily';
  const isSerial = state.mode === 'serial';
  const run = { moves: state.moveCount, undoCount: state.undoCount, violationCount: state.violationCount, hintUsed: state.hintUsed };
  const previous = (isDaily || isSerial) ? null : getLevelRecord(state.currentWorld, state.currentLevel);
  const earnedContracts = contractApi && !isSerial ? contractApi.evaluateContracts(run, level) : {};
  const allContracts = contractApi && !isSerial
    ? contractApi.mergeContracts(previous && previous.contracts, earnedContracts)
    : earnedContracts;
  const modifierPassed = isDaily && dailyApi ? dailyApi.evaluateDailyModifier(state.dailyChallenge, run) : false;
  let isRecord = false;
  const stampsBefore = getTotalContracts();
  if (isDaily) recordDailyResult(state.dailyChallenge, state.moveCount, stars, modifierPassed);
  else if (isSerial) recordSerialResult(state.moveCount, stars);
  else isRecord = recordResult(state.currentWorld, state.currentLevel, state.moveCount, stars, earnedContracts).isRecord;
  renderStampMilestone(stampsBefore, getTotalContracts());

  el.winTitle.textContent = isSerial
    ? `פרק ${state.serial.index + 1} הושלם`
    : stars === 3 ? 'פתרת בטווח האופטימלי' : 'פתרת את השלב';
  el.winMoves.textContent = state.moveCount;
  el.winOptimal.textContent = level.optimalMoves;
  const best = (isDaily || isSerial) ? null : getLevelRecord(state.currentWorld, state.currentLevel);
  el.winBestWrap.classList.toggle('hidden', !best);
  if (best) el.winBest.textContent = best.bestMoves;
  el.winRecord.classList.toggle('hidden', !isRecord);
  el.winStars.innerHTML = renderStarsRow(stars, 3, false);
  if (isSerial) el.winContracts.innerHTML = '';
  else renderWinContracts(earnedContracts, allContracts);

  const extra = Math.max(0, state.moveCount - level.optimalMoves);
  const step = Math.max(1, Math.ceil(level.optimalMoves / 6));
  const grace = Math.ceil(step / 2);
  let nextEpisodePlayable = false;
  let nextDailyTier = null;
  if (isDaily) {
    const modifier = state.dailyChallenge.modifier;
    const results = getDailyResults();
    const streak = dailyApi ? dailyApi.computeStreak(results, state.dailyChallenge.key) : { current: 0 };
    nextDailyTier = nextUnsolvedDailyTier(results[state.dailyChallenge.key]);
    el.winStarHint.textContent = (modifierPassed
      ? `${state.dailyChallenge.tierIcon} דרגה ${state.dailyChallenge.tierLabel} הושלמה: ${modifier.icon} ${modifier.label}.`
      : `פתרת את החידה. כלל הניסוי "${modifier.label}" עוד מחכה לריצה נקייה יותר.`)
      + (streak.current > 1 ? ` 🔥 רצף ${streak.current} ימים.` : '')
      + (!nextDailyTier && dailyDayComplete(results[state.dailyChallenge.key]) ? ' שלוש הדרגות של היום מאחוריך.' : '');
  } else if (isSerial) {
    const { season, index } = state.serial;
    const ep = season.episodes[index];
    const sp = serialProgress();
    nextEpisodePlayable = !!(sp && index + 1 < season.episodes.length && sp.progress.isPlayable(index + 1));
    el.winStarHint.textContent = index + 1 >= season.episodes.length
      ? (nextSeason() ? `זה היה הפרק האחרון של "${season.title}". ${ep.teaser || ''} העונה הבאה מחכה במסך הבית.` : 'זה היה הפרק האחרון של העונה. סיימת את ניסוי השבוע.')
      : (ep.teaser ? `בפרק הבא: ${ep.teaser}` : 'הפרק הבא ממשיך בדיוק מכאן.') + (nextEpisodePlayable ? '' : ' נפתח מחר.');
  } else if (stars === 3) {
    el.winStarHint.textContent = state.hintUsed ? 'שלושה כוכבים. חותמת "אופטימום" נשמרת לריצה בלי רמז.' : '';
  } else {
    el.winStarHint.textContent = `${Math.max(1, extra - grace)} מהלכים פחות = כוכב שלישי.`;
  }

  playSound('win'); haptic('win');
  triggerCelebration();

  const world = (isDaily || isSerial) ? null : getCurrentWorld();
  const isLastInWorld = !!world && state.currentLevel >= world.levels.length - 1;
  el.nextBtn.classList.toggle('hidden', (isDaily && !nextDailyTier) || (isSerial && !nextEpisodePlayable) || (!!world && isLastInWorld));
  el.nextBtn.textContent = isSerial ? 'לפרק הבא ←'
    : nextDailyTier ? `לדרגה ${nextDailyTier.tierLabel} ${nextDailyTier.tierIcon} ←`
    : 'השלב הבא ←';
  el.retryBtn.classList.toggle('hidden', (stars === 3 && !isDaily) || isSerial);
  el.retryBtn.textContent = isDaily ? '↻ נסה שוב' : '↻ נסה שוב ל-3★';
  el.shareBtn.classList.toggle('hidden', !isDaily);
  el.winOverlay.classList.remove('hidden');

  if (world && isLastInWorld) {
    const visible = visibleWorlds();
    const routeWorlds = visible.filter(w => !w.expert);
    const isLastWorld = world.id === routeWorlds[routeWorlds.length - 1].id;
    const totalLevels = routeWorlds.reduce((sum, w) => sum + w.levels.length, 0);
    el.completeTitle.textContent = world.expert
      ? '🏅 סיימת את מסלול המומחה'
      : isLastWorld ? '🏆 סיימת את כל המשחק' : `🏆 סיימת את "${world.name}"`;
    el.completeBody.textContent = world.expert
      ? 'כל שלבי המאסטר מאחוריך.'
      : isLastWorld
        ? `כל ${totalLevels} השלבים מאחוריך. מסלול המומחה מחכה.`
        : `עולם ${world.icon} ${world.name} הושלם. העולם הבא מחכה.`;
    setTimeout(() => {
      el.winOverlay.classList.add('hidden');
      el.completeOverlay.classList.remove('hidden');
    }, 2200);
  }
}

// The next daily tier that has not been solved today (any solve counts),
// preferring the tiers above the one just played.
function nextUnsolvedDailyTier(dayEntry) {
  const bundle = getTodaysDaily();
  if (!bundle || !state.dailyChallenge) return null;
  const order = bundle.tiers;
  const at = order.findIndex(t => t.tier === state.dailyChallenge.tier);
  const rotated = order.slice(at + 1).concat(order.slice(0, at));
  return rotated.find(t => !dailyTierStatus(t.tier, dayEntry)) || null;
}
function dailyDayComplete(dayEntry) {
  const bundle = getTodaysDaily();
  return !!bundle && bundle.tiers.every(t => dailyTierStatus(t.tier, dayEntry));
}

// Stamp milestone banner on the win screen (every 25 stamps → rank + free hint).
function renderStampMilestone(before, after) {
  if (!el.winMilestone) return;
  const api = getContractApi();
  const crossed = api ? api.milestonesCrossed(before, after) : 0;
  if (!crossed) { el.winMilestone.classList.add('hidden'); el.winMilestone.textContent = ''; return; }
  const rank = api.rankFor(after);
  el.winMilestone.innerHTML =
    `◎ <b>${rank.reached * api.STAMP_MILESTONE} חותמות אתגר</b> — תואר חדש: <b>${rank.title || 'מאסטר החותמות'}</b>. ` +
    `+${crossed} רמז חופשי ששומר על חותמת "אופטימום".`;
  el.winMilestone.classList.remove('hidden');
  setTimeout(() => showToast(`◎ פרס חותמות: ${rank.title || ''} · רמז חופשי נוסף`, 3200), 900);
}

function renderWinContracts(earnedContracts, allContracts) {
  const contractApi = getContractApi();
  if (!contractApi || !el.winContracts) { if (el.winContracts) el.winContracts.innerHTML = ''; return; }
  el.winContracts.innerHTML = contractApi.CONTRACT_DEFS.map((contract) => {
    const earnedNow = !!earnedContracts[contract.id];
    const alreadyBanked = !earnedNow && !!allContracts[contract.id];
    const cls = earnedNow ? 'earned' : alreadyBanked ? 'banked' : 'missed';
    const title = alreadyBanked ? `${contract.description} כבר הושלם בעבר.` : contract.description;
    return `
      <span class="contract-stamp ${cls}" title="${title}">
        <span class="contract-icon">${contract.icon}</span>
        <span>${contract.label}</span>
      </span>`;
  }).join('');
}

function nextLevel() {
  el.winOverlay.classList.add('hidden');
  if (state.mode === 'serial') { startSerialEpisode(state.serial.season, state.serial.index + 1); return; }
  if (state.mode === 'daily') {
    const next = nextUnsolvedDailyTier(getDailyResults()[state.dailyChallenge.key]);
    if (next) startDailyChallenge(next.tier); else backToSelect();
    return;
  }
  startSoloLevel(state.currentWorld, state.currentLevel + 1);
}

function retryLevel() {
  el.winOverlay.classList.add('hidden');
  resetLevel();
}

function shareDaily() {
  const api = getDailyApi();
  if (!api || !state.dailyChallenge) return;
  const results = getDailyResults();
  const day = results[state.dailyChallenge.key];
  const result = api.tierResult(day, state.dailyChallenge.tier);
  if (!result) return;
  const text = api.buildShareText(state.dailyChallenge, result, api.computeStreak(results, state.dailyChallenge.key), day);
  const fallback = () => { showToast('הטקסט מוכן להעתקה:\n' + text, 5000); };
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast('התוצאה הועתקה 📋'), fallback);
  } else fallback();
}

function backToSelect() {
  el.winOverlay.classList.add('hidden');
  el.completeOverlay.classList.add('hidden');
  if (state.replaying) { state.replayDone = null; finishReplay(); }
  if (state.mode === 'ladder' && state.ladder) { endLadder('left'); return; }
  stopTATimer();
  showScreen('select');
}

/* =====================================================================
   TIME ATTACK — fresh generated boards, escalating rounds
   ===================================================================== */

function startTimeAttack() {
  state.mode = 'ta';
  state.taSolved = 0;
  state.taRound = 0;
  state.taBoards = [];
  state.taTimeLeft = TIME_ATTACK_DURATION_SEC;
  const api = getTaApi();
  state.taRng = api ? api.makeRng((Date.now() ^ (Math.random() * 1e9)) >>> 0) : Math.random;
  showScreen('game');
  showModeUI();
  loadNextTALevel();
  startTATimer();
}

function loadNextTALevel() {
  const api = getTaApi();
  let level = api ? api.nextLevel(state.taRng, state.taRound) : null;
  if (!level) level = TIME_ATTACK_POOL[state.taRound % TIME_ATTACK_POOL.length];
  state.taLevel = level;
  state.taRound++;
  loadLevelData(level);
  renderGame(true);
}

function startTATimer() {
  stopTATimer();
  updateTATimeDisplay();
  state.taTimerId = setInterval(() => {
    state.taTimeLeft--;
    updateTATimeDisplay();
    if (state.taTimeLeft <= 10 && state.taTimeLeft > 0) playSound('tick');
    if (state.taTimeLeft <= 0) endTimeAttack();
  }, 1000);
}

function stopTATimer() {
  if (state.taTimerId) { clearInterval(state.taTimerId); state.taTimerId = null; }
}

function updateTATimeDisplay() {
  const t = Math.max(0, state.taTimeLeft);
  el.taTime.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  el.taTime.classList.toggle('warning', t <= 10);
  el.taSolved.textContent = state.taSolved;
  if (el.taScore) el.taScore.textContent = currentTAScore().score;
}

function currentTAScore() {
  const api = getTaApi();
  return api ? api.runScore(state.taBoards) : { solved: state.taSolved, score: 0, precision: 0 };
}

function handleTASolve() {
  state.taSolved++;
  state.taBoards.push({ moves: state.moveCount, optimalMoves: state.taLevel.optimalMoves });
  state.taTimeLeft += TIME_ATTACK_BONUS_SEC;
  updateTATimeDisplay();
  playSound('home'); haptic('home');
  el.quickFlash.classList.remove('hidden');
  el.quickFlash.style.animation = 'none';
  void el.quickFlash.offsetWidth;
  el.quickFlash.style.animation = '';
  setTimeout(() => {
    el.quickFlash.classList.add('hidden');
    if (state.mode === 'ta' && state.taTimeLeft > 0) loadNextTALevel();
  }, 260);
}

function endTimeAttack() {
  stopTATimer();
  const prev = getTABest();
  const prevScore = getTABestScore();
  const run = currentTAScore();
  const isNewBest = state.taSolved > prev;
  const isNewBestScore = run.score > prevScore;
  if (isNewBest) setTABest(state.taSolved);
  if (isNewBestScore) setTABestScore(run.score);
  el.taResultSolved.textContent = state.taSolved;
  el.taResultScore.textContent = run.score;
  el.taResultPrecision.textContent = state.taSolved ? `${Math.round(run.precision * 100)}%` : '—';
  el.taResultNewBest.classList.toggle('hidden', !isNewBest);
  el.taResultNewBestScore.classList.toggle('hidden', !isNewBestScore);
  el.taResultPrev.textContent = prev || '—';
  el.taResultPrevScore.textContent = prevScore || '—';
  el.taResultOverlay.classList.remove('hidden');
  playSound(isNewBest || isNewBestScore ? 'win' : 'drop');
}

function exitTimeAttack() {
  stopTATimer();
  el.taResultOverlay.classList.add('hidden');
  showScreen('select');
}

function retryTimeAttack() {
  el.taResultOverlay.classList.add('hidden');
  startTimeAttack();
}

/* =====================================================================
   RENDER
   ===================================================================== */

const SYMBOL = { R: '▲', G: '●', B: '■', Y: '◆', P: '✚', K: '★', J: '✦' };

function makeBall(ballStr, extraClass = '') {
  const color = colorOf(ballStr);
  const budget = budgetOf(ballStr);
  const ball = document.createElement('div');
  ball.className = `ball ball-${color} ${extraClass}`.trim();
  ball.dataset.s = SYMBOL[color] || '';
  if (budget !== Infinity) {
    ball.dataset.n = String(budget);
    ball.classList.add('budget');
    if (budget === 0) ball.classList.add('hard');
  }
  return ball;
}

function renderTube(tube, index, kind, capacity) {
  // kind: 'game' | 'target' | 'zoom'
  const isTarget = kind === 'target' || kind === 'zoom';
  const tubeEl = document.createElement('div');
  tubeEl.className = kind === 'target' ? 'tube target-tube' : kind === 'zoom' ? 'tube game zoom-tube' : 'tube game';
  tubeEl.style.setProperty('--cap', capacity);
  const color = state.tubeColors[index];
  if (color) tubeEl.classList.add(`color-${color}`);
  const isShift = state.shifts.includes(index);
  if (isShift) tubeEl.classList.add('shift');
  const isShiftBack = state.shiftsBack.includes(index);
  if (isShiftBack) tubeEl.classList.add('shift-back');
  const isBlender = state.blenders.includes(index);
  if (isBlender) tubeEl.classList.add('blender');
  const valveApi = getValveApi();
  const valveMode = valveApi ? valveApi.valveModeForTube({ valves: state.valves }, state.valveStates, index) : null;
  if (valveMode) tubeEl.classList.add(`valve-${valveMode}`);
  const portalApi = getPortalApi();
  const portal = portalApi ? portalApi.getPortal({ portals: state.portals }, index) : null;
  const isPortalEntry = !!portal && portalApi.isPortalEntry({ portals: state.portals }, index);
  if (portal) {
    tubeEl.classList.add('portal', `portal-${portal.index % 4}`, isPortalEntry ? 'portal-entry' : 'portal-exit');
  }
  const isCentrifuge = state.centrifuges.includes(index);
  if (isCentrifuge) tubeEl.classList.add('centrifuge');

  if (kind === 'game') {
    if (state.selectedTubeIndex === index) tubeEl.classList.add('selected');
    // Pipes: once a source is chosen, only its neighbours are reachable.
    if (hasPipes() && state.selectedTubeIndex !== null && state.selectedTubeIndex !== index) {
      tubeEl.classList.add(pipeAllows(state.selectedTubeIndex, index) ? 'reachable' : 'unreachable');
    }
    const badgeStrip = document.createElement('div');
    badgeStrip.className = 'tube-badges';
    if (isCentrifuge) {
      const badge = document.createElement('div');
      badge.className = 'centrifuge-badge';
      badge.textContent = '🌪';
      badge.title = 'צנטריפוגה: כשהמבחנה מתמלאת היא מתהפכת — התחתון עולה למעלה'
        + (state.portals.some(p => p.pair[1] === index) ? '. גם כדור מהצינור ממלא אותה' : '');
      badgeStrip.appendChild(badge);
    }
    const lock = tubeLockInfo(index);
    if (lock.locked) {
      tubeEl.classList.add('locked');
      const badge = document.createElement('div');
      badge.className = 'lock-badge';
      if (lock.condition) {
        badge.classList.add('lock-badge-cond');
        badge.innerHTML = '🔒' + lock.condition.contents.map(c => `<i class="mini-ball ball-${c}"></i>`).join('');
        badge.title = 'נפתחת כשמבחנת המפתח 🗝 מכילה בדיוק את הכדורים שעל התג';
      } else {
        badge.textContent = `🔒${lock.remaining}`;
        badge.title = `נפתחת בעוד ${lock.remaining} מהלכים`;
      }
      badgeStrip.appendChild(badge);
    }
    if (isLockKeyTube(index)) {
      tubeEl.classList.add('lock-key');
      const badge = document.createElement('div');
      badge.className = 'key-badge';
      badge.textContent = '🗝';
      badge.title = state.centrifuges.includes(index)
        ? 'מבחנת המפתח היא צנטריפוגה: התג מתאר את הערימה אחרי ההיפוך'
        : 'מבחנת המפתח: כשהיא תגיע למצב שעל תג המנעול, המנעול ייפתח';
      badgeStrip.appendChild(badge);
    }
    if (isShift) {
      const badge = document.createElement('div');
      badge.className = 'shift-badge';
      badge.innerHTML = '<span class="spin">🔄</span><span class="dir">+1</span>';
      badge.title = 'שיפט קדימה: כדור נכנס הופך לצבע הבא במחזור';
      badgeStrip.appendChild(badge);
    }
    if (isShiftBack) {
      const badge = document.createElement('div');
      badge.className = 'shift-badge shift-back-badge';
      badge.innerHTML = '<span class="spin">🔃</span><span class="dir">−1</span>';
      badge.title = 'שיפט אחורה: כדור נכנס הופך לצבע הקודם במחזור';
      badgeStrip.appendChild(badge);
    }
    if (isBlender) {
      const badge = document.createElement('div');
      badge.className = 'blender-badge';
      badge.textContent = '⚗️';
      badge.title = 'מבחנת ערבוב';
      badgeStrip.appendChild(badge);
    }
    if (valveMode) {
      const badge = document.createElement('div');
      badge.className = `valve-badge valve-badge-${valveMode}`;
      badge.textContent = valveMode === 'in' ? '↓' : '↑';
      badge.title = valveMode === 'in' ? 'שסתום כניסה' : 'שסתום יציאה';
      badgeStrip.appendChild(badge);
    }
    if (portal) {
      const badge = document.createElement('div');
      badge.className = `portal-badge portal-badge-${portal.index % 4}`;
      const n = portal.index + 1;
      if (portal.mode === 'redirect') {
        badge.textContent = `↔${n}`;
        badge.title = `דלת ${n}: כדור שנכנס יוצא מהדלת התאומה`;
      } else if (isPortalEntry) {
        badge.textContent = `⤵${n}`;
        badge.title = `צינור ${n}: כדור שנכנס כאן נכנס מתחתית המבחנה התאומה`;
      } else {
        badge.textContent = `⤶${n}`;
        badge.title = `מוצא צינור ${n}: כדורים מהצינור נכנסים כאן מלמטה`;
      }
      badgeStrip.appendChild(badge);
    }
    if (badgeStrip.children.length > 0) tubeEl.appendChild(badgeStrip);
    tubeEl.addEventListener('click', () => onTubeTap(index));
  }

  const target = state.target[index] || [];
  tube.forEach((c, ballIndex) => {
    const ball = makeBall(c, 'real');
    if (kind === 'game' && state.selectedTubeIndex === index && ballIndex === tube.length - 1) ball.classList.add('lifted');
    if (kind === 'game' && settings.ghost && isBallHome(index, ballIndex)) ball.classList.add('home');
    tubeEl.appendChild(ball);
  });
  // Ghost target: the card's balls drawn as outlines in the empty slots above
  // the stack, so the player sees what still has to land here.
  if (kind === 'game' && settings.ghost) {
    for (let i = tube.length; i < target.length; i++) {
      const g = makeBall(target[i], 'ghost');
      tubeEl.appendChild(g);
    }
  }
  return tubeEl;
}

/* ----- rule chips ----- */
function miniBall(c) { return `<i class="mini-ball ball-${c}"></i>`; }

function buildRuleChips() {
  const chips = [];
  const push = (icon, html, text) => chips.push({ icon, html, text });
  if (state.mode === 'daily' && state.dailyChallenge) {
    const api = getDailyApi();
    const m = state.dailyChallenge.modifier;
    const detail = m.id === 'tight' && api
      ? `${m.description} יעד יומי: עד ${api.getTightMoveLimit(state.dailyChallenge.level)} מהלכים.`
      : m.description;
    push(m.icon, `<b>${m.label}</b>`, `ניסוי יומי — ${m.label}. ${detail}`);
  }
  if (state.capacities.some(c => c !== 4)) {
    push('▯', 'מבחנה נמוכה', 'מבחנות נמוכות מחזיקות פחות כדורים, ולכן הן חיץ חלקי בלבד.');
  }
  if (state.tubeColors.some(Boolean)) {
    const cols = [...new Set(state.tubeColors.filter(Boolean))].map(miniBall).join('');
    push('🎯', `רק ${cols}`, 'מבחנה צבעונית מקבלת רק את הצבע שלה, או ג׳וקר.');
  }
  if (state.locks.some(L => !L.until)) {
    push('🔒', 'נפתח לפי מהלכים', 'מבחנה נעולה נפתחת אחרי מספר המהלכים שעל התג. אי אפשר לשפוך ממנה או אליה עד אז.');
  }
  if (state.locks.some(L => L.until)) {
    push('🔒', 'נפתח בתנאי 🗝', 'מנעול-תנאי נפתח כשמבחנת המפתח 🗝 מכילה בדיוק את הכדורים שמצוירים על התג.');
  }
  if (state.shifts.length > 0) {
    push('🔄', `${miniBall('R')}→${miniBall('G')}→${miniBall('B')}→${miniBall('Y')}→${miniBall('R')}`,
      'שיפט קדימה (+1): כדור שנכנס למבחנה הופך לצבע הבא במחזור. ג׳וקר לא משתנה.');
  }
  if (state.shiftsBack.length > 0) {
    push('🔃', `${miniBall('R')}→${miniBall('Y')}→${miniBall('B')}→${miniBall('G')}→${miniBall('R')}`,
      'שיפט אחורה (−1): כדור שנכנס הופך לצבע הקודם במחזור. ג׳וקר לא משתנה.');
  }
  if (state.blenders.length > 0) {
    const api = window.PIGMENT_MIXING || (typeof PIGMENT_MIXING !== 'undefined' ? PIGMENT_MIXING : null);
    const recipes = api ? Object.entries(api.RECIPES) : [];
    recipes.forEach(([pair, result]) => {
      const [a, b] = pair.split('+');
      push('⚗️', `${miniBall(a)}+${miniBall(b)}=${miniBall(result)}`,
        `במבחנת ערבוב, ${COLOR_NAME[a]} ו${COLOR_NAME[b]} הופכים יחד ל${COLOR_NAME[result]} אחד. שני כדורים נכנסים, אחד יוצא.`);
    });
  }
  if (state.valves.length > 0) {
    push('↕', 'שסתומים', 'שסתום כניסה ↓ מקבל בלבד, שסתום יציאה ↑ משחרר בלבד, ושסתום מתהפך מחליף כיוון אחרי כל שימוש.');
  }
  if (state.portals.some(p => p.mode === 'redirect')) {
    push('↔', 'דלתות', 'דלת מעבירה כדור שנכנס אליה אל הדלת התאומה (אותו מספר).');
  }
  if (state.portals.some(p => p.mode !== 'redirect')) {
    push('⤵', 'צינור תחתי', 'כדור שנכנס לפתח ⤵ מחליק אל תחתית המבחנה התאומה ⤶ — בלי חוקי צבע, אבל הוא נקבר שם מתחת לכל הערימה.'
      + (state.blenders.length ? ' במבחנת ערבוב הצינור פוגש את הכדור התחתון ומערבב איתו.' : ''));
  }
  if (hasPipes()) {
    push('🔗', state.oneWay.length ? 'צנרת חד-כיוונית' : 'צנרת',
      'שופכים רק דרך צינור שמצויר בין המבחנות. כשבוחרים מקור, רק המבחנות המחוברות אליו מוארות.'
      + (state.oneWay.length ? ' חץ על צינור = כיוון אחד בלבד.' : ''));
  }
  if (state.centrifuges.length > 0) {
    push('🌪', 'צנטריפוגה', 'ברגע שמבחנת צנטריפוגה מתמלאת היא מתהפכת: הכדור התחתון עולה למעלה. ממלאים כדי לחפור.'
      + (state.portals.length ? ' גם כדור שמגיע מצינור תחתי ⤵ ממלא אותה — ואחרי ההיפוך הוא יעלה למעלה.' : ''));
  }
  const hasBudget = state.tubes.some(t => t.some(b => budgetOf(b) !== Infinity));
  if (hasBudget) {
    push('⌛', 'כדור מתקשה', 'המספר על הכדור הוא כמה פעמים עוד מותר להזיז אותו. באפס הוא מתקשה במקומו לתמיד — הכן את הבית לפני שנוגעים בו.'
      + (state.blenders.length ? ' רק ערבוב במבחנת ⚗️ יכול לבלוע כדור שהתקשה: כדור שמתקשה בתחתית המעבדה מחכה לבן-הזוג שלו.' : ''));
  }
  const hasJoker = state.tubes.concat(state.target).some(t => t.some(b => colorOf(b) === 'J'));
  if (hasJoker) {
    push('', `${miniBall('J')} ג׳וקר`, 'ג׳וקר מתאים לכל צבע, וכל צבע מתאים עליו.');
  }
  return chips;
}

/* ----- pipes overlay: SVG lines between connected tubes ----- */
function renderPipes() {
  const layer = el.pipesLayer;
  if (!layer) return;
  layer.innerHTML = '';
  if (!hasPipes() || state.screen !== 'game') { layer.classList.add('hidden'); return; }
  layer.classList.remove('hidden');
  const host = el.gameSection.getBoundingClientRect();
  layer.setAttribute('viewBox', `0 0 ${host.width} ${host.height}`);
  layer.setAttribute('width', host.width);
  layer.setAttribute('height', host.height);
  const tubes = [...document.querySelectorAll('#game-tubes .tube.game')];
  const top = (i) => {
    const r = tubes[i].getBoundingClientRect();
    return { x: r.left + r.width / 2 - host.left, y: r.top - host.top - 6 };
  };
  const NS = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = '<marker id="pipe-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="pipe-arrow"></path></marker>';
  layer.appendChild(defs);
  const draw = (a, b, directed) => {
    if (!tubes[a] || !tubes[b]) return;
    const p = top(a), q = top(b);
    const lift = Math.max(18, Math.abs(q.x - p.x) * 0.18);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${p.x},${p.y} C${p.x},${p.y - lift} ${q.x},${q.y - lift} ${q.x},${q.y}`);
    const sel = state.selectedTubeIndex;
    const active = sel !== null && (sel === a || (!directed && sel === b));
    path.setAttribute('class', 'pipe' + (directed ? ' one-way' : '') + (active ? ' active' : '') + (sel !== null && !active ? ' dim' : ''));
    if (directed) path.setAttribute('marker-end', 'url(#pipe-arrow)');
    layer.appendChild(path);
  };
  state.pipes.forEach(([a, b]) => draw(a, b, false));
  state.oneWay.forEach(([a, b]) => draw(a, b, true));
}
window.addEventListener('resize', () => { if (state.screen === 'game') renderPipes(); });

function renderRuleChips() {
  const chips = buildRuleChips();
  if (!chips.length || state.mode === 'ta') {
    el.ruleCard.classList.add('hidden');
    el.ruleCard.innerHTML = '';
    return;
  }
  el.ruleCard.classList.remove('hidden');
  el.ruleCard.innerHTML = chips.map((c, i) => `
    <button class="rule-chip" data-i="${i}" title="${c.text}">
      ${c.icon ? `<span class="rule-chip-icon">${c.icon}</span>` : ''}<span class="rule-chip-body">${c.html}</span>
    </button>`).join('') + '<div class="rule-detail hidden" id="rule-detail"></div>';
  el.ruleCard.querySelectorAll('.rule-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const detail = $('rule-detail');
      const c = chips[Number(btn.dataset.i)];
      const wasOpen = btn.classList.contains('open');
      el.ruleCard.querySelectorAll('.rule-chip').forEach(b => b.classList.remove('open'));
      if (wasOpen) { detail.classList.add('hidden'); return; }
      btn.classList.add('open');
      detail.textContent = c.text;
      detail.classList.remove('hidden');
    });
  });
}

// Tubes per row on narrow screens — keeps balls big instead of shrinking
// seven tubes into one row.
function tubesPerRow(n) {
  if (n <= 5) return n;
  if (n === 6) return 3;
  if (n <= 8) return 4;
  return 5;
}

function renderHeader() {
  if (state.mode === 'ta') return;
  const level = currentLevelData();
  const isDaily = state.mode === 'daily';
  let meta = null;
  if (state.mode === 'serial') {
    const { season, index } = state.serial;
    el.worldName.textContent = `📺 ניסוי השבוע · ${season.title}`;
    el.levelNumber.textContent = `${index + 1}/${season.episodes.length}`;
  } else if (state.mode === 'ladder') {
    const L = state.ladder;
    const w = getWorld(L.rungs[L.index].worldId);
    el.worldName.textContent = `🪜 סולם הכיול · ${w.icon} ${w.name} ${L.rungs[L.index].levelIndex + 1}`;
    el.levelNumber.textContent = `${L.index + 1}/${L.rungs.length}`;
    meta = getLevelMeta(L.rungs[L.index].worldId, L.rungs[L.index].levelIndex);
  } else {
    const world = isDaily ? getWorld(state.dailyChallenge.worldId) : getCurrentWorld();
    el.worldName.textContent = isDaily
      ? `🗓 ניסוי יומי · ${state.dailyChallenge.tierIcon} ${state.dailyChallenge.tierLabel} · ${world.icon} ${world.name}`
      : `${world.icon} ${world.name}`;
    el.levelNumber.textContent = state.currentLevel + 1;
    meta = getLevelMeta(isDaily ? state.dailyChallenge.worldId : state.currentWorld, state.currentLevel);
  }
  if (meta && TIER_LABEL[meta.tier]) {
    el.levelTier.textContent = TIER_LABEL[meta.tier];
    el.levelTier.className = `tier-chip tier-${meta.tier}`;
  } else {
    el.levelTier.className = 'tier-chip hidden';
  }
  el.moves.textContent = state.moveCount;
  el.par.textContent = level.optimalMoves;
  // Stars still reachable if the puzzle were finished right now.
  const reachable = computeStars(state.moveCount, level.optimalMoves);
  el.liveStars.innerHTML = renderStarsRow(reachable, 3, false);
  el.liveStars.classList.toggle('danger', reachable < 3);
}

function renderGame(suppressOpenAnim = false) {
  renderHeader();
  document.body.classList.toggle('no-open-anim', suppressOpenAnim);
  el.targetSection.classList.toggle('large-target', state.target.length >= 6);
  el.targetTubes.innerHTML = '';
  state.target.forEach((tube, i) => el.targetTubes.appendChild(renderTube(tube, i, 'target', state.capacities[i])));
  renderRuleChips();
  el.gameTubes.innerHTML = '';
  el.gameTubes.style.setProperty('--per-row', tubesPerRow(state.tubes.length));
  el.gameTubes.style.setProperty('--tube-count', state.tubes.length);
  // Two-row boards get a compact phone layout so the chips and the footer stay on screen.
  document.body.classList.toggle('rows-2', tubesPerRow(state.tubes.length) < state.tubes.length);
  state.tubes.forEach((tube, i) => el.gameTubes.appendChild(renderTube(tube, i, 'game', state.capacities[i])));
  if (state.hintActive && state.hintMove) {
    const tubeEls = el.gameTubes.querySelectorAll('.tube.game');
    if (tubeEls[state.hintMove[0]]) tubeEls[state.hintMove[0]].classList.add('hint-from');
    if (tubeEls[state.hintMove[1]]) tubeEls[state.hintMove[1]].classList.add('hint-to');
  }
  renderPipes();
  el.undoBtn.disabled = state.moveHistory.length === 0 || isDailyNoUndo() || state.mode === 'ladder' || state.replaying;
  el.undoCount.textContent = state.undoCount ? `· ${state.undoCount}` : '';
  el.hintBtn.disabled = state.mode === 'ta' || state.mode === 'ladder' || state.replaying;
  el.hintBtn.classList.toggle('used', state.hintUsed);
  renderHintButton();
  el.resetBtn.disabled = state.replaying;
}

// The hint button advertises unspent free-hint tokens (stamp rewards) until
// this run has been charged for a hint.
function renderHintButton() {
  const freeHints = (state.mode === 'solo' || state.mode === 'daily') && !state.hintFree && !state.hintUsed ? getFreeHints() : 0;
  el.hintBtn.innerHTML = freeHints > 0 ? `💡 רמז <span class="btn-count" title="רמזים חופשיים">· ${freeHints}</span>` : '💡 רמז';
  el.hintBtn.title = freeHints > 0 ? `${freeHints} רמזים חופשיים מפרס החותמות — לא מוותרים על חותמת "אופטימום"` : '';
}

function isDailyNoUndo() {
  return state.mode === 'daily' && state.dailyChallenge && state.dailyChallenge.modifier.id === 'noUndo';
}

/* ----- target zoom on long-press ----- */
let pressTimer = null;
function openTargetZoom() {
  el.targetZoomTubes.innerHTML = '';
  state.target.forEach((tube, i) => el.targetZoomTubes.appendChild(renderTube(tube, i, 'zoom', state.capacities[i])));
  el.targetZoom.classList.remove('hidden');
}
function closeTargetZoom() { el.targetZoom.classList.add('hidden'); }

/* =====================================================================
   CELEBRATION
   ===================================================================== */

function triggerCelebration() {
  if (settings.reduceAnim) return;
  el.celebration.classList.remove('hidden');
  el.celebration.innerHTML = '';
  const N = 24;
  const colors = ['#ff006e', '#00f5a0', '#00d5ff', '#ffe74c', '#c5564a', '#7a8b4f'];
  for (let i = 0; i < N; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / N) * 2 * Math.PI + Math.random() * 0.5;
    const dist = 200 + Math.random() * 150;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.15}s`;
    el.celebration.appendChild(p);
  }
  setTimeout(() => el.celebration.classList.add('hidden'), 1500);
}

/* =====================================================================
   EVENT WIRING
   ===================================================================== */

function openSettings() { el.settingsOverlay.classList.remove('hidden'); }
function closeSettings() { el.settingsOverlay.classList.add('hidden'); }

el.settingsBtn.addEventListener('click', openSettings);
el.settingsBtnTa.addEventListener('click', openSettings);
el.settingsBtnSelect.addEventListener('click', openSettings);
el.settingsCloseBtn.addEventListener('click', closeSettings);
el.settingsOverlay.addEventListener('click', (e) => { if (e.target === el.settingsOverlay) closeSettings(); });
el.themeButtons.forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.themeValue)));
el.reduceAnimToggle.addEventListener('change', (e) => applyReduceAnim(e.target.checked));
el.soundToggle.addEventListener('change', (e) => { applySound(e.target.checked); if (e.target.checked) playSound('home'); });
el.hapticsToggle.addEventListener('change', (e) => { applyHaptics(e.target.checked); if (e.target.checked) haptic('home'); });
el.ghostToggle.addEventListener('change', (e) => applyGhost(e.target.checked));
el.symbolsToggle.addEventListener('change', (e) => applySymbols(e.target.checked));

el.backBtn.addEventListener('click', backToSelect);
el.taBackBtn.addEventListener('click', () => { stopTATimer(); showScreen('select'); });
el.undoBtn.addEventListener('click', undo);
el.hintBtn.addEventListener('click', showHint);
el.resetBtn.addEventListener('click', resetLevel);
el.nextBtn.addEventListener('click', nextLevel);
el.retryBtn.addEventListener('click', retryLevel);
el.shareBtn.addEventListener('click', shareDaily);
el.backToSelectBtn.addEventListener('click', backToSelect);
el.completeBackBtn.addEventListener('click', backToSelect);

el.timeAttackBtn.addEventListener('click', startTimeAttack);
el.dailyBtn.addEventListener('click', openDailyChooser);
el.dailyCloseBtn.addEventListener('click', closeDailyChooser);
el.dailyOverlay.addEventListener('click', (e) => { if (e.target === el.dailyOverlay) closeDailyChooser(); });
el.taResultBackBtn.addEventListener('click', exitTimeAttack);
el.taResultRetryBtn.addEventListener('click', retryTimeAttack);
el.serialBtn.addEventListener('click', openSerial);
el.serialCloseBtn.addEventListener('click', closeSerial);
el.serialOverlay.addEventListener('click', (e) => { if (e.target === el.serialOverlay) closeSerial(); });
el.replaySkipBtn.addEventListener('click', finishReplay);
el.ladderBtn.addEventListener('click', startLadder);
el.ladderBackBtn.addEventListener('click', closeLadderResult);

// Long-press on the target card → full-size overlay while the finger is down.
['pointerdown', 'touchstart'].forEach(evt => el.targetSection.addEventListener(evt, () => {
  clearTimeout(pressTimer);
  pressTimer = setTimeout(openTargetZoom, 320);
}, { passive: true }));
['pointerup', 'pointerleave', 'pointercancel', 'touchend', 'touchcancel'].forEach(evt => {
  el.targetSection.addEventListener(evt, () => { clearTimeout(pressTimer); closeTargetZoom(); }, { passive: true });
  el.targetZoom.addEventListener(evt, () => { clearTimeout(pressTimer); closeTargetZoom(); }, { passive: true });
});
el.targetSection.addEventListener('contextmenu', (e) => e.preventDefault());

// Reset progress lives in settings and asks twice.
el.resetProgressBtn.addEventListener('click', () => {
  if (!confirm('לאפס את כל ההתקדמות? כוכבים, חותמות, שיאים וניסויים יומיים יימחקו.')) return;
  if (!confirm('בטוח? פעולה זו לא ניתנת לביטול.')) return;
  progress = {};
  saveProgress();
  saveDailyResults({});
  setTABest(0);
  setTABestScore(0);
  setFreeHintsUsed(0);
  try { localStorage.removeItem(LAST_KEY); } catch (e) {}
  state.expandedWorld = null;
  closeSettings();
  renderLevelSelect();
  showToast('ההתקדמות אופסה');
});

// Keyboard: Z = undo, R = reset, H = hint, Esc = back.
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'game') return;
  if (e.key === 'z' || e.key === 'Z') undo();
  else if (e.key === 'r' || e.key === 'R') resetLevel();
  else if (e.key === 'h' || e.key === 'H') showHint();
  else if (e.key === 'Escape') backToSelect();
});

/* =====================================================================
   INIT
   ===================================================================== */

initSettings();
loadProgress();
showScreen('select');
