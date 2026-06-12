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
      { capacities: [4,4,4,4,4], optimalMoves: 10,
        initial: [['R','B','G'],['G','R','Y'],['B','Y'],['Y','R','B'],['G']],
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
      { capacities: [4,4,4,4,4], optimalMoves: 15,
        initial: [['Y','R','B'],['G','Y','R'],['B','G'],['R','B','Y'],['G']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 17,
        initial: [['R','G','Y'],['B','R','G'],['Y','B'],['G','Y','R'],['B']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      { capacities: [4,4,4,4,4], optimalMoves: 17,
        initial: [['B','Y','G'],['R','B','Y'],['G','R','B'],['Y','G','R'],[]],
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
      // 6: joker in 4-color, single
      { capacities: [4,4,4,4,4], optimalMoves: 7,
        initial: [['R','Y'],['G','J','B'],['B','R'],['Y','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],['J']] },
      // 7: joker + mixed capacities (cross-mechanic taste of World 2)
      { capacities: [4,4,2,4,4], optimalMoves: 11,
        initial: [['R','J','G'],['B','Y'],['J'],['Y','R'],['G','B']],
        target:  [['R','R'],['G','G'],['J','J'],['Y','Y'],['B','B']] },
      // 8: 2 jokers, 4 colors
      { capacities: [4,4,4,4,4], optimalMoves: 14,
        initial: [['R','J','G'],['B','J','Y'],['Y','R'],['G','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],['J','J']] },
      // 9: tight 3-color with joker buried deep
      { capacities: [4,4,4,4], optimalMoves: 15,
        initial: [['R','G','B'],['B','R','G'],['G','B','J'],['R']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['J']] },
      // 10: master — 4 colors + 2 jokers, heavily mixed
      { capacities: [4,4,4,4,4], optimalMoves: 17,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','J'],['J','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],['J','J']] },
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
      // 1: intro — single source-lock, gentle 4t/3c
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','G'],['G','R'],['B'],['B']],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 3 }] },
      // 2: lock on a different source, fresh layout
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','B'],['G','R'],['B','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }] },
      // 3: same base — longer lock = bigger penalty if rushed
      { capacities: [4,4,4,4], optimalMoves: 8,
        initial: [['R','B'],['G','R'],['B','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 1, unlockAt: 5 }] },
      // 4: 4 colors enter
      { capacities: [4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G'],['G','R'],['B','Y'],['Y','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 5 }] },
      // 5: cross-mechanic — joker hidden behind a lock
      { capacities: [4,4,4,4], optimalMoves: 9,
        initial: [['R','G'],['G','J','R'],['B','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['J']],
        locks:   [{ tubeIndex: 1, unlockAt: 4 }] },
      // 6: 3 colors, longer puzzle, lock bites
      { capacities: [4,4,4,4], optimalMoves: 11,
        initial: [['R','G','R'],['G','R','G'],['B','B','B'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }] },
      // 7: cross-mechanic — small (cap 2) + joker + lock
      { capacities: [4,4,2,4], optimalMoves: 10,
        initial: [['R','G'],['G','J','R'],['B'],['B']],
        target:  [['R','R'],['G','G'],['J'],['B','B']],
        locks:   [{ tubeIndex: 1, unlockAt: 5 }] },
      // 8 MASTER: two staggered locks on content tubes
      { capacities: [4,4,4,4,4], optimalMoves: 13,
        initial: [['R','G','B'],['G','B','R'],['B','R','G'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 6 }, { tubeIndex: 1, unlockAt: 6 }] },
      // 9 MASTER: 4 colors, two locks with different timings
      { capacities: [4,4,4,4,4], optimalMoves: 22,
        initial: [['R','G','Y'],['B','R','G'],['Y','B'],['G','Y','R'],['B']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }, { tubeIndex: 1, unlockAt: 7 }] },
      // 10 MASTER FINAL: 6 tubes, 4 colors, two heavy locks
      { capacities: [4,4,4,4,4,4], optimalMoves: 22,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 6 }, { tubeIndex: 2, unlockAt: 6 }] },
      // 11 — joker mix + single deep lock (22 moves)
      { capacities: [4,4,4,4,4], optimalMoves: 22,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','J'],['J','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],['J','J']],
        locks:   [{ tubeIndex: 4, unlockAt: 6 }] },
      // 12 — 6-tube 4-color with mid-deep lock (23 moves)
      { capacities: [4,4,4,4,4,4], optimalMoves: 23,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 5, unlockAt: 8 }] },
      // 13 — same shape, much deeper lock (24 moves)
      { capacities: [4,4,4,4,4,4], optimalMoves: 24,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','G'],['Y','R','G','B'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 5, unlockAt: 15 }] },
      // 14 — joker mix with deep lock (26 moves)
      { capacities: [4,4,4,4,4], optimalMoves: 26,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','J'],['J','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],['J','J']],
        locks:   [{ tubeIndex: 4, unlockAt: 10 }] },
      // 15 MONSTER FINAL — cross-mechanic: deep lock + a small (cap 2) buffer.
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
    //   shifts: [tubeIndex, ...]
    //     Listed tubes apply the cycle (R→G→B→Y→R) to balls entering them.
    //     Joker is immune (stays J). Stored color in the tube is post-shift.
    // All optimalMoves are BFS-verified.
    levels: [
      // 1: intro — 2 R's enter shift tube, become 2 G's
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R','R'],[],[]],
        target:  [[],[],['G','G']],
        shifts:  [2] },
      // 2: stack on pre-existing post-shift color
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R','R'],[],['G']],
        target:  [[],[],['G','G','G']],
        shifts:  [2] },
      // 3: 3 R's → 3 G's
      { capacities: [4,4,4], optimalMoves: 3,
        initial: [['R','R','R'],[],[]],
        target:  [[],[],['G','G','G']],
        shifts:  [2] },
      // 4: joker passes through unchanged (W3 wildcard rule extended)
      { capacities: [4,4,4], optimalMoves: 3,
        initial: [['R','J','R'],[],[]],
        target:  [[],[],['G','J','G']],
        shifts:  [2] },
      // 5: chain — 2 shift tubes, R→G→B in sequence
      { capacities: [4,4,4,4], optimalMoves: 3,
        initial: [['R','R'],[],[],[]],
        target:  [[],[],['G'],['B']],
        shifts:  [2,3] },
      // 6: distribute — 1 stays R, 1 becomes G, 1 becomes B (via 2 shifts)
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','R','R'],[],[],[]],
        target:  [[],['R'],['G'],['B']],
        shifts:  [2,3] },
      // 7: ping-pong via single shift — convert R to Y by re-entering 3 times
      { capacities: [4,4,4], optimalMoves: 6,
        initial: [['R'],[],[]],
        target:  [[],['Y'],[]],
        shifts:  [2] },
      // 8: cross-mechanic — small (cap 2) shift tube
      { capacities: [4,4,2,4,4], optimalMoves: 6,
        initial: [['R','R','R'],[],[],[],[]],
        target:  [[],[],[],['G','G'],['G']],
        shifts:  [2] },
      // 9 MASTER — 4 colors, 2 sources, 4 dedicated shift tubes
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['Y','B','G','R'],['B','Y','R','G'],[],[],[],[]],
        target:  [[],[],['G','G'],['B','B'],['Y','Y'],['R','R']],
        shifts:  [2,3,4,5] },
      // 10 MASTER — joker sandwiched between R's, must become B's
      { capacities: [4,4,4,4,4], optimalMoves: 9,
        initial: [['R','J','R','J'],[],[],[],[]],
        target:  [[],[],['B','J','B','J'],[],[]],
        shifts:  [2] },
      // 11 MASTER — two shift tubes, color budget forces re-conversion.
      // Only 2 G + 2 B exist, but tube 2 needs B's (from G) and tube 3 needs
      // Y's (from B) — so colors must be cycled THROUGH the shift tubes, not
      // just sorted. The two shift tubes become a conversion pipeline.
      { capacities: [4,4,4,4,4,4], optimalMoves: 13,
        initial: [['R','G','B','Y'],['Y','B','G','R'],[],[],[],[]],
        target:  [[],[],['B','B'],['Y','Y'],['R','R'],['G','G']],
        shifts:  [2,3] },
      // 12 MASTER FINAL — ping-pong endurance. Every ball must become B in
      // one shift tube: R needs 2 passes (R→G→B), Y needs 3 (Y→R→G→B). The
      // interleaved Y,R,Y,R source forces careful buffer ordering.
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
      // 2: three greens, with ingredients interleaved across two stacks.
      { capacities: [4,4,4,4], optimalMoves: 9,
        initial: [['B','Y','B'],['Y','B','Y'],[],[]],
        target:  [[],[],[],['G','G','G']],
        blenders: [2] },
      // 3: three products, and the B ingredients must be spent in the right order.
      { capacities: [4,4,4,4,4], optimalMoves: 8,
        initial: [['R','B','Y'],['B','Y'],['B'],[],[]],
        target:  [[],[],[],['G','G'],['P']],
        blenders: [2] },
      // 4: first chain recipe, plus one green that must be preserved.
      { capacities: [4,4,4,4,4], optimalMoves: 7,
        initial: [['B','Y','B'],['Y','R'],[],[],[]],
        target:  [[],[],[],['K'],['G']],
        blenders: [2] },
      // 5: preserve one green, then make a second green as material for black.
      { capacities: [4,4,4,4,4], optimalMoves: 9,
        initial: [['B','Y','B'],['Y','R','B'],['R'],[],[]],
        target:  [[],[],['K'],['G'],['P']],
        blenders: [2] },
      // 6: small blender — capacity is tight, and three products must exit cleanly.
      { capacities: [4,4,2,4,4], optimalMoves: 9,
        initial: [['B','Y','B'],['Y','B','Y'],[],[],[]],
        target:  [[],[],[],['G','G'],['G']],
        blenders: [2] },
      // 7: products must be routed into color-locked destinations.
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['R','B','Y'],['B','Y'],['B'],[],[],[]],
        target:  [[],[],[],['G'],['P'],['G']],
        blenders: [2],
        tubeColors: [null, null, null, 'G', 'P', 'G'] },
      // 8: delayed lab access. Prepare the order while the blender is closed.
      { capacities: [4,4,4,4,4], optimalMoves: 12,
        initial: [['B','Y','B'],['Y','R','B'],['R'],[],[]],
        target:  [[],[],['K'],['G'],['P']],
        blenders: [2],
        locks: [{ tubeIndex: 2, unlockAt: 4 }] },
      // 9 MASTER: one lab tube, four products, and a chain product.
      { capacities: [4,4,4,4,4,4], optimalMoves: 13,
        initial: [['B','Y','B','R'],['Y','B','R'],['B','Y'],[],[],[]],
        target:  [[],[],[],['K'],['G','G'],['P']],
        blenders: [3] },
      // 10 MASTER FINAL: color-locked outputs and a locked shared lab force
      // staging. Two K targets require two separate green intermediates before
      // the remaining ingredients can become G and P.
      { capacities: [4,4,4,4,4,4], optimalMoves: 19,
        initial: [['B','Y','R','B'],['Y','R','B'],['R','Y','B'],[],[],[]],
        target:  [[],[],[],['K','K'],['G'],['P']],
        blenders: [3],
        locks: [{ tubeIndex: 3, unlockAt: 5 }],
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
