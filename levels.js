// =====================================================================
// LEVELS — organized into WORLDS
//
// Each level:
//   capacities: number[]    per-tube capacity (length === number of tubes)
//   optimalMoves: number    BFS-verified shortest solution
//   initial, target         tube contents bottom-to-top
//
// Star thresholds:
//   3★ = moves ≤ optimalMoves
//   2★ = moves ≤ ⌈optimalMoves × 1.5⌉
//   1★ = solved at all
// =====================================================================

const WORLDS = [
  {
    id: 1,
    name: 'מהדורה ראשונה',
    icon: '🪵',
    description: 'הבסיס — סדר את הכדורים. מבחנות ריקות הן החיץ שלך.',
    unlockStars: 0,
    levels: [
      { capacities: [4,4,4], optimalMoves: 1,
        initial: [['R','R','R'],['G','G','G'],['R']],
        target:  [['R','R','R','R'],['G','G','G'],[]] },
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R'],['G'],['G','R']],
        target:  [['R','R'],['G','G'],[]] },
      { capacities: [4,4,4,4], optimalMoves: 3,
        initial: [['R','G'],['G','R'],['B','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 5,
        initial: [['R','Y'],['G','B'],['B','R'],['Y','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]] },
      { capacities: [4,4,4,4], optimalMoves: 8,
        initial: [['R','G'],['B','G'],['R','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 10,
        initial: [['R','G'],['B','Y'],['Y','R'],['G','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 11,
        initial: [['R','R','B'],['G','B','G'],['R','Y'],['Y','B','G'],['Y']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 12,
        initial: [['R','G','B'],['G','B','R'],['B','R','G'],['G','R','B'],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],[],[]] },
      { capacities: [4,4,4,4], optimalMoves: 13,
        initial: [['R','G','B'],['B','R','G'],['G','B','R'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]] },
      { capacities: [4,4,4,4], optimalMoves: 14,
        initial: [['R','G','R'],['B','R','G'],['G','B','B'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]] },
      // buffer scarcity: the only spare tube holds a single ball — you can
      // park just ONE ball at a time, so the question shifts from "where to
      // move" to "when is a move even allowed".
      { capacities: [4,4,4,4,1], optimalMoves: 18,
        initial: [['B','R','Y'],['G','G','B'],['B','R','Y'],['R','Y','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 17,
        initial: [['R','G','Y'],['B','R','G'],['Y','B'],['G','Y','R'],['B']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 18,
        initial: [['G','Y','G'],['B','R','Y'],['Y','B','R'],['R','G','B'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 24,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[]] }
    ]
  },

  {
    id: 2,
    name: 'מבחנות שבירות',
    icon: '🧪',
    description: 'מבחנות בגדלים שונים. הקטנות לא יכולות להיות חיץ אמיתי.',
    unlockStars: 21, // half of World 1's 42 stars
    levels: [
      // intro: small tube exists, easy unload
      { capacities: [4,4,2], optimalMoves: 1,
        initial: [['R','R','R'],['G','G','G'],['R']],
        target:  [['R','R','R','R'],['G','G','G'],[]] },
      // all small tubes, 2 moves
      { capacities: [3,3,3], optimalMoves: 2,
        initial: [['R','R'],['G'],['G','R']],
        target:  [['R','R','R'],['G','G'],[]] },
      // first time buffer tube has cap 4 but is "small" enough
      { capacities: [4,4,2,4], optimalMoves: 3,
        initial: [['R','G'],['G','R'],['B','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]] },
      // 4 colors, two small buffers
      { capacities: [4,4,2,4,4], optimalMoves: 8,
        initial: [['R','G'],['B','Y'],['G'],['Y','R'],['B']],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]] },
      // 3 colors, small empty buffer
      { capacities: [4,4,4,2], optimalMoves: 9,
        initial: [['R','G','B'],['G','B','R'],['B','R','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]] },
      // 4 colors, two tiny tubes
      { capacities: [4,4,2,2,4], optimalMoves: 9,
        initial: [['R','Y','G'],['B','R','B'],['Y'],['G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]] },
      // all medium tubes
      { capacities: [3,3,3,4], optimalMoves: 10,
        initial: [['R','G','B'],['G','B','R'],['B','R','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]] },
      // 4 colors, all small
      { capacities: [3,3,3,3,3], optimalMoves: 12,
        initial: [['R','G','B'],['G','Y','R'],['B','Y'],['Y','R','G'],['B']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      // master: one tall + many short
      { capacities: [4,3,3,3,3], optimalMoves: 19,
        initial: [['R','G','B','Y'],['B','Y','R'],['G','R','B'],['Y','G','R'],[]],
        target:  [['R','R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] }
    ]
  },

  {
    id: 3,
    name: 'כדור הג\'וקר',
    icon: '🌈',
    description: 'כדור-קשת עולה על כל צבע. כל צבע עולה עליו. החיץ הכי גמיש.',
    unlockStars: 18,  // visible world set is W1/W3/W4/W6 only (W2/W5/W7 retired) — ~half of W1's 42
    levels: [
      // intro 1: 1 move — joker on top, move it aside
      { capacities: [4,4,4], optimalMoves: 1,
        initial: [['R','R','J'],['G','G'],[]],
        target:  [['R','R'],['G','G'],['J']] },
      // intro 2: 2 moves — joker as buffer
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R','J'],['G','G','R'],[]],
        target:  [['R','R'],['G','G'],['J']] },
      // 3: joker buried, 2 colors
      { capacities: [4,4,4], optimalMoves: 5,
        initial: [['R','J','G'],['G','R'],[]],
        target:  [['R','R'],['G','G'],['J']] },
      // 4: joker in 3-color puzzle
      { capacities: [4,4,4,4], optimalMoves: 5,
        initial: [['R','G'],['G','J','R'],['B','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['J']] },
      // 5: 2 jokers
      { capacities: [4,4,4,4], optimalMoves: 7,
        initial: [['R','J','G'],['G','J','R'],['B','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['J','J']] },
      // 6 MIDPOINT — the back half opens by re-casting the joker: it is no
      // longer a free buffer but a FOUNDATION that must settle at the bottom
      // under the reds (target ['J','J','R','R']). A joker pinned beneath color
      // can't be borrowed mid-solve, so every move is forced — a single optimal
      // path. This lifts the midpoint above L7 and starts the climb.
      { capacities: [4,4,4,4], optimalMoves: 11,
        initial: [['R','J','B'],['G','J','R'],['B','G'],[]],
        target:  [['J','J','R','R'],['G','G'],['B','B'],[]] },
      // 7: joker + mixed capacities (cross-mechanic taste of World 2)
      { capacities: [4,4,2,4,4], optimalMoves: 11,
        initial: [['R','J','G'],['B','Y'],['J'],['Y','R'],['G','B']],
        target:  [['R','R'],['G','G'],['J','J'],['Y','Y'],['B','B']] },
      // 8: joker-foundation returns at 4 colors — the two jokers must be buried
      // under the reds while R/G/B/Y all sort, so the joker stops being a
      // dumping ground and becomes a scheduled deposit.
      { capacities: [4,4,4,4,4], optimalMoves: 14,
        initial: [['Y','B','J','R'],['G','G','J','R'],['B','Y','B'],['Y','G'],[]],
        target:  [['J','J','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      // 9: tight 3-color, joker-foundation under red, only ONE empty buffer.
      // The space is so constrained that the solution is nearly forced — high
      // uniqueness drives the cognitive load past the L8 peak.
      { capacities: [4,4,4,4], optimalMoves: 15,
        initial: [['B','G','R','J'],['G','R','B','J'],['B','G'],[]],
        target:  [['J','J','R','R'],['G','G','G'],['B','B','B'],[]] },
      // 10: joker-foundation under SCARCE buffer — the only spare tube holds 2
      // balls, so the joker can no longer be parked freely while you stage the
      // colors. Tight space + buried jokers = the hardest planning before L11.
      { capacities: [4,4,4,4,2], optimalMoves: 17,
        initial: [['Y','B','J','R'],['G','Y','J','G'],['B','R','B','G'],['Y'],[]],
        target:  [['J','J','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      // 11 MASTER — cross-mechanic: a color-locked buffer turns the joker into
      // a key. Tube 3 accepts only Blue or a joker, so the single buffer is
      // useless for R/G/Y — the player must spend jokers to park there. Without
      // the lock this solves in 15; the lock forces 5 extra moves of planning.
      { capacities: [4,4,4,4], optimalMoves: 20,
        initial: [['G','R','J'],['R','G','B'],['B','J','R','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B'],['J','J']],
        tubeColors: [null, null, null, 'B'] }
    ]
  },

  {
    id: 4,
    name: 'מבחנות נעולות',
    icon: '🔒',
    description: 'מבחנה נעולה לכמה מהלכים. רואים אותה אבל לא נוגעים — עד שהמספר יורד לאפס.',
    unlockStars: 32,
    // Each level may declare locks:
    //   locks: [{ tubeIndex: i, unlockAt: N }, ...]
    // Tube i is fully blocked (source AND destination) while state.moveCount < N.
    // All optimalMoves below are BFS-verified with the lock constraint active.
    levels: [
      // 1: INTRO — single source-lock, 3 tubes, 2 colors. Teaches "park & wait":
      // the G tube is sealed for the first move, so the spare G has to idle in
      // the empty buffer and only lands home once the lock opens. Gentlest lock.
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R','R','G'],['G'],[]],
        target:  [['R','R'],['G','G'],[]],
        locks:   [{ tubeIndex: 1, unlockAt: 1 }] },
      // 2: single source-lock, gentle 4t/3c
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','G'],['G','R'],['B'],['B']],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 3 }] },
      // 3: lock on a different source, fresh layout
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','B'],['G','R'],['B','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }] },
      // 4: same base — longer lock = bigger penalty if rushed
      { capacities: [4,4,4,4], optimalMoves: 8,
        initial: [['R','B'],['G','R'],['B','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 1, unlockAt: 5 }] },
      // 5: 4 colors enter
      { capacities: [4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G'],['G','R'],['B','Y'],['Y','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 5 }] },
      // 6: cross-mechanic — joker hidden behind a lock
      { capacities: [4,4,4,4], optimalMoves: 9,
        initial: [['R','G'],['G','J','R'],['B','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['J']],
        locks:   [{ tubeIndex: 1, unlockAt: 4 }] },
      // 7: 3 colors, longer puzzle, lock bites
      { capacities: [4,4,4,4], optimalMoves: 11,
        initial: [['R','G','R'],['G','R','G'],['B','B','B'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }] },
      // 8: cross-mechanic — small (cap 2) + joker + lock
      { capacities: [4,4,2,4], optimalMoves: 10,
        initial: [['R','G'],['G','J','R'],['B'],['B']],
        target:  [['R','R'],['G','G'],['J'],['B','B']],
        locks:   [{ tubeIndex: 1, unlockAt: 5 }] },
      // 9 MASTER: two staggered locks on content tubes
      { capacities: [4,4,4,4,4], optimalMoves: 13,
        initial: [['R','G','B'],['G','B','R'],['B','R','G'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 6 }, { tubeIndex: 1, unlockAt: 6 }] },
      // 10 BRIDGE: 4 colors, 6 tubes, single mid lock. Spans the old 13→22
      // cliff so the jump into the master tier is one step, not a wall. Two
      // spare buffers keep it tractable (opt 17) while the lock adds real plan.
      { capacities: [4,4,4,4,4,4], optimalMoves: 17,
        initial: [['Y','R','G'],['G','B','R'],['R','Y','B'],['B','G','Y'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 8 }] },
      // 11: shallow deep-lock, moved early — lowest cognitive load of the back
      // half. One very late lock on a content tube; route around the sealed
      // stack, but the rest is a clean 4x4 sort.
      { capacities: [4,4,4,4,4,4], optimalMoves: 21,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 15 }] },
      // 12 MASTER: 6 tubes, 4 colors, two heavy locks
      { capacities: [4,4,4,4,4,4], optimalMoves: 22,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 6 }, { tubeIndex: 2, unlockAt: 6 }] },
      // 13 — cross-mechanic: joker mix + single deep lock (23 moves). Deeper
      // lock than the W3 joker levels — the buffer is sealed long enough that
      // the jokers must be parked and re-fetched.
      { capacities: [4,4,4,4,4], optimalMoves: 23,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','J'],['J','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],['J','J']],
        locks:   [{ tubeIndex: 4, unlockAt: 7 }] },
      // 14 — 6-tube 4-color with mid-deep lock (23 moves)
      { capacities: [4,4,4,4,4,4], optimalMoves: 23,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 5, unlockAt: 8 }] },
      // 15 MASTER: 4 colors, two deep staggered locks. Highest non-boss
      // cognitive load — both content tubes are frozen well into the solve, so
      // the whole opening must be planned around two moving deadlines (24 moves).
      { capacities: [4,4,4,4,4], optimalMoves: 24,
        initial: [['R','G','Y'],['B','R','G'],['Y','B'],['G','Y','R'],['B']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 6 }, { tubeIndex: 1, unlockAt: 9 }] },
      // 16 — cross-mechanic in a back slot: joker mix + deep lock (26 moves)
      { capacities: [4,4,4,4,4], optimalMoves: 26,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','J'],['J','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],['J','J']],
        locks:   [{ tubeIndex: 4, unlockAt: 10 }] },
      // 17 MONSTER FINAL — cross-mechanic: deep lock + a small (cap 2) buffer.
      // tube0 is frozen for 11 moves while the only roomy buffer is tube3; the
      // cap-2 tube4 cannot absorb a 3-stack, so the player must juggle staging
      // tightly. Same puzzle with a cap-4 buffer solves in 22 — the small tube
      // adds 5 real moves of planning. BFS-verified.
      { capacities: [4,4,4,4,2], optimalMoves: 27,
        initial: [['Y','R','B','G'],['G','B','R','Y'],['B','G','Y','R'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 11 }] }
    ]
  },

  {
    id: 5,
    name: 'מבחנות צבעוניות',
    icon: '🎯',
    description: 'מבחנה צבעונית מקבלת רק כדורים בצבע שלה. ג\'וקר נכנס לכל מבחנה.',
    unlockStars: 65,
    // Each level may declare:
    //   tubeColors: [null, 'R', null, 'G', ...]
    //     null = agnostic (normal). Letter = accepts only that color (or 'J').
    // Initial AND target contents in a color-locked tube must match its color
    // (or be a joker). All optimalMoves are BFS-verified.
    levels: [
      // 1: intro — one R-locked tube, mixed source, learn the rim
      { capacities: [4,4,4], optimalMoves: 4,
        initial: [['R','G','R'],[],[]],
        target:  [['G'],['R','R'],[]],
        tubeColors: [null, 'R', null] },
      // 2: two locks (R + G), single source
      { capacities: [4,4,4], optimalMoves: 4,
        initial: [['R','G','R','G'],[],[]],
        target:  [[],['R','R'],['G','G']],
        tubeColors: [null, 'R', 'G'] },
      // 3: locked tubes pre-filled with matching color
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['G','R','G','R'],['R'],['G'],[]],
        target:  [[],['R','R','R'],['G','G','G'],[]],
        tubeColors: [null, 'R', 'G', null] },
      // 4: joker enters a locked tube as wildcard
      { capacities: [4,4,4,4], optimalMoves: 5,
        initial: [['R','J','G','B'],[],[],[]],
        target:  [[],['R','J'],['G'],['B']],
        tubeColors: [null, 'R', 'G', 'B'] },
      // 5: 3 colors, single source, 3 locks
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','G','B','G','R','B'],[],[],[]],
        target:  [[],['R','R'],['G','G'],['B','B']],
        tubeColors: [null, 'R', 'G', 'B'] },
      // 6: 3 colors with 2 sources (split routing)
      { capacities: [4,4,4,4,4], optimalMoves: 6,
        initial: [['R','G','B'],['B','G','R'],[],[],[]],
        target:  [[],[],['R','R'],['G','G'],['B','B']],
        tubeColors: [null, null, 'R', 'G', 'B'] },
      // 7: joker pre-mixed inside a locked tube
      { capacities: [4,4,4,4,4], optimalMoves: 6,
        initial: [['G','R','B'],['R','J'],['G','J'],['B'],[]],
        target:  [[],['R','R','J'],['G','G','J'],['B','B'],[]],
        tubeColors: [null, 'R', 'G', 'B', null] },
      // 8: cross-mechanic — small (cap 2) agnostic buffer
      { capacities: [4,4,4,4,2], optimalMoves: 7,
        initial: [['R','G','R','G'],['G','B','R'],[],[],[]],
        target:  [[],[],['R','R','R'],['G','G','G'],['B']],
        tubeColors: [null, null, 'R', 'G', null] },
      // 9: 4 colors, 2 sources, 4 locked targets
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G','B','Y'],['Y','B','G','R'],[],[],[],[]],
        target:  [[],[],['R','R'],['G','G'],['B','B'],['Y','Y']],
        tubeColors: [null, null, 'R', 'G', 'B', 'Y'] },
      // 10 MASTER: 4-color sort (same shape, longer base)
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G','B','Y'],['Y','B','G','R'],[],[],[],[]],
        target:  [[],[],['R','R'],['G','G'],['B','B'],['Y','Y']],
        tubeColors: [null, null, 'R', 'G', 'B', 'Y'] },
      // 11 MASTER: pre-filled locks + agnostic sources, 4 colors
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['Y','B','G','R'],['R','G','B','Y'],['R'],['G'],['B'],['Y']],
        target:  [[],[],['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y']],
        tubeColors: [null, null, 'R', 'G', 'B', 'Y'] },
      // 12 MASTER FINAL: 4 locked + 2 jokers riding the mechanic
      { capacities: [4,4,4,4,4,4], optimalMoves: 9,
        initial: [['R','J','G','B'],['Y','G','J','R'],[],[],[],[]],
        target:  [[],[],['R','R','J'],['G','G','J'],['B'],['Y']],
        tubeColors: [null, null, 'R', 'G', 'B', 'Y'] }
    ]
  },

  {
    id: 6,
    name: 'מבחנות שיפט',
    icon: '🔄',
    description: 'מבחנת שיפט הופכת כל כדור שנכנס לצבע הבא במחזור: R→G→B→Y→R. ג\'וקר נשאר ג\'וקר.',
    unlockStars: 56,
    // Each level may declare:
    //   shifts:     [tubeIndex, ...]  forward cycle  R→G→B→Y→R on entry
    //   shiftsBack: [tubeIndex, ...]  reverse cycle  R→Y→B→G→R on entry
    //     Joker is immune to both (stays J). Stored color is post-shift. A tube
    //     is at most one of the two. Forward +1 and reverse −1 turn the world
    //     into modular arithmetic: a target two steps away (an opposite color,
    //     e.g. R→B) costs two passes EITHER way but through a DIFFERENT
    //     intermediate (R→G→B vs R→Y→B), so the route you pick decides which
    //     colour competes for the buffer. Re-entering one shift tube ("ping-
    //     pong") is how a single ball climbs multiple steps.
    // All optimalMoves are BFS-verified (node scripts/difficulty.js → ✓ match).
    levels: [
      // ---- First half: short, dense, one new idea each ------------------
      // 1: forward shift +1 — three R's enter, become three G's
      { capacities: [4,4,4], optimalMoves: 3,
        initial: [['R','R','R'],[],[]],
        target:  [[],[],['G','G','G']],
        shifts:  [2] },
      // 2: joker is immune — it passes through the shift unchanged
      { capacities: [4,4,4], optimalMoves: 3,
        initial: [['R','J','R'],[],[]],
        target:  [[],[],['G','J','G']],
        shifts:  [2] },
      // 3: two shift tubes chain — R becomes G in tube 2, then those G's must
      //    ride on to become B in tube 3 (each destination adds one step)
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['G','G','R','R'],[],[],[]],
        target:  [[],[],['G','G'],['B','B']],
        shifts:  [2,3] },
      // 4: choose the route — shift some, keep some. Tube 1 is a plain buffer
      //    (R stays R); tube 3 shifts (R→G). One source, two fates.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','R','R','R'],[],[],[]],
        target:  [[],['R','R'],[],['G','G']],
        shifts:  [3] },
      // 5: first ping-pong — R→B is two passes through ONE shift tube, so each
      //    ball must leave to a buffer and re-enter. Two balls share the buffer.
      { capacities: [4,4,4], optimalMoves: 6,
        initial: [['R','R'],[],[]],
        target:  [[],[],['B','B']],
        shifts:  [2] },
      // ---- Midpoint + back half: routing + multi-pass, tight buffers -----
      // 6 (midpoint): reverse shift arrives. Two R's take ONE reverse pass each
      //    to Y (tube 1), while one R still needs two forward passes to B —
      //    contrasting the two directions lifts the floor above L5.
      { capacities: [4,4,4,4], optimalMoves: 7,
        initial: [['R','R','R'],[],[],[]],
        target:  [[],['Y','Y'],[],['B']],
        shifts:     [3],
        shiftsBack: [2] },
      // 7: cross-mechanic — the forward shift tube (tube 2) holds only 2, with a
      //    reverse tube beside it. Each R→B is two passes, but the cap-2 tube
      //    can't stockpile its own output, so it must be drained between passes:
      //    ping-pong meets a starved buffer, with a backward route also open.
      { capacities: [4,4,2,4], optimalMoves: 8,
        initial: [['R','R'],[],[],[]],
        target:  [[],[],[],['B','B']],
        shifts:     [2],
        shiftsBack: [1] },
      // 8: routing fork — three G's each climb two steps to Y, via forward
      //    (G→B→Y, tube 2) or reverse (G→R→Y, tube 1). One plain buffer makes
      //    the intermediates queue, so the cheaper route depends on what's parked.
      { capacities: [4,4,4,4], optimalMoves: 9,
        initial: [['G','G','G'],[],[],[]],
        target:  [[],[],['Y','Y','Y'],[]],
        shifts:     [2],
        shiftsBack: [1] },
      // 9: the same fork, scaled — four Y's must each become G (Y→R→G forward or
      //    Y→B→G reverse). More balls share the one buffer, so the order of
      //    conversions, not just the route, starts to matter.
      { capacities: [4,4,4,4], optimalMoves: 12,
        initial: [['Y','Y','Y','Y'],[],[],[]],
        target:  [[],[],['G','G','G','G'],[]],
        shifts:     [2],
        shiftsBack: [1] },
      // 10: four B's to R (B→Y→R forward or B→G→R reverse) on a wider but busier
      //     bench — every parked colour is a fork in the route, exploding the
      //     branching even though the climb is still two passes each.
      { capacities: [4,4,4,4,4], optimalMoves: 12,
        initial: [['B','B','B','B'],[],[],[],[]],
        target:  [[],[],['R','R','R','R'],[],[]],
        shifts:     [2],
        shiftsBack: [1] },
      // 11 MASTER — five R's to B, a full conversion pipeline. Forward and
      //     reverse stay open, the buffers are scarce relative to the volume, and
      //     finished B's compete with raw R's and half-cycled intermediates.
      { capacities: [6,4,5,4], optimalMoves: 15,
        initial: [['R','R','R','R','R'],[],[],[]],
        target:  [[],[],['B','B','B','B','B'],[]],
        shifts:     [2],
        shiftsBack: [1] },
      // 12 MASTER FINAL — ping-pong endurance. Every ball must become B in one
      //    shift tube: R needs 2 passes (R→G→B), Y needs 3 (Y→R→G→B). The
      //    interleaved Y,R,Y,R source forces careful buffer ordering.
      { capacities: [4,4,4,4,4], optimalMoves: 16,
        initial: [['Y','R','Y','R'],[],[],[],[]],
        target:  [[],[],['B','B','B','B'],[],[]],
        shifts:  [2] }
    ]
  },

  {
    id: 7,
    name: 'מבחנות מערבבות',
    icon: '🧪',
    description: 'מבחנה מערבבת ממזגת שני צבעים שונים לג\'וקר. כל ערבוב מאבד כדור אחד. הג\'וקר לא מתערבב.',
    unlockStars: 105,
    // Each level may declare:
    //   mixers: [tubeIndex, ...]
    //     Listed tubes mix: if incoming ball X meets top Y (Y != X, both non-J),
    //     Y is replaced by 'J' and X is consumed. Net -1 ball, +1 joker.
    //     Joker incoming or top-J → normal stacking (wildcard).
    // All optimalMoves are BFS-verified.
    levels: [
      // 1: single mix intro
      { capacities: [4,4], optimalMoves: 1,
        initial: [['R'],['G']],
        target:  [[],['J']],
        mixers:  [1] },
      // 2: any two different colors mix the same way
      { capacities: [4,4], optimalMoves: 1,
        initial: [['B'],['Y']],
        target:  [[],['J']],
        mixers:  [1] },
      // 3: place first then mix
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R','G'],[],[]],
        target:  [[],[],['J']],
        mixers:  [2] },
      // 4: joker stacks (doesn't mix) — pedagogy
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['J','R'],['G'],[]],
        target:  [['J'],[],['J']],
        mixers:  [2] },
      // 5: mix to unblock a stack
      { capacities: [4,4,4,4], optimalMoves: 2,
        initial: [['R','R','G'],['B'],[],[]],
        target:  [['R','R'],[],['J'],[]],
        mixers:  [2] },
      // 6: two mixes via 2 mixer tubes
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','G','R','G'],[],[],[]],
        target:  [[],[],['J'],['J']],
        mixers:  [2,3] },
      // 7: 4 colors → 2 J's
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','G','B','Y'],[],[],[]],
        target:  [[],['J'],['J'],[]],
        mixers:  [1,2] },
      // 8: preserve initial J alongside new J
      { capacities: [4,4,4], optimalMoves: 4,
        initial: [['R','J','G'],[],[]],
        target:  [['J'],[],['J']],
        mixers:  [2] },
      // 9: extract-rebuild — 2 J's in one mixer via wildcard-stack trick
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','G','R','G'],[],[],[]],
        target:  [[],[],['J','J'],[]],
        mixers:  [2] },
      // 10 MASTER — 4 J's spread across 2 mixers (4-color source pair)
      { capacities: [4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G','B','Y'],['G','R','B','Y'],[],[],[]],
        target:  [[],[],['J','J'],['J','J'],[]],
        mixers:  [2,3] },
      // 11 MASTER — small (cap 2) mixer cross-mechanic
      { capacities: [4,4,2,4,4], optimalMoves: 8,
        initial: [['R','G','B','Y'],['Y','B','G','R'],[],[],[]],
        target:  [[],[],['J','J'],[],['J','J']],
        mixers:  [2,4] },
      // 12 MASTER FINAL — all 4 J's stacked in a single mixer
      { capacities: [4,4,4,4], optimalMoves: 8,
        initial: [['R','G','B','Y'],['Y','B','G','R'],[],[]],
        target:  [[],[],['J','J','J','J'],[]],
        mixers:  [2] }
    ]
  },

  {
    id: 8,
    name: 'מעבדת הפיגמנטים',
    icon: '⚗️',
    description: 'מבחנות ערבוב יוצרות צבעים חדשים: כחול+צהוב=ירוק, אדום+כחול=סגול, ירוק+אדום=שחור.',
    unlockStars: 86,
    // Each level may declare:
    //   blenders: [tubeIndex, ...]
    // A blender tube combines a recipe pair on contact. The incoming ball and
    // the current top are consumed, and the recipe result remains in the tube.
    // Recipes live in pigment-mixing.js so game logic and tests share them.
    levels: [
      // 1: intro — there is no green; make it from blue + yellow.
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['B'],['Y'],[]],
        target:  [[],[],['G']],
        blenders: [2] },
      // 2: bridge — make two greens in two separate blenders.
      //    A gentle step up from the single mix before the interleaved stacks.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['B','B'],['Y','Y'],[],[]],
        target:  [[],[],['G'],['G']],
        blenders: [2,3] },
      // 3: three greens, with ingredients interleaved across two stacks.
      { capacities: [4,4,4,4], optimalMoves: 9,
        initial: [['B','Y','B'],['Y','B','Y'],[],[]],
        target:  [[],[],[],['G','G','G']],
        blenders: [2] },
      // 4: three products, and the B ingredients must be spent in the right order.
      { capacities: [4,4,4,4,4], optimalMoves: 8,
        initial: [['R','B','Y'],['B','Y'],['B'],[],[]],
        target:  [[],[],[],['G','G'],['P']],
        blenders: [2] },
      // 5: first chain recipe (black = green + red), plus a green to preserve.
      { capacities: [4,4,4,4,4], optimalMoves: 7,
        initial: [['B','Y','B'],['Y','R'],[],[],[]],
        target:  [[],[],[],['K'],['G']],
        blenders: [2] },
      // 6 (midpoint): one of each product (K, G, P) through a briefly-locked
      //   lab. Exactly enough balls — a wrong blend strands an ingredient — so
      //   the order must be partly staged before the lab opens. Step up from L5.
      { capacities: [4,4,4,4,4,4], optimalMoves: 12,
        initial: [['B','R','Y'],['Y','R','B'],['B'],[],[],[]],
        target:  [[],[],[],['K'],['G'],['P']],
        blenders: [3],
        locks: [{ tubeIndex: 3, unlockAt: 3 }] },
      // 7: a greens-only breather with a different shape — the tight (cap-2)
      //   blender, where four greens must exit cleanly into two stacks.
      { capacities: [4,4,2,4,4,4], optimalMoves: 12,
        initial: [['B','Y','B','Y'],['Y','B','Y','B'],[],[],[],[]],
        target:  [[],[],[],['G','G'],['G','G'],[]],
        blenders: [2] },
      // 8: the chain finale begins — black + two greens + purple, fed by one
      //   delayed lab. Ingredients are exact, so every green built for the black
      //   must come from scratch and no ball can be wasted.
      { capacities: [4,4,4,4,4,4], optimalMoves: 16,
        initial: [['B','Y','B','R'],['Y','B','R'],['B','Y'],[],[],[]],
        target:  [[],[],[],['K'],['G','G'],['P']],
        blenders: [3],
        locks: [{ tubeIndex: 3, unlockAt: 4 }] },
      // 9: two blacks now — each needs its own green intermediate, deep-chained
      //   through the single late-opening lab. Exactly enough of every colour.
      { capacities: [4,4,4,4,4,4], optimalMoves: 18,
        initial: [['B','Y','R','B'],['Y','R','B'],['R','Y','B'],[],[],[]],
        target:  [[],[],[],['K','K'],['G'],['P']],
        blenders: [3],
        locks: [{ tubeIndex: 3, unlockAt: 4 }] },
      // 10 MASTER: the full order — two blacks, two greens and a purple — staged
      //   against a delayed lab with the source tubes packed solid.
      { capacities: [4,4,4,4,4,4], optimalMoves: 21,
        initial: [['B','Y','R','B'],['Y','R','B','Y'],['R','Y','B','B'],[],[],[]],
        target:  [[],[],[],['K','K'],['G','G'],['P']],
        blenders: [3],
        locks: [{ tubeIndex: 3, unlockAt: 4 }] },
      // 11 MASTER FINAL: the same full order, but the ingredients are buried
      //   deeper, the lab opens even later, and the purple destination is
      //   colour-locked — every black is a from-scratch chain with no slack.
      { capacities: [4,4,4,4,4,4], optimalMoves: 23,
        initial: [['B','R','Y','B'],['R','Y','B','Y'],['Y','R','B','B'],[],[],[]],
        target:  [[],[],[],['K','K'],['G','G'],['P']],
        blenders: [3],
        locks: [{ tubeIndex: 3, unlockAt: 6 }],
        tubeColors: [null, null, null, null, null, 'P'] }
    ]
  }
];

/**
 * Star score in HALVES: returns 1.0, 1.5, 2.0, 2.5, or 3.0.
 *
 * Quarter-star granularity was visually indistinguishable (a 25% clip is on
 * the tapered tip of the star). Half-stars read at a glance.
 *
 * To avoid penalizing every small slip, 3★ has a grace zone of ⌈step/2⌉
 * extra moves — a single mistake on a short puzzle still earns 3★.
 * step scales with difficulty so harder puzzles have a wider tolerance.
 */
function computeStars(moves, optimalMoves) {
  const extra = Math.max(0, moves - optimalMoves);
  const step = Math.max(1, Math.ceil(optimalMoves / 6));
  const grace = Math.ceil(step / 2);
  if (extra <= grace)     return 3;
  if (extra <= step * 2)  return 2.5;
  if (extra <= step * 4)  return 2;
  if (extra <= step * 6)  return 1.5;
  return 1;
}

// Time Attack pool — only World 1's fast levels.
// World 2's mixed-capacity mechanic doesn't fit speed mode.
const TIME_ATTACK_POOL = WORLDS[0].levels
  .map((lvl, i) => ({ ...lvl, _worldId: 1, _levelIndex: i }))
  .filter(lvl => lvl.optimalMoves <= 10);

const TIME_ATTACK_DURATION_SEC = 120;
const TIME_ATTACK_BONUS_SEC = 5;
