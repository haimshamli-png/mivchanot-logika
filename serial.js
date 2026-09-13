(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SERIAL = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // =====================================================================
  // "ניסוי השבוע" — the weekly serial.
  //
  // A season is seven chained episodes: the target of episode k is the
  // starting board of episode k+1 (new tubes may be appended, and one new
  // element arrives each day). One episode unlocks per calendar day from the
  // day the player starts the season, so the week has a cliffhanger every
  // evening. "Previously on" replays the optimal solution of the episode
  // before, on the real board.
  //
  // Season data lives in SERIAL_SEASONS below; solutions for the replay are
  // generated into level-meta.js by scripts/annotate-levels.js.
  // =====================================================================

  const SERIAL_SEASONS = [
    {
      id: 'season-1',
      title: 'ההזמנה השחורה',
      episodes: [
        {
          title: 'לקוח מסתורי',
          teaser: 'מחר מגיע למעבדה מערבל: כחול וצהוב שנפגשים בו הופכים לירוק — והלקוח כבר שאל כמה ירוק יש לנו.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            initial: [
              [
                'G',
                'Y'
              ],
              [],
              [
                'Y'
              ],
              [
                'B',
                'G',
                'G',
                'Y'
              ],
              [
                'B'
              ],
              [
                'Y',
                'Y',
                'Y',
                'B'
              ]
            ],
            target: [
              [
                'G'
              ],
              [
                'Y',
                'Y',
                'Y'
              ],
              [
                'B',
                'B'
              ],
              [
                'B',
                'G',
                'G'
              ],
              [],
              [
                'Y',
                'Y',
                'Y'
              ]
            ],
            optimalMoves: 5
          }
        },
        {
          title: 'המערבל',
          teaser: 'בבוקר תימצא אחת המבחנות חתומה — היא תיפתח רק כשמבחנת האחסון תגיע בדיוק למצב שבתג.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            blenders: [
              3
            ],
            initial: [
              [
                'G'
              ],
              [
                'Y',
                'Y',
                'Y'
              ],
              [
                'B',
                'B'
              ],
              [
                'B',
                'G',
                'G'
              ],
              [],
              [
                'Y',
                'Y',
                'Y'
              ]
            ],
            target: [
              [
                'Y',
                'Y',
                'Y'
              ],
              [
                'G',
                'G'
              ],
              [
                'G',
                'G'
              ],
              [],
              [
                'B',
                'B'
              ],
              [
                'Y',
                'Y'
              ]
            ],
            optimalMoves: 10
          }
        },
        {
          title: 'המבחנה החתומה',
          teaser: 'בלילה מישהו התקין ממיר על המבחנה השלישית: כל כדור שייכנס אליה ייצא בצבע הבא במחזור.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            blenders: [
              3
            ],
            locks: [
              {
                tubeIndex: 5,
                until: {
                  tube: 0
                }
              }
            ],
            initial: [
              [
                'Y',
                'Y',
                'Y'
              ],
              [
                'G',
                'G'
              ],
              [
                'G',
                'G'
              ],
              [],
              [
                'B',
                'B'
              ],
              [
                'Y',
                'Y'
              ]
            ],
            target: [
              [
                'B'
              ],
              [
                'Y',
                'Y',
                'Y'
              ],
              [
                'G'
              ],
              [
                'G',
                'G',
                'G'
              ],
              [
                'Y'
              ],
              [
                'G'
              ]
            ],
            optimalMoves: 10
          }
        },
        {
          title: 'הממיר',
          teaser: 'הלקוח דורש צבע שמעולם לא היה במעבדה הזאת — אדום — ורק הממיר יודע איך להשיג אותו.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            blenders: [
              3
            ],
            locks: [
              {
                tubeIndex: 5,
                until: {
                  tube: 0
                }
              }
            ],
            shifts: [
              2
            ],
            initial: [
              [
                'B'
              ],
              [
                'Y',
                'Y',
                'Y'
              ],
              [
                'G'
              ],
              [
                'G',
                'G',
                'G'
              ],
              [
                'Y'
              ],
              [
                'G'
              ]
            ],
            target: [
              [
                'Y',
                'Y',
                'Y'
              ],
              [],
              [
                'B',
                'B',
                'B'
              ],
              [
                'Y'
              ],
              [
                'G',
                'G'
              ],
              [
                'B'
              ]
            ],
            optimalMoves: 12
          }
        },
        {
          title: 'אדום',
          teaser: 'מחר יורד מהתקרה צינור ישר אל תחתית המדף: כל מה שנכנס בו נקבר מתחת לכל השאר, ואי אפשר להתחרט.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            blenders: [
              3
            ],
            locks: [
              {
                tubeIndex: 5,
                until: {
                  tube: 0
                }
              }
            ],
            shifts: [
              2
            ],
            initial: [
              [
                'Y',
                'Y',
                'Y'
              ],
              [],
              [
                'B',
                'B',
                'B'
              ],
              [
                'Y'
              ],
              [
                'G',
                'G'
              ],
              [
                'B'
              ]
            ],
            target: [
              [
                'B',
                'B',
                'B'
              ],
              [
                'R'
              ],
              [],
              [
                'G',
                'G',
                'G'
              ],
              [
                'Y',
                'Y'
              ],
              []
            ],
            optimalMoves: 13
          }
        },
        {
          title: 'הצינור',
          teaser: 'מחר בחצות ההזמנה השחורה נאספת — ובמעבדה עדיין אין אפילו כדור שחור אחד. ירוק ועוד אדום, אמר הלקוח.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            blenders: [
              3
            ],
            locks: [
              {
                tubeIndex: 5,
                until: {
                  tube: 0
                }
              }
            ],
            shifts: [
              2
            ],
            portals: [
              {
                pair: [
                  5,
                  1
                ],
                mode: 'bottom'
              }
            ],
            initial: [
              [
                'B',
                'B',
                'B'
              ],
              [
                'R'
              ],
              [],
              [
                'G',
                'G',
                'G'
              ],
              [
                'Y',
                'Y'
              ],
              []
            ],
            target: [
              [
                'B'
              ],
              [
                'B',
                'B',
                'G',
                'R'
              ],
              [],
              [
                'G',
                'G'
              ],
              [
                'Y',
                'Y'
              ],
              []
            ],
            optimalMoves: 12
          }
        },
        {
          title: 'שחור',
          teaser: 'העונה הבאה: הלקוח חזר עם הזמנה חדשה, והפעם הוא רוצה סגול.',
          level: {
            capacities: [
              4,
              4,
              4,
              4,
              2,
              4
            ],
            blenders: [
              3
            ],
            locks: [
              {
                tubeIndex: 5,
                until: {
                  tube: 0
                }
              }
            ],
            shifts: [
              2
            ],
            portals: [
              {
                pair: [
                  5,
                  1
                ],
                mode: 'bottom'
              }
            ],
            initial: [
              [
                'B'
              ],
              [
                'B',
                'B',
                'G',
                'R'
              ],
              [],
              [
                'G',
                'G'
              ],
              [
                'Y',
                'Y'
              ],
              []
            ],
            target: [
              [
                'B',
                'B'
              ],
              [
                'G',
                'K',
                'G',
                'K'
              ],
              [],
              [],
              [],
              []
            ],
            optimalMoves: 12
          }
        }
      ]
    },
    {
      id: 'season-2',
      title: 'ההזמנה הסגולה',
      // Season 2 — the client wants purple. New element each day: joker,
      // centrifuge, blue-only tube, blender (purple = red + blue), hardening
      // balls, and a sealed shelf with a final delivery. Tube 6 (the
      // centrifuge) arrives on day 3, tube 7 (the crate) on day 7. All
      // optimalMoves are BFS-verified (scripts/annotate-levels.js).
      episodes: [
        {
          title: 'המכתב',
          teaser: 'מחר מגיע ג׳וקר: כדור שמתאים לכל צבע — והלקוח רוצה אותו בתחתית, מתחת לכחולים.',
          level: {
            capacities: [4, 4, 4, 4, 4],
            initial: [['R','B'], ['B','R','Y'], ['Y','Y'], [], ['R','B']],
            target:  [['R','R','R'], ['B','B','B'], ['Y','Y','Y'], [], []],
            optimalMoves: 6
          }
        },
        {
          title: 'הג׳וקר',
          teaser: 'בלילה מתקינים צנטריפוגה: מבחנה שמתהפכת ברגע שהיא מתמלאת. הכחול הרביעי מגיע קבור בתחתיתה.',
          level: {
            capacities: [4, 4, 4, 4, 4, 4],
            initial: [['R','R','R'], ['B','B','B'], ['Y','Y','Y'], [], [], ['J']],
            target:  [[], ['J','B','B','B'], ['Y','Y','Y'], ['R','R','R'], [], []],
            optimalMoves: 10
          }
        },
        {
          title: 'הצנטריפוגה',
          teaser: 'מחר אחת המבחנות נצבעת כחול: רק כחול (או ג׳וקר) ייכנס אליה — וכל השאר יצטרכו לחפש מקום אחר.',
          level: {
            capacities: [4, 4, 4, 4, 4, 4, 4],
            centrifuges: [6],
            initial: [[], ['J','B','B','B'], ['Y','Y','Y'], ['R','R','R'], [], [], ['B','R','R']],
            target:  [['B','B','B','B'], ['J','Y','Y','Y'], [], ['R','R'], [], [], ['R','R','R']],
            optimalMoves: 8
          }
        },
        {
          title: 'המבחנה הכחולה',
          teaser: 'הלקוח דורש סגול. במעבדה אין סגול, אבל מחר מגיע מערבל: אדום וכחול שנפגשים בו הופכים לסגול.',
          level: {
            capacities: [4, 4, 4, 4, 4, 4, 4],
            centrifuges: [6],
            tubeColors: [null, null, null, null, 'B', null, null],
            initial: [['B','B','B','B'], ['J','Y','Y','Y'], [], ['R','R'], [], [], ['R','R','R']],
            target:  [['Y','Y','Y'], [], ['R','R'], ['R','R','R'], ['J','B','B','B'], [], ['B']],
            optimalMoves: 14
          }
        },
        {
          title: 'סגול ראשון',
          teaser: 'שני כדורים במעבדה מתחילים להתקשות: לכל אחד נשאר מהלך אחד בלבד. הכן את המערבל לפני שנוגעים בהם.',
          level: {
            capacities: [4, 4, 4, 4, 4, 4, 4],
            centrifuges: [6],
            tubeColors: [null, null, null, null, 'B', null, null],
            blenders: [5],
            initial: [['Y','Y','Y'], [], ['R','R'], ['R','R','R'], ['J','B','B','B'], [], ['B']],
            target:  [['P','P'], ['Y','Y','Y'], [], ['R','R','R'], ['J','B','B'], [], []],
            optimalMoves: 9
          }
        },
        {
          title: 'כדורים מתקשים',
          teaser: 'מחר מגיע המשלוח האחרון, ומדף הסגול נחתם עד ששני סגולים חדשים יעמדו במקומם. הג׳וקר נכנס אחרון.',
          level: {
            capacities: [4, 4, 4, 4, 4, 4, 4],
            centrifuges: [6],
            tubeColors: [null, null, null, null, 'B', null, null],
            blenders: [5],
            initial: [['P','P'], ['Y','Y','Y'], [], ['R','R','R1'], ['J','B','B1'], [], []],
            target:  [['Y','Y','Y'], ['R','R'], [], ['J','B'], [], [], ['P','P','P']],
            optimalMoves: 13
          }
        },
        {
          title: 'המשלוח האחרון',
          teaser: 'העונה הבאה: הלקוח מבקש משהו שאף מעבדה לא ייצרה עדיין — ירוק מתוך צהוב.',
          level: {
            capacities: [4, 4, 4, 4, 4, 4, 4, 4],
            centrifuges: [6],
            tubeColors: [null, null, null, null, 'B', null, null, null],
            blenders: [5],
            locks: [{ tubeIndex: 6, until: { tube: 0 } }],
            initial: [['Y','Y','Y'], ['R','R'], [], ['J','B1'], [], [], ['P','P','P'], ['B','R']],
            target:  [['P','P'], ['R'], [], [], [], [], ['J','P','P','P'], ['Y','Y','Y']],
            optimalMoves: 10
          }
        }
      ]
    }
  ];

  function getDateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function daysBetween(fromKey, toKey) {
    const [y1, m1, d1] = fromKey.split('-').map(Number);
    const [y2, m2, d2] = toKey.split('-').map(Number);
    const a = Date.UTC(y1, m1 - 1, d1), b = Date.UTC(y2, m2 - 1, d2);
    return Math.round((b - a) / 86400000);
  }

  // Continuity check used by tests and by the level designer: episode k+1
  // must start where episode k ended on every shared tube.
  function checkContinuity(season) {
    const problems = [];
    for (let i = 0; i + 1 < season.episodes.length; i++) {
      const prev = season.episodes[i].level, next = season.episodes[i + 1].level;
      if (next.initial.length < prev.target.length) {
        problems.push({ episode: i + 2, problem: 'fewer tubes than the previous target' });
        continue;
      }
      prev.target.forEach((stack, t) => {
        const a = stack.map(b => b[0]).join(''), b = next.initial[t].map(x => x[0]).join('');
        if (a !== b) problems.push({ episode: i + 2, tube: t, problem: `expected ${a || '∅'} from the previous target, got ${b || '∅'}` });
      });
    }
    return problems;
  }

  // Progress record: { seasonId, startKey, solved: { '0': { moves, stars }, ... } }
  function seasonProgress(season, record, todayKey) {
    const rec = record && record.seasonId === season.id ? record : null;
    const solved = (rec && rec.solved) || {};
    const started = !!(rec && rec.startKey);
    const dayIndex = started ? Math.max(0, daysBetween(rec.startKey, todayKey)) : 0;
    const total = season.episodes.length;
    let firstUnsolved = 0;
    while (firstUnsolved < total && solved[String(firstUnsolved)]) firstUnsolved++;
    // Episode i is playable when every earlier episode is solved and its day has come.
    const availableIndex = Math.min(firstUnsolved, dayIndex, total - 1);
    const complete = firstUnsolved >= total;
    const waitingForTomorrow = !complete && firstUnsolved > dayIndex;
    return {
      started, dayIndex, solvedCount: Object.keys(solved).length, total, complete,
      currentIndex: complete ? total - 1 : availableIndex,
      waitingForTomorrow,
      isPlayable: (i) => i < total && (i <= dayIndex) && (i === 0 || !!solved[String(i - 1)]),
      isSolved: (i) => !!solved[String(i)]
    };
  }

  return { SERIAL_SEASONS, checkContinuity, daysBetween, getDateKey, seasonProgress };
});
