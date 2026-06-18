/* =====================================================================
   STATE
   ===================================================================== */

const state = {
  screen: 'select',
  mode: 'solo',
  currentWorld: 1,            // world id (1-indexed, matches WORLDS[i].id)
  currentLevel: 0,            // level index within the world
  capacities: [],             // per-tube capacity for current level
  tubes: [],
  target: [],
  locks: [],                  // [{ tubeIndex, unlockAt }] — derived block state
  tubeColors: [],             // per-tube color tag (null = agnostic, 'R'/'G'/'B'/'Y' = color-locked)
  shifts: [],                 // tube indices that shift incoming balls forward R→G→B→Y→R (W6)
  shiftsBack: [],             // tube indices that shift incoming balls backward R→Y→B→G→R (W6)
  mixers: [],                 // tube indices that mix mismatched colors into a joker (W7)
  blenders: [],               // tube indices that combine recipe colors into a new color (W8)
  valves: [],                 // [{ tubeIndex, mode: 'in'|'out'|'flip', starts?: 'in'|'out' }]
  valveStates: {},            // mutable state only for flip valves
  portals: [],                // [{ pair: [entryA, entryB] }] — entering either tube exits the other
  selectedTubeIndex: null,
  moveCount: 0,
  moveHistory: [],
  undoCount: 0,
  violationCount: 0,
  lastViolation: null,        // rule key of the most recent illegal-move feedback (for toast escalation)
  taTimeLeft: 0,
  taTimerId: null,
  taSolved: 0,
  taLevelQueue: [],
  dailyChallenge: null
};

/* =====================================================================
   VIOLATION TOAST
   First time the player breaks a rule → short icon-led hint.
   Second time the SAME rule is broken in a row → full sentence.
   A successful move resets the counter so a new violation starts short again.
   ===================================================================== */

const VIOLATION_COPY = {
  lock:     { short: '🔒 נעולה', full: (ctx) => `המבחנה נעולה. עוד ${ctx.remaining} מהלכים והיא תיפתח.` },
  color:    { short: '🎯 צבע אחר',
              full: (ctx) => `המבחנה מקבלת רק כדור ${COLOR_NAME[ctx.color] || ctx.color} או ג'וקר.` },
  capacity: { short: '🚫 מלא',  full: () => 'המבחנה מלאה ולא יכולה לקבל עוד כדורים.' },
  stack:    { short: '❌ לא תואם',
              full: () => 'אפשר להניח כדור רק על אותו צבע, על ג\'וקר, או במבחנה ריקה.' },
  blend:    { short: '⚗️ אין מתכון',
              full: () => 'במבחנת ערבוב צריך זוג צבעים שיוצר צבע חדש לפי המתכונים.' },
  valveSource: { short: '↓ כניסה בלבד', full: () => 'השסתום הזה מקבל כדורים בלבד. אי אפשר לשפוך ממנו.' },
  valveDest:   { short: '↑ יציאה בלבד', full: () => 'השסתום הזה משחרר כדורים בלבד. אי אפשר לשפוך אליו.' },
  portalBack:  { short: '🌀 חוזר לכאן', full: () => 'כניסה לפורטל הזה מחזירה את הכדור למבחנה שממנה יצא, לכן אין תנועה.' }
};
const COLOR_NAME = { R: 'אדום', G: 'ירוק', B: 'כחול', Y: 'צהוב', P: 'סגול', K: 'שחור' };

// The toast is a single centered hint floating in the empty band above the
// play tubes — not pinned to the offending tube. `tubeIndex` is kept in the
// signature (call sites still pass it) but no longer used for placement.
function showViolation(tubeIndex, rule, ctx) {
  state.violationCount++;
  const repeat = state.lastViolation === rule;
  state.lastViolation = rule;
  const copy = VIOLATION_COPY[rule];
  if (!copy) return;
  const text = repeat ? copy.full(ctx || {}) : copy.short;

  const host = el.gameSection;
  if (!host) return;
  // Remove any prior toast so rapid repeats don't pile up.
  host.querySelectorAll('.violation-toast').forEach((t) => t.remove());
  const toast = document.createElement('div');
  toast.className = 'violation-toast' + (repeat ? ' full' : '');
  toast.textContent = text;
  host.appendChild(toast);
  // Center it vertically in the empty band between the target card's bottom
  // and the play tubes' top. Measured per level so it lands mid-gap whatever
  // the tube height is. translate(-50%, -50%) in CSS pins the toast's center.
  const gs = host.getBoundingClientRect();
  const tubesTop = el.gameTubes.getBoundingClientRect().top;
  const targetSec = document.getElementById('target-section');
  const gapTop = targetSec ? targetSec.getBoundingClientRect().bottom : gs.top;
  const gapMid = (gapTop + tubesTop) / 2;
  toast.style.top = Math.max(8, Math.round(gapMid - gs.top)) + 'px';
  // The full (text-heavy) hint lingers ~3s to give time to read; the short
  // icon hint stays brief. Either way, the player's next tap dismisses it
  // instantly (see dismissViolationToast), so the long window never nags.
  setTimeout(() => toast.classList.add('fading'), repeat ? 3000 : 1100);
  setTimeout(() => toast.remove(), repeat ? 3350 : 1500);
}

function clearViolation() {
  state.lastViolation = null;
}

// Pull any visible hint off the screen. Called at the start of every tap so
// continuing to play dismisses the hint immediately — independent of the
// escalation counter (clearViolation), which must NOT reset here or the
// "same rule twice → full sentence" logic would never fire.
function dismissViolationToast() {
  if (!el.gameSection) return;
  el.gameSection.querySelectorAll('.violation-toast').forEach((t) => t.remove());
}

/* =====================================================================
   WORLD VISIBILITY
   Some worlds are retired from the main route but kept in levels.js so old
   progress entries stay loadable and their mechanics can be reused as side
   content. They don't appear in UI and don't count toward star totals.
   ===================================================================== */
const HIDDEN_WORLD_IDS = [2, 5, 7, 9];
function isWorldVisible(world) {
  return !HIDDEN_WORLD_IDS.includes(world.id);
}
function visibleWorlds() {
  return WORLDS.filter(isWorldVisible);
}

// Lock state is purely derived from moveCount + level.locks, so undo "rewinds"
// locks for free without any history bookkeeping.
function tubeLockInfo(tubeIndex) {
  for (const L of state.locks) {
    if (L.tubeIndex === tubeIndex && state.moveCount < L.unlockAt) {
      return { locked: true, remaining: L.unlockAt - state.moveCount };
    }
  }
  return { locked: false, remaining: 0 };
}

// A color-locked tube accepts only its color (or the joker wildcard).
function tubeAcceptsColor(tubeIndex, ball) {
  const c = state.tubeColors[tubeIndex];
  if (c === null || c === undefined) return true;
  return ball === c || ball === 'J';
}

// Flash the top ball of the given tube right after a mix completes.
// Re-render rebuilds the DOM, so we apply the class after `renderGame`.
function flashMixedBall(tubeIndex) {
  const tubeEls = document.querySelectorAll('#game-tubes .tube.game');
  const tubeEl = tubeEls[tubeIndex];
  if (!tubeEl) return;
  const balls = tubeEl.querySelectorAll('.ball');
  const topBall = balls[balls.length - 1];
  if (!topBall) return;
  topBall.classList.add('just-mixed');
  setTimeout(() => topBall.classList.remove('just-mixed'), 700);
}

function blendedBall(topBall, incomingBall) {
  const api = window.PIGMENT_MIXING || (typeof PIGMENT_MIXING !== 'undefined' ? PIGMENT_MIXING : null);
  if (!api) return null;
  return api.mixPair(topBall, incomingBall);
}

// Shift cycle (W6): forward R→G→B→Y→R, reverse R→Y→B→G→R. Joker is immune to
// both. A tube is at most one of forward/reverse.
const SHIFT_CYCLE = { R: 'G', G: 'B', B: 'Y', Y: 'R' };
const SHIFT_CYCLE_BACK = { R: 'Y', Y: 'B', B: 'G', G: 'R' };
function shiftedBall(ball, tubeIndex) {
  if (ball === 'J') return ball;
  if (state.shifts.includes(tubeIndex)) return SHIFT_CYCLE[ball] || ball;
  if (state.shiftsBack.includes(tubeIndex)) return SHIFT_CYCLE_BACK[ball] || ball;
  return ball;
}

function getPortalApi() {
  return window.PORTALS || (typeof PORTALS !== 'undefined' ? PORTALS : null);
}

const el = {
  screenSelect: document.getElementById('screen-select'),
  screenGame: document.getElementById('screen-game'),
  worldsContainer: document.getElementById('worlds-container'),
  totalStars: document.getElementById('total-stars'),
  maxStars: document.getElementById('max-stars'),
  settingsBtnSelect: document.getElementById('settings-btn-select'),
  resetProgressBtn: document.getElementById('reset-progress-btn'),
  timeAttackBtn: document.getElementById('time-attack-btn'),
  taBest: document.getElementById('ta-best'),
  dailyBtn: document.getElementById('daily-btn'),
  dailySub: document.getElementById('daily-sub'),

  soloHeader: document.getElementById('solo-header'),
  backBtn: document.getElementById('back-btn'),
  worldName: document.getElementById('world-name'),
  levelNumber: document.getElementById('level-number'),
  moves: document.getElementById('moves'),
  settingsBtn: document.getElementById('settings-btn'),
  soloFooter: document.getElementById('solo-footer'),

  taHeader: document.getElementById('ta-header'),
  taBackBtn: document.getElementById('ta-back-btn'),
  taSolved: document.getElementById('ta-solved'),
  taTime: document.getElementById('ta-time'),
  settingsBtnTa: document.getElementById('settings-btn-ta'),
  quickFlash: document.getElementById('quick-flash'),

  targetSection: document.getElementById('target-section'),
  targetTubes: document.getElementById('target-tubes'),
  ruleCard: document.getElementById('rule-card'),
  gameSection: document.getElementById('game-section'),
  gameTubes: document.getElementById('game-tubes'),
  undoBtn: document.getElementById('undo-btn'),
  resetBtn: document.getElementById('reset-btn'),

  winOverlay: document.getElementById('win-overlay'),
  winMoves: document.getElementById('win-moves'),
  winOptimal: document.getElementById('win-optimal'),
  winStars: document.getElementById('win-stars'),
  winStarHint: document.getElementById('win-star-hint'),
  winContracts: document.getElementById('win-contracts'),
  nextBtn: document.getElementById('next-btn'),
  backToSelectBtn: document.getElementById('back-to-select-btn'),
  completeOverlay: document.getElementById('game-complete-overlay'),
  completeTitle: document.getElementById('complete-title'),
  completeBody: document.getElementById('complete-body'),
  completeBackBtn: document.getElementById('complete-back-btn'),
  taResultOverlay: document.getElementById('ta-result-overlay'),
  taResultSolved: document.getElementById('ta-result-solved'),
  taResultNewBest: document.getElementById('ta-result-new-best'),
  taResultPrev: document.getElementById('ta-result-prev'),
  taResultBackBtn: document.getElementById('ta-result-back-btn'),
  taResultRetryBtn: document.getElementById('ta-result-retry-btn'),

  settingsOverlay: document.getElementById('settings-overlay'),
  settingsCloseBtn: document.getElementById('settings-close-btn'),
  themeButtons: document.querySelectorAll('[data-theme-value]'),
  reduceAnimToggle: document.getElementById('reduce-anim-toggle'),
  celebration: document.getElementById('celebration')
};

/* =====================================================================
   PERSISTENCE
   progress shape:
     { "1": { "0": {stars, bestMoves}, "1": ... }, "2": { ... } }
   keyed by world id (string), then level index (string).
   ===================================================================== */

const THEME_KEY = 'tubes-theme';
const PROGRESS_KEY = 'tubes-progress';
const TA_BEST_KEY = 'tubes-ta-best';
const DAILY_RESULTS_KEY = 'tubes-daily-results';
const REDUCE_ANIM_KEY = 'tubes-reduce-anim';
const VALID_THEMES = ['nostalgic', 'modern'];

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

function getWorldProgress(worldId) {
  return progress[String(worldId)] || {};
}

function getLevelRecord(worldId, levelIndex) {
  const w = getWorldProgress(worldId);
  return w[String(levelIndex)];
}

function getContractApi() {
  return window.CONTRACTS || (typeof CONTRACTS !== 'undefined' ? CONTRACTS : null);
}

function getDailyApi() {
  return window.DAILY_CHALLENGE || (typeof DAILY_CHALLENGE !== 'undefined' ? DAILY_CHALLENGE : null);
}

function getValveApi() {
  return window.VALVES || (typeof VALVES !== 'undefined' ? VALVES : null);
}

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
  if (!existing || stars > existing.stars || (stars === existing.stars && moves < existing.bestMoves)) {
    progress[wid][lid] = { stars, bestMoves: moves, contracts };
    saveProgress();
  } else if (contractCount > existingContractCount) {
    progress[wid][lid] = { ...existing, contracts };
    saveProgress();
  }
}

function getWorldStars(worldId) {
  const w = getWorldProgress(worldId);
  return Object.values(w).reduce((sum, r) => sum + (r.stars || 0), 0);
}

function getTotalStars() {
  return visibleWorlds().reduce((sum, w) => sum + getWorldStars(w.id), 0);
}

function getMaxStars() {
  return visibleWorlds().reduce((sum, w) => sum + w.levels.length * 3, 0);
}

function isWorldUnlocked(world) {
  return getTotalStars() >= world.unlockStars;
}

function isLevelUnlocked(worldId, levelIndex) {
  const world = WORLDS.find(w => w.id === worldId);
  if (!isWorldUnlocked(world)) return false;
  if (levelIndex === 0) return true;
  const prev = getLevelRecord(worldId, levelIndex - 1);
  return !!(prev && prev.stars > 0);
}

function getTABest() {
  const v = parseInt(localStorage.getItem(TA_BEST_KEY) || '0', 10);
  return Number.isFinite(v) ? v : 0;
}
function setTABest(n) {
  try { localStorage.setItem(TA_BEST_KEY, String(n)); } catch (e) {}
}

function getDailyResults() {
  try { return JSON.parse(localStorage.getItem(DAILY_RESULTS_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveDailyResults(results) {
  try { localStorage.setItem(DAILY_RESULTS_KEY, JSON.stringify(results)); } catch (e) {}
}

function recordDailyResult(challenge, moves, stars, modifierPassed) {
  if (!challenge) return;
  const results = getDailyResults();
  const existing = results[challenge.key];
  if (!existing || stars > existing.stars || (stars === existing.stars && moves < existing.bestMoves)) {
    results[challenge.key] = {
      worldId: challenge.worldId,
      levelIndex: challenge.levelIndex,
      modifierId: challenge.modifier.id,
      stars,
      bestMoves: moves,
      modifierPassed: !!modifierPassed
    };
  } else if (modifierPassed && !existing.modifierPassed) {
    results[challenge.key] = { ...existing, modifierPassed: true };
  }
  saveDailyResults(results);
}

/* =====================================================================
   THEME + REDUCE ANIMATIONS
   ===================================================================== */

function applyTheme(theme) {
  if (!VALID_THEMES.includes(theme)) theme = 'nostalgic';
  document.body.setAttribute('data-theme', theme);
  el.themeButtons.forEach(b => b.classList.toggle('active', b.dataset.themeValue === theme));
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function applyReduceAnim(on) {
  document.body.classList.toggle('reduce-anim', on);
  el.reduceAnimToggle.checked = on;
  try { localStorage.setItem(REDUCE_ANIM_KEY, on ? '1' : '0'); } catch (e) {}
}

function initSettings() {
  let theme = 'nostalgic', reduce = false;
  try {
    theme = localStorage.getItem(THEME_KEY) || 'nostalgic';
    reduce = localStorage.getItem(REDUCE_ANIM_KEY) === '1';
  } catch (e) {}
  applyTheme(theme);
  applyReduceAnim(reduce);
}

/* =====================================================================
   SCREEN ROUTING
   ===================================================================== */

function showScreen(name) {
  state.screen = name;
  el.screenSelect.classList.toggle('hidden', name !== 'select');
  el.screenGame.classList.toggle('hidden', name !== 'game');
  if (name === 'select') renderLevelSelect();
}

function showModeUI() {
  const ta = state.mode === 'ta';
  el.soloHeader.classList.toggle('hidden', ta);
  el.taHeader.classList.toggle('hidden', !ta);
  el.soloFooter.classList.toggle('hidden', ta);
}

/* =====================================================================
   LEVEL SELECT — sectioned per world
   ===================================================================== */

/**
 * Render up to N stars, each filled by a fraction.
 * starsEarned can be decimal (e.g. 2.25, 2.5). Distributes fill across stars:
 * star 1 fills up to 1.0, then star 2 fills up to 1.0, etc.
 *
 * @param {boolean} wrap if true, wraps stars in a <span class="stars-row">.
 *   Set false when the caller already has a .stars-row container.
 */
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
  // 27 → "27", 27.5 → "27.5", 27.25 → "27.25"
  // Decimal point survives RTL context cleanly; ¼/½/¾ glyphs do not.
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
}

function getCurrentWorld() {
  return WORLDS.find(w => w.id === state.currentWorld);
}

function getRuleSummary() {
  const parts = [];
  if (state.capacities.some(c => c !== 4)) {
    parts.push('מבחנות נמוכות מחזיקות פחות כדורים.');
  }
  if (state.tubeColors.some(Boolean)) {
    parts.push('מבחנה צבעונית מקבלת רק את הצבע שלה או ג׳וקר.');
  }
  if (state.locks.length > 0) {
    parts.push('מבחנה נעולה נפתחת אחרי מספר המהלכים שעל התג.');
  }
  if (state.shifts.length > 0) {
    parts.push('שיפט משנה כדור נכנס לצבע הבא במחזור.');
  }
  if (state.shiftsBack.length > 0) {
    parts.push('שיפט הפוך משנה כדור נכנס לצבע הקודם במחזור.');
  }
  if (state.mixers.length > 0) {
    parts.push('מערבל הופך שני צבעים שונים לג׳וקר אחד.');
  }
  if (state.blenders.length > 0) {
    parts.push('מבחנת ערבוב משלבת זוג צבעים לפי מתכון ויוצרת כדור חדש.');
  }
  if (state.valves.length > 0) {
    parts.push('שסתום כניסה מקבל בלבד, שסתום יציאה משחרר בלבד, ושסתום מתהפך מחליף כיוון אחרי שימוש.');
  }
  if (state.portals.length > 0) {
    parts.push('פורטל מעביר כדור שנכנס אליו אל הפורטל התאום שלו.');
  }
  const hasJoker = state.tubes.concat(state.target).some(t => t.includes('J'));
  if (hasJoker) {
    parts.push('ג׳וקר מתאים לכל צבע וכל צבע מתאים עליו.');
  }
  if (state.mode === 'daily' && state.dailyChallenge) {
    const api = getDailyApi();
    const modifier = state.dailyChallenge.modifier;
    const detail = modifier.id === 'tight' && api
      ? `${modifier.description} יעד יומי: עד ${api.getTightMoveLimit(state.dailyChallenge.level)} מהלכים.`
      : modifier.description;
    parts.unshift(`ניסוי יומי: ${modifier.icon} ${modifier.label}. ${detail}`);
  }
  return parts;
}

function getTodaysDailyChallenge() {
  const api = getDailyApi();
  if (!api) return null;
  return api.pickDailyChallenge(WORLDS, new Date(), { hiddenWorldIds: HIDDEN_WORLD_IDS });
}

function renderDailyCard() {
  if (!el.dailyBtn || !el.dailySub) return;
  const challenge = getTodaysDailyChallenge();
  if (!challenge) {
    el.dailyBtn.disabled = true;
    el.dailySub.textContent = 'אין היום ניסוי זמין';
    return;
  }
  const world = WORLDS.find(w => w.id === challenge.worldId);
  const result = getDailyResults()[challenge.key];
  const status = result
    ? ` · שיא: ${result.bestMoves} מהלכים${result.modifierPassed ? ' · כלל הושלם' : ''}`
    : '';
  el.dailyBtn.disabled = false;
  el.dailySub.textContent =
    `${challenge.modifier.icon} ${challenge.modifier.label} · ${world.icon} ${world.name}, שלב ${challenge.levelIndex + 1}${status}`;
}

function renderLevelSelect() {
  el.worldsContainer.innerHTML = '';
  visibleWorlds().forEach(world => {
    const section = document.createElement('div');
    section.className = 'world-section';
    const unlocked = isWorldUnlocked(world);
    if (!unlocked) section.classList.add('locked');

    const worldStars = getWorldStars(world.id);
    const worldMax = world.levels.length * 3;

    const header = `
      <div class="world-section-header">
        <span class="world-section-title">${world.icon} ${world.name}</span>
        <span class="world-section-stars">${formatStars(worldStars)} / ${worldMax} ⭐</span>
      </div>
      <div class="world-section-desc">${world.description}</div>
    `;

    if (!unlocked) {
      const missing = Math.max(0, world.unlockStars - getTotalStars());
      section.innerHTML = header + `
        <div class="world-locked-overlay">
          <span class="lock-big">🔒</span>
          השג ${world.unlockStars} כוכבים כדי לפתוח את העולם הזה
          <span class="missing-stars">חסרים ${formatStars(missing)} כוכבים</span>
        </div>
      `;
    } else {
      const grid = document.createElement('div');
      grid.className = 'level-grid';
      world.levels.forEach((level, i) => {
        const lvlUnlocked = isLevelUnlocked(world.id, i);
        const rec = getLevelRecord(world.id, i);
        const stars = rec ? rec.stars : 0;
        const contractApi = getContractApi();
        const contractCount = contractApi ? contractApi.countContracts(rec && rec.contracts) : 0;
        const card = document.createElement('button');
        card.className = 'level-card' + (lvlUnlocked ? '' : ' locked');
        card.disabled = !lvlUnlocked;
        card.setAttribute(
          'aria-label',
          rec ? `שלב ${i + 1}, ${contractCount} מתוך 3 חותמות אתגר` : `שלב ${i + 1}`
        );
        card.innerHTML = `<span class="num">${i + 1}</span>` +
                        (lvlUnlocked ? renderStarsRow(stars) : '') +
                        (rec ? `<span class="level-contracts" title="חותמות אתגר">${contractCount}/3</span>` : '');
        if (lvlUnlocked) card.addEventListener('click', () => startSoloLevel(world.id, i));
        grid.appendChild(card);
      });
      section.innerHTML = header;
      section.appendChild(grid);
    }
    el.worldsContainer.appendChild(section);
  });

  el.totalStars.textContent = formatStars(getTotalStars());
  el.maxStars.textContent = getMaxStars();
  el.taBest.textContent = getTABest() || '—';
  renderDailyCard();
}

/* =====================================================================
   GAME PLAY
   ===================================================================== */

function startSoloLevel(worldId, levelIndex) {
  state.mode = 'solo';
  state.dailyChallenge = null;
  state.currentWorld = worldId;
  state.currentLevel = levelIndex;
  const world = WORLDS.find(w => w.id === worldId);
  loadLevelData(world.levels[levelIndex]);
  showScreen('game');
  showModeUI();
  renderGame();
}

function startDailyChallenge() {
  const challenge = getTodaysDailyChallenge();
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
  state.tubeColors = level.tubeColors
    ? [...level.tubeColors]
    : level.capacities.map(() => null);
  state.shifts = level.shifts ? [...level.shifts] : [];
  state.shiftsBack = level.shiftsBack ? [...level.shiftsBack] : [];
  state.mixers = level.mixers ? [...level.mixers] : [];
  state.blenders = level.blenders ? [...level.blenders] : [];
  state.valves = (level.valves || []).map(valve => ({ ...valve }));
  const valveApi = getValveApi();
  state.valveStates = valveApi ? valveApi.initialValveStates(level) : {};
  state.portals = (level.portals || []).map(portal => ({ ...portal, pair: [...portal.pair] }));
  state.selectedTubeIndex = null;
  state.moveCount = 0;
  state.moveHistory = [];
  state.undoCount = 0;
  state.violationCount = 0;
}

function onTubeTap(index) {
  // Any tap is "continuing to play" → clear a lingering hint right away.
  // A fresh violation later in this same call re-adds its own toast.
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
      showViolation(index, 'lock', { remaining: lock.remaining });
      return;
    }
    const valveApi = getValveApi();
    if (valveApi && !valveApi.canUseValveAsSource({ valves: state.valves }, state.valveStates, index)) {
      showViolation(index, 'valveSource');
      return;
    }
    state.selectedTubeIndex = index;
    renderGame(true);
    return;
  }
  const from = state.selectedTubeIndex;
  const requestedTo = index;
  const requestedLock = tubeLockInfo(requestedTo);
  if (requestedLock.locked) {
    // renderGame rebuilds #game-tubes, so the toast must be attached AFTER it
    // or it gets wiped along with the old tube element.
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(requestedTo, 'lock', { remaining: requestedLock.remaining });
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
  const to = portalApi
    ? portalApi.resolvePortalDestination({ portals: state.portals }, requestedTo)
    : requestedTo;
  if (to === from) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(requestedTo, 'portalBack');
    return;
  }
  if (to !== requestedTo) {
    const exitLock = tubeLockInfo(to);
    if (exitLock.locked) {
      state.selectedTubeIndex = null;
      renderGame(true);
      showViolation(to, 'lock', { remaining: exitLock.remaining });
      return;
    }
    if (valveApi && !valveApi.canUseValveAsDestination({ valves: state.valves }, state.valveStates, to)) {
      state.selectedTubeIndex = null;
      renderGame(true);
      showViolation(to, 'valveDest');
      return;
    }
  }
  if (to !== requestedTo && state.tubes[to].length >= state.capacities[to]) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(to, 'capacity');
    return;
  }
  const movingBall = state.tubes[from][state.tubes[from].length - 1];
  if (!tubeAcceptsColor(to, movingBall)) {
    state.selectedTubeIndex = null;
    renderGame(true);
    showViolation(to, 'color', { color: state.tubeColors[to] });
    return;
  }
  // Stacking check uses the POST-shift color: if the destination is a shift
  // tube, the ball will transform on entry, and the resulting color must
  // satisfy the standard stacking rule against the current top.
  const effective = shiftedBall(movingBall, to);
  const destTop = state.tubes[to].length > 0
    ? state.tubes[to][state.tubes[to].length - 1]
    : null;
  const isMixer = state.mixers.includes(to);
  const isBlender = state.blenders.includes(to);
  const blendResult = isBlender && destTop !== null
    ? blendedBall(destTop, effective)
    : null;
  const wouldStack = destTop === null
    || destTop === effective
    || destTop === 'J'
    || effective === 'J';

  // BLEND (W8): a recipe pair inside a blender tube consumes the incoming
  // ball and the current top, replacing them with the recipe result.
  if (blendResult) {
    clearViolation();
    const valveStatesBefore = { ...state.valveStates };
    state.tubes[from].pop();
    const consumedTop = state.tubes[to].pop();
    state.tubes[to].push(blendResult);
    state.valveStates = valveApi
      ? valveApi.toggleValvesAfterMove({ valves: state.valves }, state.valveStates, from, requestedTo)
      : state.valveStates;
    state.moveHistory.push({ from, to, original: movingBall, mixed: true, consumedTop, valveStatesBefore });
    state.moveCount++;
    state.selectedTubeIndex = null;
    renderGame(true);
    flashMixedBall(to);
    if (checkWin()) handleWin();
    return;
  }

  // MIX (W7): in a mixer tube, a mismatched non-joker top triggers a mix:
  // the incoming ball is consumed, the top is replaced by a joker. Net ball
  // count -1; tube length unchanged so capacity isn't a barrier here.
  if (isMixer && !wouldStack) {
    clearViolation();
    const valveStatesBefore = { ...state.valveStates };
    state.tubes[from].pop();
    const consumedTop = state.tubes[to].pop();
    state.tubes[to].push('J');
    state.valveStates = valveApi
      ? valveApi.toggleValvesAfterMove({ valves: state.valves }, state.valveStates, from, requestedTo)
      : state.valveStates;
    state.moveHistory.push({ from, to, original: movingBall, mixed: true, consumedTop, valveStatesBefore });
    state.moveCount++;
    state.selectedTubeIndex = null;
    renderGame(true);
    // Visual feedback: flash the newly-formed joker so the transformation
    // is unmistakable. Animation defined in CSS; class auto-removed.
    flashMixedBall(to);
    if (checkWin()) handleWin();
    return;
  }

  // Normal placement requires both capacity AND a legal stack.
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
  const valveStatesBefore = { ...state.valveStates };
  state.tubes[from].pop();
  state.tubes[to].push(effective);
  state.valveStates = valveApi
    ? valveApi.toggleValvesAfterMove({ valves: state.valves }, state.valveStates, from, requestedTo)
    : state.valveStates;
  state.moveHistory.push({ from, to, original: movingBall, valveStatesBefore });
  state.moveCount++;
  state.selectedTubeIndex = null;
  renderGame(true);
  if (checkWin()) handleWin();
}

function checkWin() {
  for (let i = 0; i < state.tubes.length; i++) {
    const a = state.tubes[i], b = state.target[i];
    if (a.length !== b.length) return false;
    for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return false;
  }
  return true;
}

function undo() {
  if (state.moveHistory.length === 0) return;
  if (isDailyNoUndo()) return;
  state.undoCount++;
  const m = state.moveHistory.pop();
  if (m.mixed) {
    // Undo a mix: remove the J, restore the consumed top to the dest,
    // restore the original incoming ball to the source.
    state.tubes[m.to].pop();
    state.tubes[m.to].push(m.consumedTop);
    state.tubes[m.from].push(m.original);
  } else {
    // Pop the post-shift ball off the destination; restore the original
    // pre-shift color to the source. Pre-W6 entries lack `original` — fall
    // back to the popped ball in that case.
    const popped = state.tubes[m.to].pop();
    state.tubes[m.from].push(m.original !== undefined ? m.original : popped);
  }
  if (m.valveStatesBefore) state.valveStates = { ...m.valveStatesBefore };
  state.moveCount = Math.max(0, state.moveCount - 1);
  state.selectedTubeIndex = null;
  renderGame(true);
}

function resetLevel() {
  if (state.mode === 'solo') startSoloLevel(state.currentWorld, state.currentLevel);
  if (state.mode === 'daily') startDailyChallenge();
}

function handleWin() {
  if (state.mode === 'solo' || state.mode === 'daily') setTimeout(showSoloWin, 350);
  else handleTASolve();
}

function showSoloWin() {
  const world = getCurrentWorld();
  const level = world.levels[state.currentLevel];
  const stars = computeStars(state.moveCount, level.optimalMoves);
  const contractApi = getContractApi();
  const dailyApi = getDailyApi();
  const isDaily = state.mode === 'daily';
  const previous = isDaily ? null : getLevelRecord(state.currentWorld, state.currentLevel);
  const earnedContracts = contractApi
    ? contractApi.evaluateContracts({
      moves: state.moveCount,
      undoCount: state.undoCount,
      violationCount: state.violationCount
    }, level)
    : {};
  const allContracts = contractApi
    ? contractApi.mergeContracts(previous && previous.contracts, earnedContracts)
    : earnedContracts;
  const modifierPassed = isDaily && dailyApi
    ? dailyApi.evaluateDailyModifier(state.dailyChallenge, {
      moves: state.moveCount,
      undoCount: state.undoCount,
      violationCount: state.violationCount
    })
    : false;
  if (isDaily) recordDailyResult(state.dailyChallenge, state.moveCount, stars, modifierPassed);
  else recordResult(state.currentWorld, state.currentLevel, state.moveCount, stars, earnedContracts);
  el.winMoves.textContent = state.moveCount;
  el.winOptimal.textContent = level.optimalMoves;
  el.winStars.innerHTML = renderStarsRow(stars, 3, false);
  renderWinContracts(earnedContracts, allContracts);
  const extra = Math.max(0, state.moveCount - level.optimalMoves);
  const step = Math.max(1, Math.ceil(level.optimalMoves / 6));
  const grace = Math.ceil(step / 2);
  if (isDaily) {
    const modifier = state.dailyChallenge.modifier;
    el.winStarHint.textContent = modifierPassed
      ? `הניסוי היומי הושלם: ${modifier.icon} ${modifier.label}.`
      : `פתרת את החידה. כלל הניסוי "${modifier.label}" עוד מחכה לריצה נקייה יותר.`;
  } else if (stars === 3) {
    el.winStarHint.textContent = '3 כוכבים: נכנסת לטווח האופטימלי.';
  } else {
    el.winStarHint.textContent =
      `קיבלת ${formatStars(stars)} כוכבים. צריך ${Math.max(0, extra - grace)} פחות מהלכים ל-3 כוכבים.`;
  }
  triggerCelebration();
  const isLastInWorld = state.currentLevel >= world.levels.length - 1;
  el.nextBtn.classList.toggle('hidden', isDaily || isLastInWorld);
  el.winOverlay.classList.remove('hidden');
  if (!isDaily && isLastInWorld) {
    const visible = visibleWorlds();
    const isLastWorld = world.id === visible[visible.length - 1].id;
    const totalLevels = visible.reduce((sum, w) => sum + w.levels.length, 0);
    el.completeTitle.textContent = isLastWorld
      ? `🏆 סיימת את כל המשחק!`
      : `🏆 סיימת את "${world.name}"!`;
    el.completeBody.textContent = isLastWorld
      ? `כל ${totalLevels} השלבים מאחוריך. כל הכבוד!`
      : `עולם ${world.icon} ${world.name} הושלם. עוד עולמות מחכים.`;
    setTimeout(() => {
      el.winOverlay.classList.add('hidden');
      el.completeOverlay.classList.remove('hidden');
    }, 2200);
  }
}

function renderWinContracts(earnedContracts, allContracts) {
  const contractApi = getContractApi();
  if (!contractApi || !el.winContracts) {
    if (el.winContracts) el.winContracts.innerHTML = '';
    return;
  }
  el.winContracts.innerHTML = contractApi.CONTRACT_DEFS.map((contract) => {
    const earnedNow = !!earnedContracts[contract.id];
    const alreadyBanked = !earnedNow && !!allContracts[contract.id];
    const cls = earnedNow ? 'earned' : alreadyBanked ? 'banked' : 'missed';
    const title = alreadyBanked ? `${contract.description} כבר הושלם בעבר.` : contract.description;
    return `
      <span class="contract-stamp ${cls}" title="${title}">
        <span class="contract-icon">${contract.icon}</span>
        <span>${contract.label}</span>
      </span>
    `;
  }).join('');
}

function nextLevel() {
  el.winOverlay.classList.add('hidden');
  startSoloLevel(state.currentWorld, state.currentLevel + 1);
}

function backToSelect() {
  el.winOverlay.classList.add('hidden');
  el.completeOverlay.classList.add('hidden');
  stopTATimer();
  showScreen('select');
}

/* =====================================================================
   TIME ATTACK
   ===================================================================== */

function startTimeAttack() {
  state.mode = 'ta';
  state.taSolved = 0;
  state.taTimeLeft = TIME_ATTACK_DURATION_SEC;
  state.taLevelQueue = shuffle([...TIME_ATTACK_POOL]);
  showScreen('game');
  showModeUI();
  loadNextTALevel();
  startTATimer();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadNextTALevel() {
  if (state.taLevelQueue.length === 0) state.taLevelQueue = shuffle([...TIME_ATTACK_POOL]);
  loadLevelData(state.taLevelQueue.shift());
  renderGame();
}

function startTATimer() {
  stopTATimer();
  updateTATimeDisplay();
  state.taTimerId = setInterval(() => {
    state.taTimeLeft--;
    updateTATimeDisplay();
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
}

function handleTASolve() {
  state.taSolved++;
  state.taTimeLeft += TIME_ATTACK_BONUS_SEC;
  updateTATimeDisplay();
  el.quickFlash.classList.remove('hidden');
  el.quickFlash.style.animation = 'none';
  void el.quickFlash.offsetWidth;
  el.quickFlash.style.animation = '';
  setTimeout(() => {
    el.quickFlash.classList.add('hidden');
    if (state.mode === 'ta' && state.taTimeLeft > 0) loadNextTALevel();
  }, 500);
}

function endTimeAttack() {
  stopTATimer();
  const prev = getTABest();
  const isNewBest = state.taSolved > prev;
  if (isNewBest) setTABest(state.taSolved);
  el.taResultSolved.textContent = state.taSolved;
  el.taResultNewBest.classList.toggle('hidden', !isNewBest);
  el.taResultPrev.textContent = prev || '—';
  el.taResultOverlay.classList.remove('hidden');
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
   RENDER (capacity-aware)
   ===================================================================== */

function renderTube(tube, index, isTarget, capacity) {
  const tubeEl = document.createElement('div');
  tubeEl.className = isTarget ? 'tube target-tube' : 'tube game';
  tubeEl.style.setProperty('--cap', capacity);
  const color = state.tubeColors[index];
  if (color) tubeEl.classList.add(`color-${color}`);
  const isShift = state.shifts.includes(index);
  if (isShift) tubeEl.classList.add('shift');
  const isShiftBack = state.shiftsBack.includes(index);
  if (isShiftBack) tubeEl.classList.add('shift-back');
  const isMixer = state.mixers.includes(index);
  if (isMixer) tubeEl.classList.add('mixer');
  const isBlender = state.blenders.includes(index);
  if (isBlender) tubeEl.classList.add('blender');
  const valveApi = getValveApi();
  const valveMode = valveApi ? valveApi.valveModeForTube({ valves: state.valves }, state.valveStates, index) : null;
  if (valveMode) tubeEl.classList.add(`valve-${valveMode}`);
  const portalApi = getPortalApi();
  const isPortal = portalApi ? portalApi.isPortalTube({ portals: state.portals }, index) : false;
  if (isPortal) tubeEl.classList.add('portal');
  if (!isTarget) {
    if (state.selectedTubeIndex === index) tubeEl.classList.add('selected');
    const badgeStrip = document.createElement('div');
    badgeStrip.className = 'tube-badges';
    const lock = tubeLockInfo(index);
    if (lock.locked) {
      tubeEl.classList.add('locked');
      const badge = document.createElement('div');
      badge.className = 'lock-badge';
      badge.textContent = `🔒${lock.remaining}`;
      badge.title = `נפתחת בעוד ${lock.remaining} מהלכים`;
      badgeStrip.appendChild(badge);
    }
    if (isShift) {
      const badge = document.createElement('div');
      badge.className = 'shift-badge';
      badge.textContent = '🔄';
      badge.title = 'שיפט צבע קדימה';
      badgeStrip.appendChild(badge);
    }
    if (isShiftBack) {
      const badge = document.createElement('div');
      badge.className = 'shift-badge shift-back-badge';
      badge.textContent = '🔃';
      badge.title = 'שיפט צבע אחורה';
      badgeStrip.appendChild(badge);
    }
    if (isMixer) {
      const badge = document.createElement('div');
      badge.className = 'mixer-badge';
      badge.textContent = '🧪';
      badge.title = 'מערבל';
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
    if (isPortal) {
      const badge = document.createElement('div');
      badge.className = 'portal-badge';
      badge.textContent = '↔';
      badge.title = `פורטל ${portalApi.portalLabel({ portals: state.portals }, index)}`;
      badgeStrip.appendChild(badge);
    }
    if (badgeStrip.children.length > 0) tubeEl.appendChild(badgeStrip);
    tubeEl.addEventListener('click', () => onTubeTap(index));
  }
  tube.forEach((color, ballIndex) => {
    const ball = document.createElement('div');
    ball.className = `ball ball-${color}`;
    if (!isTarget && state.selectedTubeIndex === index && ballIndex === tube.length - 1) {
      ball.classList.add('lifted');
    }
    tubeEl.appendChild(ball);
  });
  return tubeEl;
}

function renderRuleCard() {
  const rules = getRuleSummary();
  if (rules.length === 0 || (state.mode !== 'solo' && state.mode !== 'daily')) {
    el.ruleCard.classList.add('hidden');
    el.ruleCard.textContent = '';
    return;
  }
  el.ruleCard.classList.remove('hidden');
  el.ruleCard.innerHTML = `<span class="rule-icon">ⓘ</span><span>${rules.join(' ')}</span>`;
}

function renderGame(suppressOpenAnim = false) {
  if (state.mode === 'solo' || state.mode === 'daily') {
    const world = getCurrentWorld();
    el.worldName.textContent = state.mode === 'daily'
      ? '🗓 ניסוי יומי'
      : world ? `${world.icon} ${world.name}` : '—';
    el.levelNumber.textContent = state.mode === 'daily' ? 'יומי' : state.currentLevel + 1;
    el.moves.textContent = state.moveCount;
  }
  document.body.classList.toggle('no-open-anim', suppressOpenAnim);
  el.targetSection.classList.toggle('large-target', state.target.length >= 6);
  el.targetTubes.innerHTML = '';
  state.target.forEach((tube, i) =>
    el.targetTubes.appendChild(renderTube(tube, i, true, state.capacities[i])));
  renderRuleCard();
  el.gameTubes.innerHTML = '';
  state.tubes.forEach((tube, i) =>
    el.gameTubes.appendChild(renderTube(tube, i, false, state.capacities[i])));
  el.undoBtn.disabled = state.moveHistory.length === 0 || isDailyNoUndo();
}

function isDailyNoUndo() {
  return state.mode === 'daily'
    && state.dailyChallenge
    && state.dailyChallenge.modifier.id === 'noUndo';
}

/* =====================================================================
   CELEBRATION
   ===================================================================== */

function triggerCelebration() {
  if (document.body.classList.contains('reduce-anim')) return;
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
el.settingsOverlay.addEventListener('click', (e) => {
  if (e.target === el.settingsOverlay) closeSettings();
});
el.themeButtons.forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.themeValue));
});
el.reduceAnimToggle.addEventListener('change', (e) => applyReduceAnim(e.target.checked));

el.backBtn.addEventListener('click', backToSelect);
el.taBackBtn.addEventListener('click', () => {
  stopTATimer();
  showScreen('select');
});
el.undoBtn.addEventListener('click', undo);
el.resetBtn.addEventListener('click', resetLevel);
el.nextBtn.addEventListener('click', nextLevel);
el.backToSelectBtn.addEventListener('click', backToSelect);
el.completeBackBtn.addEventListener('click', backToSelect);

el.timeAttackBtn.addEventListener('click', startTimeAttack);
el.dailyBtn.addEventListener('click', startDailyChallenge);
el.taResultBackBtn.addEventListener('click', exitTimeAttack);
el.taResultRetryBtn.addEventListener('click', retryTimeAttack);

el.resetProgressBtn.addEventListener('click', () => {
  if (confirm('לאפס את כל ההתקדמות? פעולה זו לא ניתנת לביטול.')) {
    progress = {};
    saveProgress();
    saveDailyResults({});
    setTABest(0);
    renderLevelSelect();
  }
});

/* =====================================================================
   INIT
   ===================================================================== */

initSettings();
loadProgress();
showScreen('select');
