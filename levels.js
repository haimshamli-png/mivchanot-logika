// =====================================================================
// LEVELS — organized into WORLDS
//
// Each level:
//   capacities: number[]    per-tube capacity (length === number of tubes)
//   optimalMoves: number    BFS-verified shortest solution
//   initial, target         tube contents bottom-to-top
//
// Star thresholds: see computeStars() — half-stars with a grace zone, so a
// single slip on a short puzzle still earns 3★.
//
// Worlds carry an explicit `order` (the route the player sees); hidden worlds
// (see HIDDEN_WORLD_IDS in game.js) keep their data as side-content material.
// =====================================================================

const WORLDS = [
  {
    id: 1,
    order: 1,
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
    order: 101,
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
    order: 2,
    name: 'כדור הג\'וקר',
    icon: '🌈',
    description: 'כדור-קשת עולה על כל צבע. כל צבע עולה עליו. החיץ הכי גמיש.',
    unlockStars: 18,   // ≈43% of the 42 stars before it
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
    order: 4,
    name: 'מבחנות נעולות',
    icon: '🔒',
    description: 'מבחנה נעולה לכמה מהלכים, או עד שמבחנת המפתח 🗝 מגיעה למצב שעל התג. רואים — לא נוגעים.',
    unlockStars: 53,   // ≈45% of the stars before it (W1 + W3 + W6)
    // Each level may declare locks:
    //   locks: [{ tubeIndex: i, unlockAt: N }, ...]
    //     Tube i is fully blocked (source AND destination) while moveCount < N.
    //   locks: [{ tubeIndex: i, until: { tube: k, equals: [...] } }, ...]
    //     "מנעול-תנאי": tube i is blocked until tube k holds exactly `equals`
    //     (bottom-to-top). Omit `equals` to mean tube k's target contents.
    //     Waiting never helps — a sub-goal has to be built first.
    // All optimalMoves below are BFS-verified with the lock constraints active.
    levels: [
      // 1 INTRO — single source-lock, 3 tubes, 2 colors. Teaches "park & wait":
      // the G tube is sealed for the first move, so the spare G has to idle in
      // the empty buffer and only lands home once the lock opens.
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R','R','G'],['G'],[]],
        target:  [['R','R'],['G','G'],[]],
        locks:   [{ tubeIndex: 1, unlockAt: 1 }] },
      // 2 — single source-lock, gentle 4 tubes / 3 colors.
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','G'],['G','R'],['B'],['B']],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 3 }] },
      // 3 — lock on a different source, fresh layout.
      { capacities: [4,4,4,4], optimalMoves: 6,
        initial: [['R','B'],['G','R'],['B','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }] },
      // 4 — four colours enter.
      { capacities: [4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G'],['G','R'],['B','Y'],['Y','B'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 5 }] },
      // 5 — three colours, longer puzzle, the lock bites.
      { capacities: [4,4,4,4], optimalMoves: 11,
        initial: [['R','G','R'],['G','R','G'],['B','B','B'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 4 }] },
      // 6 — cross-mechanic: small (cap 2) tube + joker + lock.
      { capacities: [4,4,2,4], optimalMoves: 10,
        initial: [['R','G'],['G','J','R'],['B'],['B']],
        target:  [['R','R'],['G','G'],['J'],['B','B']],
        locks:   [{ tubeIndex: 1, unlockAt: 5 }] },
      // 7 MIDPOINT — cross-mechanic: joker hidden behind a lock. The blues straddle the
      // sealed joker stack and a green sits under a red, so the opening must
      // be staged before the lock opens.
      { capacities: [4,4,4,4], optimalMoves: 10,
        initial: [['R','G'],['R','J','B'],['B','G'],[]],
        target:  [['R','R'],['G','G'],['B','B'],['J']],
        locks:   [{ tubeIndex: 1, unlockAt: 4 }] },
      // 8 — two staggered locks on content tubes.
      { capacities: [4,4,4,4,4], optimalMoves: 13,
        initial: [['R','G','B'],['G','B','R'],['B','R','G'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 6 }, { tubeIndex: 1, unlockAt: 6 }] },
      // 9 BRIDGE — four colours, six tubes, a single mid lock. Two spare
      // buffers keep it tractable while the lock adds a real plan.
      { capacities: [4,4,4,4,4,4], optimalMoves: 17,
        initial: [['Y','R','G'],['G','B','R'],['R','Y','B'],['B','G','Y'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 8 }] },
      // 10 CONDITIONAL LOCK INTRO — "מנעול-תנאי": waiting does nothing here.
      // The second buffer opens only once two greens are stacked together in
      // the first buffer, so the opening must build a sub-goal before the
      // real sort can use the space.
      { capacities: [4,4,4,4,4], optimalMoves: 16,
        initial: [['G','R','R'],['B','G','R'],['G','B','B'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],[],[]],
        locks:   [{ tubeIndex: 4, until: { tube: 3, equals: ['G','G'] } }] },
      // 11 — deep lock on a packed 4x4 board: one very late lock on a content
      // tube; route around the sealed stack while everything else sorts.
      { capacities: [4,4,4,4,4,4], optimalMoves: 21,
        initial: [['R','R','G','Y'],['Y','G','B','Y'],['B','R','B','G'],['B','G','Y','R'],[],[]],
        target:  [['R','R','R','R'],['G','G','G','G'],['B','B','B','B'],['Y','Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 15 }] },
      // 12 — cross-mechanic: joker mix + single deep lock. The buffer is
      // sealed long enough that the jokers must be parked and re-fetched.
      { capacities: [4,4,4,4,4], optimalMoves: 23,
        initial: [['R','G','B','Y'],['G','B','Y','R'],['B','Y','R','J'],['J','G'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],['J','J']],
        locks:   [{ tubeIndex: 4, unlockAt: 7 }] },
      // 13 — the big buffer is sealed until the greens are finished; only a
      // cap-2 tube is free, so a whole colour must be completed almost
      // without staging space to earn the space. Two optimal paths.
      { capacities: [4,4,4,4,4,2], optimalMoves: 20,
        initial: [['Y','R','B'],['B','B','Y'],['G','G','R'],['Y','R','G'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 4, until: { tube: 1 } }] },
      // 14 BOSS — a chain of dependencies. Buffer 4 opens when the reds are
      // done; buffer 5 opens only when buffer 4 holds three blues — so the
      // blues must be staged in the buffer that the reds unlocked, and only
      // then does the last space appear. Two optimal paths, twelve moves that
      // look like steps backwards.
      { capacities: [4,4,4,4,4,4], optimalMoves: 23,
        initial: [['R','G','G'],['B','B','R'],['Y','R','Y'],['B','Y','G'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[],[]],
        locks:   [{ tubeIndex: 4, until: { tube: 0 } }, { tubeIndex: 5, until: { tube: 4, equals: ['B','B','B'] } }] }
    ]
  },

  {
    id: 5,
    order: 102,
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
      // 5: 3 colors, single source, 3 locks (the source holds six balls)
      { capacities: [6,4,4,4], optimalMoves: 6,
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
    order: 3,
    name: 'מבחנות שיפט',
    icon: '🔄',
    description: 'מבחנת שיפט הופכת כל כדור שנכנס לצבע הבא במחזור: R→G→B→Y→R. ג\'וקר נשאר ג\'וקר.',
    unlockStars: 34,   // ≈45% of the 75 stars before it (W1 + W3)
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
      // 3: first ping-pong — R→B is two passes through ONE shift tube, so each
      //    ball must leave to a buffer and re-enter. Two balls share the buffer.
      { capacities: [4,4,4], optimalMoves: 6,
        initial: [['R','R'],[],[]],
        target:  [[],[],['B','B']],
        shifts:  [2] },
      // 4: choose the route — shift some, keep some. Tube 1 is a plain buffer
      //    (R stays R); tube 3 shifts (R→G). One source, two fates.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','R','R','R'],[],[],[]],
        target:  [[],['R','R'],[],['G','G']],
        shifts:  [3] },
      // 5: two shift tubes chain — R becomes G in tube 2, then those G's must
      //    ride on to become B in tube 3 (each destination adds one step)
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['G','G','R','R'],[],[],[]],
        target:  [[],[],['G','G'],['B','B']],
        shifts:  [2,3] },
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
        shifts:  [2] },
      // 13 BOSS A — sorting and conversion at once. Mixed sources, a forward
      //    and a reverse shift tube, and only a cap-2 plain buffer: some balls
      //    must stay as they are, some must convert, and the shift tubes are
      //    the only staging space. Two optimal paths.
      { capacities: [4,4,4,4,2], optimalMoves: 14,
        initial: [['G','B','G','B'],['R','G','R','R'],[],[],[]],
        target:  [['G','G','G','G'],['B','B','B','B'],[],[],[]],
        shifts:     [2],
        shiftsBack: [3] },
      // 14 BOSS B — joker foundation meets conversion. Two jokers must end
      //    under two yellows that do not exist yet, while four blues sort,
      //    with no plain buffer at all. A single optimal path.
      { capacities: [4,4,4,4], optimalMoves: 14,
        initial: [['G','R','B','B'],['J','G','R','J'],[],[]],
        target:  [['J','J','Y','Y'],['B','B','B','B'],[],[]],
        shifts:     [2],
        shiftsBack: [3] }
    ]
  },

  {
    id: 8,
    order: 5,
    name: 'מעבדת הפיגמנטים',
    icon: '⚗️',
    description: 'מבחנות ערבוב יוצרות צבעים חדשים: כחול+צהוב=ירוק, אדום+כחול=סגול, ירוק+אדום=שחור.',
    unlockStars: 78,   // ≈50% of the stars before it
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
  },

  {
    id: 9,
    order: 103,
    name: 'מעבדת השסתומים',
    icon: '⛓️',
    description: 'שסתומים חד-כיווניים: חלק מהמבחנות מקבלות בלבד, חלק משחררות בלבד, וחלק מתהפכות אחרי שימוש.',
    unlockStars: 119,
    // Each level may declare:
    //   valves: [{ tubeIndex, mode: 'in'|'out'|'flip', starts?: 'in'|'out' }]
    //     in   = destination-only; the tube accepts balls but cannot be a source.
    //     out  = source-only; the tube can release balls but cannot accept any.
    //     flip = starts as in/out and toggles after every successful move that
    //            touches the tube. Undo restores the previous valve state.
    // All optimalMoves are BFS-verified with valve state included in the key.
    levels: [
      // 1: intro — a destination-only valve is a one-way commitment.
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['R'],['R'],[]],
        target:  [[],[],['R','R']],
        valves: [{ tubeIndex: 2, mode: 'in' }] },
      // 2: two destination valves, choose the right final tube for each color.
      { capacities: [4,4,4,4], optimalMoves: 3,
        initial: [['R','G'],['R'],['G'],[]],
        target:  [[],[],['G','G'],['R','R']],
        valves: [{ tubeIndex: 2, mode: 'in' }, { tubeIndex: 3, mode: 'in' }] },
      // 3: the same commitment, but colors are buried in opposing stacks.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','G'],['G','R'],[],[]],
        target:  [[],[],['G','G'],['R','R']],
        valves: [{ tubeIndex: 2, mode: 'in' }, { tubeIndex: 3, mode: 'in' }] },
      // 4: source-only tubes are reservoirs; once a ball leaves, it cannot go back.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R','G'],['G','R'],[],[]],
        target:  [[],[],['R','R'],['G','G']],
        valves: [{ tubeIndex: 0, mode: 'out' }, { tubeIndex: 1, mode: 'out' }] },
      // 5: flip valve intro. The first shift tube accepts a ball, then turns
      // into an exit that must be drained before it can accept again.
      { capacities: [4,4,4,4], optimalMoves: 5,
        initial: [['R','R'],[],[],[]],
        target:  [[],[],['B'],['B']],
        shifts: [2,3],
        valves: [{ tubeIndex: 2, mode: 'flip', starts: 'in' }] },
      // 6: three reds and three greens with one free buffer; valve targets lock
      // the final commitment.
      { capacities: [4,4,4,4,4], optimalMoves: 6,
        initial: [['R','G','R'],['G','R','G'],[],[],[]],
        target:  [[],[],['R','R','R'],['G','G','G'],[]],
        valves: [{ tubeIndex: 2, mode: 'in' }, { tubeIndex: 3, mode: 'in' }] },
      // 7: three colors, source-only reservoirs, destination-only homes.
      { capacities: [4,4,4,4,4], optimalMoves: 6,
        initial: [['R','G','B'],['B','G','R'],[],[],[]],
        target:  [[],[],['R','R'],['G','G'],['B','B']],
        valves: [
          { tubeIndex: 0, mode: 'out' }, { tubeIndex: 1, mode: 'out' },
          { tubeIndex: 2, mode: 'in' },  { tubeIndex: 3, mode: 'in' },
          { tubeIndex: 4, mode: 'in' }
        ] },
      // 8: three 3-stacks sorted through one-way source and home valves.
      { capacities: [4,4,4,4,4,4], optimalMoves: 9,
        initial: [['R','G','B'],['B','R','G'],['G','B','R'],[],[],[]],
        target:  [[],[],[],['R','R','R'],['G','G','G'],['B','B','B']],
        valves: [
          { tubeIndex: 0, mode: 'out' }, { tubeIndex: 1, mode: 'out' },
          { tubeIndex: 2, mode: 'out' }, { tubeIndex: 3, mode: 'in' },
          { tubeIndex: 4, mode: 'in' },  { tubeIndex: 5, mode: 'in' }
        ] },
      // 9: four colors, all exits and homes are one-way.
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['R','G','B','Y'],['Y','B','G','R'],[],[],[],[]],
        target:  [[],[],['R','R'],['G','G'],['B','B'],['Y','Y']],
        valves: [
          { tubeIndex: 0, mode: 'out' }, { tubeIndex: 1, mode: 'out' },
          { tubeIndex: 2, mode: 'in' },  { tubeIndex: 3, mode: 'in' },
          { tubeIndex: 4, mode: 'in' },  { tubeIndex: 5, mode: 'in' }
        ] },
      // 10 MASTER — four colors, three packed source valves, four one-way
      // homes. Every early move is a commitment because destination valves do
      // not give balls back.
      { capacities: [4,4,4,4,4,4,4,4], optimalMoves: 12,
        initial: [['R','G','B','Y'],['G','Y','R','B'],['B','R','Y','G'],[],[],[],[],[]],
        target:  [[],[],[],['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]],
        valves: [
          { tubeIndex: 0, mode: 'out' }, { tubeIndex: 1, mode: 'out' },
          { tubeIndex: 2, mode: 'out' }, { tubeIndex: 3, mode: 'in' },
          { tubeIndex: 4, mode: 'in' },  { tubeIndex: 5, mode: 'in' },
          { tubeIndex: 6, mode: 'in' }
        ] },
      // 11: two flip valves in the conversion pipeline; route choice matters.
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['R','Y','R','Y'],[],[],[],[],[]],
        target:  [[],[],['B'],['B'],['G'],['G']],
        shifts: [2,3,4,5],
        valves: [{ tubeIndex: 2, mode: 'flip', starts: 'in' }, { tubeIndex: 3, mode: 'flip', starts: 'in' }] },
      // 12: five conversions with three flipping shift valves; the finished
      // products compete with half-converted intermediates.
      { capacities: [5,4,4,4,4,4,4], optimalMoves: 11,
        initial: [['R','R','R','R','R'],[],[],[],[],[],[]],
        target:  [[],[],['B'],['B'],['B'],['B'],['B']],
        shifts: [2,3,4,5,6],
        valves: [
          { tubeIndex: 2, mode: 'flip', starts: 'in' },
          { tubeIndex: 3, mode: 'flip', starts: 'in' },
          { tubeIndex: 4, mode: 'flip', starts: 'in' }
        ] },
      // 13 FINAL — six conversions, wider routing, and three flip valves that
      // repeatedly close the door behind each conversion.
      { capacities: [6,4,4,4,4,4,4,4], optimalMoves: 13,
        initial: [['R','R','R','R','R','R'],[],[],[],[],[],[],[]],
        target:  [[],[],['B'],['B'],['B'],['B'],['B'],['B']],
        shifts: [2,3,4,5,6,7],
        valves: [
          { tubeIndex: 2, mode: 'flip', starts: 'in' },
          { tubeIndex: 3, mode: 'flip', starts: 'in' },
          { tubeIndex: 4, mode: 'flip', starts: 'in' }
        ] }
    ]
  },

  {
    id: 10,
    order: 6,
    name: 'מסלולי פורטל',
    icon: '🌀',
    description: 'צינור תחתי: כדור שנכנס לפתח ⤵ מחליק אל תחתית המבחנה התאומה ⤶ בלי חוקי צבע — ונקבר שם. הסדר שאתה מאכיל הוא ההפך ממה שתראה.',
    unlockStars: 104,  // ≈55% of the stars before it — never above 55%
    // Each level may declare:
    //   portals: [{ pair: [chute, exit], mode: 'bottom' }]
    // Pouring into the chute inserts the ball at the BOTTOM of the exit tube:
    // no colour-stacking rule (a pipe pushes), but capacity, locks, colour
    // rims, shift and blend rules of the exit tube still apply. In a blender
    // the chute meets the bottom ball and a recipe pair blends there. Layered
    // stacks (R,G,R,G) can only be built this way, and a ball fed from below
    // is buried under everything — every chute move is a commitment.
    // All optimalMoves are BFS-verified with chute routing active.
    levels: [
      // 1 INTRO — the chute alone. Two greens already sit in the exit tube; the red
      // has to go UNDER them. Pour it into the chute ⤵ and it slides in from below.
      { capacities: [4,4,4], optimalMoves: 1,
        initial: [['R'],[],['G','G']],
        target:  [[],[],['R','G','G']],
        portals: [{ pair: [1, 2], mode: 'bottom' }] },
      // 2 — top or bottom? Only same-colour balls may land on top, but the chute
      // takes anything. The blue has to leave and come back from below.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['G','R'],[],['B'],[]],
        target:  [[],[],['G','B','R'],[]],
        portals: [{ pair: [1, 2], mode: 'bottom' }] },
      // 3 — alternating layers. A stack like R,G,R,G can only be built from below:
      // the order you feed the chute is the reverse of the order you see.
      { capacities: [4,4,4,4], optimalMoves: 5,
        initial: [['G','G','R'],[],['R'],[]],
        target:  [[],[],[],['R','G','R','G']],
        portals: [{ pair: [1, 3], mode: 'bottom' }] },
      // 4 — chute into a shift tube. Whatever enters tube 4 advances one colour,
      // from above or from below, so the layers have to be planned pre-shift.
      { capacities: [4,4,4,4,4], optimalMoves: 6,
        initial: [['B','R','G'],['R','G','B'],[],[],[]],
        target:  [[],[],[],['R','R'],['B','Y','B','Y']],
        portals: [{ pair: [2, 4], mode: 'bottom' }],
        shifts: [4] },
      // 5 MIDPOINT — two chutes, two mirrored stacks. Each exit needs its own feeding
      // order, and the two orders compete for the same source tops.
      { capacities: [4,4,4,4,4,4], optimalMoves: 6,
        initial: [['R','G','B'],['G','B','R'],[],[],[],[]],
        target:  [[],[],[],[],['R','G','B'],['B','G','R']],
        portals: [{ pair: [2, 4], mode: 'bottom' }, { pair: [3, 5], mode: 'bottom' }] },
      // 6 — the chute is sealed until two blues are stacked in the buffer: the
      // sub-goal comes first, and it eats the very space the layers need.
      { capacities: [4,4,4,4,4], optimalMoves: 10,
        initial: [['B','G','G'],['B','R','R'],[],[],[]],
        target:  [[],[],[],['B','B'],['R','G','R','G']],
        portals: [{ pair: [2, 4], mode: 'bottom' }],
        locks: [{ tubeIndex: 2, until: { tube: 3, equals: ['B','B'] } }] },
      // 7 — four colours, packed sources, and a chute that opens only when the
      // reds are home. Two optimal paths: nearly every move is a commitment.
      { capacities: [4,4,4,4,4,4], optimalMoves: 10,
        initial: [['R','Y','B','G'],['B','G','R','Y'],[],[],[],[]],
        target:  [[],[],[],['R','R'],['Y','Y'],['G','B','G','B']],
        portals: [{ pair: [2, 5], mode: 'bottom' }],
        locks: [{ tubeIndex: 2, until: { tube: 3, equals: ['R','R'] } }] },
      // 8 — the product shelf. The lab makes purple, green and black one at a
      // time, and the shelf can only be filled from below — so the products
      // must be made in the reverse of the order they will sit in.
      { capacities: [4,4,4,4,4,4], optimalMoves: 12,
        initial: [['R','B','B','Y'],['Y','B','R'],['Y','B'],[],[],[]],
        target:  [[],[],[],[],['G'],['K','G','P']],
        portals: [{ pair: [3, 5], mode: 'bottom' }],
        blenders: [4],
        locks: [{ tubeIndex: 3, unlockAt: 3 }] },
      // 9 — no spare buffer at all. Purple must be shelved first, then the two
      // greens have to be finished in tube 0 to open the chute, and only then
      // can the blacks be built and slid under the purple. Eight optimal paths.
      { capacities: [4,4,4,4,4,4], optimalMoves: 19,
        initial: [['B','B','R','Y'],['B','Y','R','B'],['Y','Y','R','B'],[],[],[]],
        target:  [['G','G'],[],[],[],[],['K','K','P']],
        portals: [{ pair: [4, 5], mode: 'bottom' }],
        blenders: [3],
        locks: [{ tubeIndex: 4, until: { tube: 0, equals: ['G','G'] } }] },
      // 10 BOSS — the same chain with a cap-2 home for the greens and a lab that
      // also has to serve as the only staging space. Purple, then greens, then
      // two blacks fed under everything. Five optimal paths, seven moves that
      // look like steps backwards — the hardest level on the route.
      { capacities: [4,4,4,2,4,4,4], optimalMoves: 18,
        initial: [['B','B','R','Y'],['B','R','Y','Y'],['B','B','Y','R'],[],[],[],[]],
        target:  [[],[],[],['G','G'],[],[],['K','K','P']],
        portals: [{ pair: [4, 6], mode: 'bottom' }],
        blenders: [5],
        locks: [{ tubeIndex: 4, until: { tube: 3, equals: ['G','G'] } }] }
    ]
  },
  {
    id: 12,
    order: 7,
    name: 'המעבדה המצונרת',
    icon: '🔗',
    description: 'צנרת: שופכים רק דרך צינור שמצויר בין המבחנות. כדור שצריך לחצות שתי מבחנות חייב לנחות באמצע — אבני דריכה.',
    unlockStars: 110,
    // Each level declares the plumbing:
    //   pipes:  [[a, b], ...]   undirected pipes — a ball may be poured from a
    //                           tube only into a tube connected to it by a pipe
    //   oneWay: [[from, to]]    directed pipes (a valve in the pipe)
    // Everything else is the normal game. A ball that must cross two tubes has
    // to LAND in the middle one, so the middle tube must be empty or carry a
    // matching colour on top: stepping stones. A shift tube at a junction
    // converts everything that crosses it. All optimalMoves are BFS-verified.
    levels: [
      // 1 — מבוא לצנרת: אין צינור ישיר ליעד, ולכן הכדור חייב לנחות במבחנה האמצעית
      // ולהמשיך ממנה — כל מהלך הוא מסלול, לא קפיצה.
      { capacities: [4,4,4], optimalMoves: 2,
        initial: [['B'],[],['B']],
        target:  [[],[],['B','B']],
        pipes: [[0,1], [1,2]] },
      // 2 — מזלג: מבחנה 1 היא הצומת היחיד בין שלושת הקצוות. הירוק חייב לפנות את
      // הדרך דרך הצומת לפני שהאדום יכול לחצות אותו.
      { capacities: [4,4,4,4], optimalMoves: 4,
        initial: [['R'],[],['R','G'],['G','G']],
        target:  [[],[],['R','R'],['G','G','G']],
        pipes: [[0,1], [1,2], [1,3]] },
      // 3 — אבן דריכה ראשונה: האדום הרחוק חוצה שתי מבחנות ויכול לנחות באמצע רק כל
      // עוד האדום השני עדיין יושב שם למעלה — לכן מזיזים קודם את מי שנראה מסודר.
      { capacities: [4,4,4,4], optimalMoves: 8,
        initial: [[],['G','G','R'],[],['R']],
        target:  [['R','R'],[],[],['G','G']],
        pipes: [[0,1], [1,2], [2,3]] },
      // 4 — צומת שהוא גם בית: הירוקים שייכים למבחנת הצומת, אבל כל עוד הם שם אף צבע
      // אחר לא עובר. מפרקים מבחנה גמורה, מעבירים את כולם, ובונים אותה מחדש בסוף.
      { capacities: [4,4,4,4,4], optimalMoves: 9,
        initial: [['R'],['R','B','G'],['G'],[],['B']],
        target:  [['R','R'],[],['G','G'],[],['B','B']],
        pipes: [[0,2], [1,2], [2,3], [2,4]] },
      // 5 — מסדרון של שלושה צבעים: כל חצייה נוחתת על צבע תואם, והמאגר בקצה מתמלא
      // ומתרוקן בסדר קבוע. מי שמפנה את המסדרון מוקדם מדי חוסם את עצמו.
      { capacities: [4,4,4,4,4], optimalMoves: 14,
        initial: [['R','R','Y'],['R','Y','B'],['Y','B','B'],[],[]],
        target:  [['R','R','R'],['Y','Y','Y'],['B','B','B'],[],[]],
        pipes: [[0,1], [1,2], [2,3], [3,4]] },
      // 6 — טבעת עם קטע חד-כיווני: הבית של האדום נמצא ממש מתחתיו אבל החץ מצביע
      // למעלה, ולכן הוא מקיף את כל הטבעת ונוחת על אבני דריכה אדומות בדרך. רק אחרי
      // שהוא עבר אפשר לפרק את האבנים.
      { capacities: [4,4,4,4,4,4], optimalMoves: 12,
        initial: [['G','G','R'],[],['Y','B','R'],['R'],[],['B','B','R']],
        target:  [['G','G'],['Y'],[],['R','R','R','R'],[],['B','B','B']],
        pipes: [[0,1], [1,2], [2,5], [5,4], [4,3]],
        oneWay: [[3,0]] },
      // 7 — מבחנת שיפט בצומת הטבעת: כל מה שחוצה אותה משנה צבע. האדומים והכחול
      // חייבים לעבור דרכה (R→G, B→Y) והצהובים חייבים לעקוף אותה דרך הקשת — הטבעת
      // נותנת לכל כדור בחירה של מסלול.
      { capacities: [4,4,4,4,4], optimalMoves: 15,
        initial: [['B','R','R'],[],[],[],['R','Y','Y']],
        target:  [['Y','Y','Y'],[],[],['G','G','G'],[]],
        pipes: [[0,1], [1,2], [2,3], [3,4], [4,0]],
        shifts: [2] },
      // 8 — מעבדת ערבוב בצומת: המבלנדר יושב במפגש של שלושה צינורות, וכל כדור שחוצה
      // אותו עלול להגיב עם מה שמונח בו. הירוק חייב לעקוף דרך הטבעת ולהיכנס רק
      // כשאין אדום במעבדה.
      { capacities: [4,4,4,4,4,4], optimalMoves: 17,
        initial: [['Y','R','B'],[],[],['Y','B','G','R'],[],[]],
        target:  [[],['P','P'],['Y','Y'],[],[],['G']],
        pipes: [[0,1], [1,2], [2,5], [5,4], [4,3], [3,0], [1,4]],
        blenders: [4] },
      // 9 — מנעול-תנאי על הגשר: קודם מסיימים את מבחנת המפתח בצד אחד, ורק אז מבחנת
      // הגשר נפתחת. מעבר לגשר הקטע החד-כיווני מכריח סיבוב מלא, והצהוב שנחנה בצד
      // המפתח חוזר אחרון.
      { capacities: [4,4,4,4,4,4], optimalMoves: 17,
        initial: [['B','B','Y'],['B'],[],['G','Y'],['Y','G'],['G']],
        target:  [['B','B','B'],[],[],['Y','Y','Y'],['G','G','G'],[]],
        pipes: [[0,1], [1,2], [0,2], [2,5], [4,3], [3,5]],
        oneWay: [[5,4]],
        locks: [{ tubeIndex: 5, until: { tube: 0 } }] },
      // 10 — בוס: מבלנדר בצומת, צינור חד-כיווני שלא מחזיר כדורים למקור, ומדף שנבנה
      // רק מלמטה דרך השאט. את הירוק העליון מניחים ישירות, ואת הסגול והירוק השני
      // מייצרים אחר כך ומחליקים מתחתיו — בסדר ההפוך למה שרואים ביעד.
      { capacities: [4,4,4,4,4,4], optimalMoves: 14,
        initial: [[],[],[],[],['Y','B','G'],['R','R','R','B']],
        target:  [['G','P','G'],[],['R','R'],[],[],[]],
        pipes: [[0,1], [2,5], [5,4], [4,3], [1,4]],
        oneWay: [[2,1]],
        portals: [{ pair: [3, 0], mode: 'bottom' }],
        blenders: [1] }
    ]
  },

  {
    id: 13,
    order: 8,
    name: 'הצנטריפוגה',
    icon: '🌪',
    description: 'צנטריפוגה: מבחנה שמתהפכת ברגע שהיא מתמלאת — התחתון עולה למעלה. ממלאים כדי לחפור, והג\'וקר הוא מפתח ההיפוך.',
    unlockStars: 126,
    // Each level may declare:
    //   centrifuges: [tubeIndex, ...]
    // The moment a listed tube becomes full (after a ball lands in it from
    // the top or from a chute) its contents reverse: the bottom ball rises to
    // the top. Blends do not trigger a flip. Instead of removing three balls
    // to reach the bottom, add one and let the tube spin — but every flip
    // buries whatever was on top. All optimalMoves are BFS-verified.
    levels: [
      // 1 — מבוא — "ממלאים כדי לחפור": הצנטריפוגה (קיבולת 3) מחזיקה ירוק מתחת
      // לאדום. האדום השני ממלא אותה, היא מתהפכת, והירוק שהיה בתחתית צף למעלה — שני
      // מהלכים בלבד.
      { capacities: [3,4,4], optimalMoves: 2,
        initial: [['G','R'],['R'],['G','G']],
        target:  [['R','R'],[],['G','G','G']],
        centrifuges: [0] },
      // 2 — הג'וקר הוא מפתח אוניברסלי: הוא נוחת על כל צבע וממלא את הצנטריפוגה.
      // התאום האדום נראה אבל קבור מתחת לכחול ולג'וקר, אז רק הג'וקר מפעיל את ההיפוך
      // — ונקבר בתחתית, ששם ביתו.
      { capacities: [3,4,4,4], optimalMoves: 3,
        initial: [['G','R'],['R','B','J'],['G','G'],['B']],
        target:  [['J','R'],['R'],['G','G','G'],['B','B']],
        centrifuges: [0] },
      // 3 — ההיפוך קובר את המפתח בתחתית. אחרי שהירוק צף הביתה, התאום האדום ממלא
      // שוב את הצנטריפוגה, היפוך שני מציף את הג'וקר, והוא ממשיך למבחנה שהתפנתה.
      { capacities: [3,4,4,4], optimalMoves: 5,
        initial: [['G','R'],['B','B','J'],['G','G'],['R','B']],
        target:  [['R','R'],['B','B','B'],['G','G','G'],['J']],
        centrifuges: [0] },
      // 4 — קריאה הפוכה: את המחסנית בונים במהופך — הכדור שצריך לשבת בתחתית נכנס
      // אחרון. שבעה מהלכים שנראים כמו אפס התקדמות, עד שההיפוך האחרון מסדר הכול.
      { capacities: [5,4,4,4], optimalMoves: 7,
        initial: [[],['G','B','B'],['J','G'],[]],
        target:  [['B','B','J','G','G'],[],[],[]],
        centrifuges: [0] },
      // 5 — נקודת אמצע — שרשרת מפתחות בין שתי צנטריפוגות: הג'וקר הופך את A, הירוק
      // שצף ממנה הופך את B, והאדום שצף מ-B משלים את A מעל הג'וקר. נתיב אופטימלי
      // יחיד.
      { capacities: [4,3,4,4], optimalMoves: 5,
        initial: [['B','G','R'],['R','G'],['J','B'],['B']],
        target:  [['J','R','R'],['G','G'],[],['B','B','B']],
        centrifuges: [0,1] },
      // 6 — צנטריפוגה עם חיץ זעיר (קיבולת 2): אין מקום לחפור, אז הירוק השלישי ממלא
      // את הצנטריפוגה ומעלה את האדום. בלי ההיפוך הפתרון ארוך בחמישה מהלכים, והחיץ
      // הקטן מספיק בדיוק לכדור אחד.
      { capacities: [4,4,4,4,2], optimalMoves: 11,
        initial: [['R','G','G'],['R','Y','B','Y'],['R','G','B','B'],[],[]],
        target:  [['G','G','G'],['R','R','R'],['B','B','B'],['Y','Y'],[]],
        centrifuges: [0] },
      // 7 — ייצור מפתח: אין ירוק פנוי בלוח, אז אדום עובר במבחנת השיפט והופך לירוק
      // שממלא את הצנטריפוגה. השיפט הוא החיץ היחיד — כל חניה בו משנה צבע, ולכן גם
      // הכחול שצף מההיפוך יוצא דרכו.
      { capacities: [4,4,4,4,4], optimalMoves: 13,
        initial: [['B','G','G'],[],['R'],['R','Y'],['B','Y','R','B']],
        target:  [['G','G','G'],[],['B','B','B'],['R','R'],['Y','Y']],
        centrifuges: [0],
        shifts: [1] },
      // 8 — המפתח נשאר במנעול: החיץ נפתח רק כשהצנטריפוגה מציגה [R,R,J] — מחסנית
      // שנוצרת אך ורק מהיפוך של [J,R,R], כלומר ג'וקר קודם ואז חילוץ בתאום. התאום
      // האדום זמין מההתחלה — מי שפותח איתו לא יגיע למחסנית המפתח. נתיב יחיד.
      { capacities: [3,4,4,4,4], optimalMoves: 13,
        initial: [['G','R'],['G','Y','B','B'],['G','J'],['Y','B','Y','R'],[]],
        target:  [['R','R','J'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]],
        centrifuges: [0],
        locks: [{ tubeIndex: 4, until: { tube: 0, equals: ['R','R','J'] } }] },
      // 9 — צינור תחתי לתוך הצנטריפוגה: מה שנדחף מלמטה עולה לראש כשהיא מתהפכת.
      // כחול שנדחף מהצינור ואדום שנוחת מלמעלה משמשים "דלק היפוך" שמסדר מחדש את
      // השכבות, ורק אז נבנה R,G,R,G מלמטה וההיפוך האחרון קורא אותו נכון. נתיב
      // יחיד.
      { capacities: [4,4,4,4,2], optimalMoves: 17,
        initial: [['Y','G'],[],['G','B'],['R','B','R','B'],['Y']],
        target:  [['R','G','R','G'],[],['B','B','B'],[],['Y','Y']],
        centrifuges: [0],
        portals: [{ pair: [1, 0], mode: 'bottom' }] },
      // 10 — בוס — מדף התוצרים: שחור וסגול נכנסים מהצינור מתחת לירוק, הצהוב העודף
      // ממלא ומהפך את המדף, והג'וקר נוחת אחרון וגורם להיפוך השני שמסדר [J,P,K,G].
      // מנעול-תנאי, בלנדר, צינור וצנטריפוגה בלוח אחד; נתיב יחיד.
      { capacities: [4,4,4,4,4,2], optimalMoves: 12,
        initial: [['G'],[],['Y'],['R','Y','B','R'],['B','J','B'],['B']],
        target:  [['J','P','K','G'],[],[],['Y'],[],['B','B']],
        centrifuges: [0],
        portals: [{ pair: [1, 0], mode: 'bottom' }],
        blenders: [2],
        locks: [{ tubeIndex: 1, until: { tube: 5, equals: ['B','B'] } }] }
    ]
  },

  {
    id: 11,
    order: 9,
    name: 'מסלול מומחה',
    icon: '🏅',
    description: 'שלבי מאסטר מכל המכניקות, בסדר קושי עולה. נפתח לפי חותמות אתגר, לא לפי כוכבים.',
    unlockStars: 0,
    unlockContracts: 20,
    expert: true,
    // Hand-picked master levels: the retired valve lab (flip valves), the
    // retired fragile-tube world, and the World 4 monster finale. Ordered by
    // composite difficulty score, not by move count.
    levels: [
      // 1 — two flip valves in a conversion pipeline; route choice matters.
      { capacities: [4,4,4,4,4,4], optimalMoves: 8,
        initial: [['R','Y','R','Y'],[],[],[],[],[]],
        target:  [[],[],['B'],['B'],['G'],['G']],
        shifts: [2,3,4,5],
        valves: [{ tubeIndex: 2, mode: 'flip', starts: 'in' }, { tubeIndex: 3, mode: 'flip', starts: 'in' }] },
      // 2 — H1 — הכן, ואז הכה: שני כדורים מתקשים (G1 מעל R1) חוסמים יחד את מבחנה 3.
      // הירוק חייב להכות ראשון לתוך [G,G] שכבר מוכן, ורק אז נחשף האדום — וביתו
      // [R,R] חייב כבר לחכות לו. עם חיץ של כדור אחד בלבד המסלול יחיד.
      { capacities: [4,4,4,4,1], optimalMoves: 12,
        initial: [['B','Y','R'],['G','R','G'],['B','B','Y'],['Y','R1','G1'],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      // 3 — four colours, all tubes short (cap 3): no real buffer anywhere.
      { capacities: [3,3,3,3,3], optimalMoves: 12,
        initial: [['R','G','B'],['G','Y','R'],['B','Y'],['Y','R','G'],['B']],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      // 4 — five conversions with three flipping shift valves; finished
      // products compete with half-converted intermediates.
      { capacities: [5,4,4,4,4,4,4], optimalMoves: 11,
        initial: [['R','R','R','R','R'],[],[],[],[],[],[]],
        target:  [[],[],['B'],['B'],['B'],['B'],['B']],
        shifts: [2,3,4,5,6],
        valves: [
          { tubeIndex: 2, mode: 'flip', starts: 'in' },
          { tubeIndex: 3, mode: 'flip', starts: 'in' },
          { tubeIndex: 4, mode: 'flip', starts: 'in' }
        ] },
      // 5 — one tall tube and four short ones.
      { capacities: [4,3,3,3,3], optimalMoves: 19,
        initial: [['R','G','B','Y'],['B','Y','R'],['G','R','B'],['Y','G','R'],[]],
        target:  [['R','R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]] },
      // 6 H2 — שלושת האדומים הם כדורי R2: לכל אחד בדיוק שני מהלכים — כניסה אחת
      // למבחנת השיפט (4) שהופכת אותו לירוק, ויציאה ישירה הביתה. אין חנייה: בית
      // הירוקים (2) חייב להתרוקן ולהיזרע בירוק החופשי לפני שהראשון יוצא מהשיפט.
      { capacities: [4,4,4,4,4], optimalMoves: 15,
        initial: [['B','R2','B','Y'],['Y','R2','R2','G'],['Y','B','B','Y'],[],[]],
        target:  [['B','B','B','B'],['Y','Y','Y','Y'],['G','G','G','G'],[],[]],
        shifts: [4] },
      // 7 — M1 — מדף (5) שהוא צנטריפוגה ומוזן מצינור תחתי (4): הצינור נפתח רק כששני
      // אדומים בבית, וההיפוך ברגע המילוי מבטל את ההיפוך של הצינור — מאכילים
      // R,G,B,Y בסדר הזה ורואים אותו כפי שהוא. בדרך המדף מתמלא ומתהפך פעם אחת
      // כחיץ. מסלול יחיד.
      { capacities: [4,4,4,4,4,4], optimalMoves: 15,
        initial: [['B','R','G'],['B','G','B'],['G','R','R'],['Y','Y','Y'],[],[]],
        target:  [['R','R'],['G','G'],['B','B'],['Y','Y'],[],['R','G','B','Y']],
        centrifuges: [5],
        portals: [{ pair: [4, 5], mode: 'bottom' }],
        locks: [{ tubeIndex: 4, until: { tube: 0, equals: ['R','R'] } }] },
      // 8 — H3 — שני כחולים מתקשים הם מרכיבי המעבדה (4): כל אחד נכנס פעם אחת בלבד —
      // ישר על צהוב שכבר עומד למעלה, או כזרע שמתקשה בתחתית ומחכה שהצהוב יגיע
      // אליו. שני שחורים, שני ירוקים וסגול בלי כדור עודף — מסלול יחיד.
      { capacities: [4,4,4,4,4], optimalMoves: 17,
        initial: [['R','Y','B','B'],['R','B1','B','B1'],['Y','Y','Y','R'],[],[]],
        target:  [[],['P'],['G','G'],['K','K'],[]],
        blenders: [4] },
      // 9 MONSTER — cross-mechanic: staggered deep locks + a small
      // (cap 2) buffer. tube0 is frozen for 11 moves and tube1 for 6, so the
      // opening is a scheduled staging problem, not just a long sort. The cap-2
      // tube4 cannot absorb a 3-stack, which keeps the final route tight.
      { capacities: [4,4,4,4,2], optimalMoves: 27,
        initial: [['Y','R','B','G'],['G','B','R','Y'],['B','G','Y','R'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[]],
        locks:   [{ tubeIndex: 0, unlockAt: 11 }, { tubeIndex: 1, unlockAt: 6 }] },
      // 10 — M2 — צנרת: ארבע מבחנות הבית אינן מחוברות זו לזו — כל כדור עובר דרך אחד
      // משני ממסרים (4,5). ממסר 5 נפתח רק כששני ירוקים עומדים בממסר 4, והאדומים
      // שחנו בו נכלאים עד שמרכיבים את המפתח מחדש — הירוקים נשלפים בחזרה מהבית.
      // 13 מהלכים אחורה מתוך 26.
      { capacities: [4,4,4,4,4,4], optimalMoves: 26,
        initial: [['B','R','B'],['R','G','G'],['B','G','Y'],['Y','Y','R'],[],[]],
        target:  [['R','R','R'],['G','G','G'],['B','B','B'],['Y','Y','Y'],[],[]],
        pipes: [[0,4], [1,4], [2,4], [3,4], [0,5], [1,5], [2,5], [3,5], [4,5]],
        locks: [{ tubeIndex: 5, until: { tube: 4, equals: ['G','G'] } }] },
      // 11 — M3 — מעבדה + התקשות + מנעול-תנאי: מדף השחור (3) נפתח רק כששני ירוקים
      // עומדים על מדף 2. שלושת הכחולים המתקשים נכנסים למעבדה פעם אחת ומתקשים בה
      // כזרעים — הצהובים חייבים לבוא אליהם; הסגול נבנה ראשון וחונה על מדף
      // הירוקים. מסלול יחיד.
      { capacities: [4,4,4,4,4], optimalMoves: 15,
        initial: [['Y','R','B1','Y'],['Y','B1','B1'],['B','R'],[],[]],
        target:  [[],['P'],['G','G'],['K'],[]],
        blenders: [4],
        locks: [{ tubeIndex: 3, until: { tube: 2, equals: ['G','G'] } }] },
      // 12 — six conversions, wider routing, and three flip valves that
      // repeatedly close the door behind each conversion.
      { capacities: [6,4,4,4,4,4,4,4], optimalMoves: 13,
        initial: [['R','R','R','R','R','R'],[],[],[],[],[],[],[]],
        target:  [[],[],['B'],['B'],['B'],['B'],['B'],['B']],
        shifts: [2,3,4,5,6,7],
        valves: [
          { tubeIndex: 2, mode: 'flip', starts: 'in' },
          { tubeIndex: 3, mode: 'flip', starts: 'in' },
          { tubeIndex: 4, mode: 'flip', starts: 'in' }
        ] }


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
