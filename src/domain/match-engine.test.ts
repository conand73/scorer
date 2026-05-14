import { describe, it, expect } from 'vitest';
import {
  createMatch,
  incrementScore,
  decrementScore,
  createSet,
  oppositePlayer,
  determineServer,
  firstServerOfSet,
  isSetOver,
  isMatchOver,
  getMatchSummary,
} from './match-engine';
import type { MatchConfig, PlayerId, MatchState } from './types';

function makeConfig(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    pointsPerSet: 11,
    bestOf: 5,
    winByTwo: true,
    firstServer: 'A',
    autoServiceSwitch: true,
    autoSideSwitch: true,
    ...overrides,
  };
}

function createTestMatch(overrides?: Partial<MatchConfig>): MatchState {
  return createMatch(
    makeConfig(overrides),
    { name: 'Alice', color: '#00f' },
    { name: 'Bob', color: '#f00' },
  );
}

/** Convenience: increment and return the new state */
function inc(state: MatchState, player: PlayerId): MatchState {
  return incrementScore(state, player).state;
}

/** Convenience: decrement and return the new state */
function dec(state: MatchState, player: PlayerId, preventNegative = true): MatchState {
  return decrementScore(state, player, preventNegative).state;
}

/** Score the current set */
function curScore(state: MatchState) {
  const s = state.sets[state.currentSet];
  return s ? `${s.score.A}-${s.score.B}` : '???';
}

// ----------------------------------------------------------------
//  determineServer()
// ----------------------------------------------------------------
describe('determineServer', () => {
  it('0-0 → firstServer serves', () => {
    expect(determineServer({ A: 0, B: 0 }, 'A', 11)).toBe('A');
    expect(determineServer({ A: 0, B: 0 }, 'B', 11)).toBe('B');
  });

  it('1-0 → same server (first of 2-point block)', () => {
    expect(determineServer({ A: 1, B: 0 }, 'A', 11)).toBe('A');
  });

  it('2-0 → server switches after 2 points', () => {
    expect(determineServer({ A: 2, B: 0 }, 'A', 11)).toBe('B');
  });

  it('2-1 → same server during opponent block', () => {
    expect(determineServer({ A: 2, B: 1 }, 'A', 11)).toBe('B');
  });

  it('2-2 → back to first server after 4 points', () => {
    expect(determineServer({ A: 2, B: 2 }, 'A', 11)).toBe('A');
  });

  it('4-0 → back to first server (third 2-point block)', () => {
    // total=4, floor(4/2)=2, 2%2=0 → firstServer ('A')
    expect(determineServer({ A: 4, B: 0 }, 'A', 11)).toBe('A');
  });

  it('9-8 → normal rotation still (not deuce yet)', () => {
    // 17 total = 8 pairs + 1, so 8 % 2 = 0 → first server
    expect(determineServer({ A: 9, B: 8 }, 'A', 11)).toBe('A');
  });

  it('10-8 → not deuce (diff = 2), normal rotation', () => {
    // 18 total, 18/2 = 9, 9%2 = 1 → opposite
    expect(determineServer({ A: 10, B: 8 }, 'A', 11)).toBe('B');
  });

  it('10-9 → not deuce (B < pointsPerSet-1), normal rotation', () => {
    // B=9 < 10, not deuce. 19 total, floor(19/2)=9, 9%2=1 → opposite
    expect(determineServer({ A: 10, B: 9 }, 'A', 11)).toBe('B');
  });

  it('10-10 → deuce starts, switch every point (even total = first)', () => {
    // 20 total, even → first server
    expect(determineServer({ A: 10, B: 10 }, 'A', 11)).toBe('A');
  });

  it('11-10 → deuce, odd total → switch', () => {
    expect(determineServer({ A: 11, B: 10 }, 'A', 11)).toBe('B');
  });

  it('11-11 → deuce, even total → first', () => {
    expect(determineServer({ A: 11, B: 11 }, 'A', 11)).toBe('A');
  });

  it('12-11 → deuce, odd total → switch', () => {
    expect(determineServer({ A: 12, B: 11 }, 'A', 11)).toBe('B');
  });

  it('13-12 → deuce, odd total → switch', () => {
    expect(determineServer({ A: 13, B: 12 }, 'A', 11)).toBe('B');
  });

  it('deuce with firstServer=B', () => {
    expect(determineServer({ A: 10, B: 10 }, 'B', 11)).toBe('B');
    expect(determineServer({ A: 11, B: 10 }, 'B', 11)).toBe('A');
  });

  it('pointsPerSet=21 uses 20 as deuce threshold', () => {
    // 19-19: not deuce (19 < 20). total=38, floor(38/2)=19, 19%2=1 → opposite
    expect(determineServer({ A: 19, B: 19 }, 'A', 21)).toBe('B');
    // 20-20: deuce starts (both >= 20), even total → first server
    expect(determineServer({ A: 20, B: 20 }, 'A', 21)).toBe('A');
    // 21-20: deuce, odd total → opposite
    expect(determineServer({ A: 21, B: 20 }, 'A', 21)).toBe('B');
  });
});

// ----------------------------------------------------------------
//  firstServerOfSet()
// ----------------------------------------------------------------
describe('firstServerOfSet', () => {
  it('set 0 → match first server', () => {
    expect(firstServerOfSet('A', 0)).toBe('A');
    expect(firstServerOfSet('B', 0)).toBe('B');
  });

  it('set 1 → opposite', () => {
    expect(firstServerOfSet('A', 1)).toBe('B');
    expect(firstServerOfSet('B', 1)).toBe('A');
  });

  it('set 2 → back to match first server', () => {
    expect(firstServerOfSet('A', 2)).toBe('A');
  });

  it('set 3 → opposite again', () => {
    expect(firstServerOfSet('A', 3)).toBe('B');
  });
});

// ----------------------------------------------------------------
//  isSetOver / isMatchOver
// ----------------------------------------------------------------
describe('isSetOver', () => {
  it('11-9 with winByTwo → true', () => {
    expect(isSetOver({ A: 11, B: 9 }, 11, true)).toBe(true);
  });

  it('11-10 with winByTwo → false (need 2 clear)', () => {
    expect(isSetOver({ A: 11, B: 10 }, 11, true)).toBe(false);
  });

  it('12-10 with winByTwo → true', () => {
    expect(isSetOver({ A: 12, B: 10 }, 11, true)).toBe(true);
  });

  it('11-0 with winByTwo → true', () => {
    expect(isSetOver({ A: 11, B: 0 }, 11, true)).toBe(true);
  });

  it('21-19 with winByTwo, pointsPerSet=21 → true', () => {
    expect(isSetOver({ A: 21, B: 19 }, 21, true)).toBe(true);
  });

  it('11-9 without winByTwo → true', () => {
    expect(isSetOver({ A: 11, B: 9 }, 11, false)).toBe(true);
  });

  it('9-11 without winByTwo → true', () => {
    expect(isSetOver({ A: 9, B: 11 }, 11, false)).toBe(true);
  });

  it('10-10 without winByTwo → false', () => {
    expect(isSetOver({ A: 10, B: 10 }, 11, false)).toBe(false);
  });
});

describe('isMatchOver', () => {
  it('bestOf=5, 3 sets → match over', () => {
    const sets = [
      { number: 1, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
      { number: 2, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
      { number: 3, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
    ];
    expect(isMatchOver(sets, 5)).toBe('A');
  });

  it('bestOf=5, 2-1 sets → not over', () => {
    const sets = [
      { number: 1, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
      { number: 2, score: { A: 0, B: 11 }, winner: 'B' as PlayerId },
      { number: 3, score: { A: 11, B: 9 }, winner: 'A' as PlayerId },
    ];
    expect(isMatchOver(sets, 5)).toBeNull();
  });

  it('bestOf=3, 2-0 → match over', () => {
    const sets = [
      { number: 1, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
      { number: 2, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
    ];
    expect(isMatchOver(sets, 3)).toBe('A');
  });

  it('bestOf=3, 1-1 → not over', () => {
    const sets = [
      { number: 1, score: { A: 11, B: 0 }, winner: 'A' as PlayerId },
      { number: 2, score: { A: 0, B: 11 }, winner: 'B' as PlayerId },
    ];
    expect(isMatchOver(sets, 3)).toBeNull();
  });
});

// ----------------------------------------------------------------
//  createMatch()
// ----------------------------------------------------------------
describe('createMatch', () => {
  it('creates match with firstServer=A', () => {
    const m = createTestMatch({ firstServer: 'A' });
    expect(m.server).toBe('A');
    expect(m.config.firstServer).toBe('A');
    expect(m.sets).toHaveLength(1);
    expect(m.sets[0].score).toEqual({ A: 0, B: 0 });
    expect(m.currentSet).toBe(0);
    expect(m.winner).toBeNull();
  });

  it('resolves random firstServer to concrete value', () => {
    const results = new Set<PlayerId>();
    for (let i = 0; i < 20; i++) {
      const m = createMatch(
        { ...makeConfig(), firstServer: 'random' },
        { name: 'A', color: '#aaa' },
        { name: 'B', color: '#bbb' },
      );
      results.add(m.config.firstServer as PlayerId);
    }
    // Should have at least one A and one B (very high probability)
    expect(results.has('A')).toBe(true);
    expect(results.has('B')).toBe(true);
    // Should never still be 'random'
    expect(results.has('random' as any)).toBe(false);
  });
});

// ----------------------------------------------------------------
//  incrementScore – server rotation integration
// ----------------------------------------------------------------
describe('incrementScore – server rotation', () => {
  it('starts with configured server at 0-0', () => {
    const m = createTestMatch({ firstServer: 'A' });
    expect(m.server).toBe('A');
    expect(curScore(m)).toBe('0-0');
  });

  it('1-0: same server (first of block)', () => {
    const m = inc(createTestMatch({ firstServer: 'A' }), 'A');
    expect(curScore(m)).toBe('1-0');
    expect(m.server).toBe('A');
  });

  it('2-0: server switches', () => {
    const m = createTestMatch({ firstServer: 'A' });
    const m2 = inc(inc(m, 'A'), 'A');
    expect(curScore(m2)).toBe('2-0');
    expect(m2.server).toBe('B');
  });

  it('2-1: B server (still in same block)', () => {
    const m = createTestMatch({ firstServer: 'A' });
    const m2 = inc(inc(inc(m, 'A'), 'A'), 'B');
    expect(curScore(m2)).toBe('2-1');
    expect(m2.server).toBe('B');
  });

  it('2-2: back to A server', () => {
    const m = createTestMatch({ firstServer: 'A' });
    const m2 = inc(inc(inc(inc(m, 'A'), 'A'), 'B'), 'B');
    expect(curScore(m2)).toBe('2-2');
    expect(m2.server).toBe('A');
  });

  it('10-10: deuce, even total → first server serves', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // Fast forward to 10-10
    for (let i = 0; i < 10; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    expect(curScore(m)).toBe('10-10');
    expect(m.server).toBe('A');
  });

  it('11-10: deuce, odd total → server switches', () => {
    let m = createTestMatch({ firstServer: 'A' });
    for (let i = 0; i < 10; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    m = inc(m, 'A');
    expect(curScore(m)).toBe('11-10');
    expect(m.server).toBe('B');
  });

  it('11-11: deuce, even total → server switches back', () => {
    let m = createTestMatch({ firstServer: 'A' });
    for (let i = 0; i < 10; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    m = inc(m, 'A');
    m = inc(m, 'B');
    expect(curScore(m)).toBe('11-11');
    expect(m.server).toBe('A');
  });

  it('12-11: deuce, odd total → server switches', () => {
    let m = createTestMatch({ firstServer: 'A' });
    for (let i = 0; i < 10; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    m = inc(m, 'A'); m = inc(m, 'B'); m = inc(m, 'A');
    expect(curScore(m)).toBe('12-11');
    expect(m.server).toBe('B');
  });

  it('set win creates new set with alternating first server', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // Run to 11-0
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets).toHaveLength(2);
    expect(m.currentSet).toBe(1);
    // Set 2: first server should alternate → B
    expect(m.server).toBe('B');
  });

  it('set win in set 2 alternates back to original server', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // Win set 1
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    // Win set 2
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets).toHaveLength(3);
    expect(m.currentSet).toBe(2);
    // Set 3: first server → A again
    expect(m.server).toBe('A');
  });
});

// ----------------------------------------------------------------
//  autoServiceSwitch = false
// ----------------------------------------------------------------
describe('autoServiceSwitch = false', () => {
  it('server stays the same after points', () => {
    let m = createTestMatch({ firstServer: 'A', autoServiceSwitch: false });
    expect(m.server).toBe('A');
    m = inc(m, 'A'); // 1-0
    expect(m.server).toBe('A');
    m = inc(m, 'A'); // 2-0
    expect(m.server).toBe('A');
    m = inc(m, 'B'); // 2-1
    expect(m.server).toBe('A');
    m = inc(m, 'B'); // 2-2
    expect(m.server).toBe('A');
    // Even into deuce territory
    for (let i = 0; i < 8; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    expect(m.server).toBe('A');
  });

  it('server stays the same after set win', () => {
    let m = createTestMatch({ firstServer: 'A', autoServiceSwitch: false });
    // Win set 1
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.server).toBe('A');
    // Win set 2
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.server).toBe('A');
  });
});

// ----------------------------------------------------------------
//  decrementScore
// ----------------------------------------------------------------
describe('decrementScore', () => {
  it('basic decrement: 2-0 → 1-0 restores server A', () => {
    let m = createTestMatch({ firstServer: 'A' });
    m = inc(m, 'A');
    m = inc(m, 'A'); // 2-0, server=B
    expect(m.server).toBe('B');
    m = dec(m, 'A'); // 1-0, should be server A
    expect(curScore(m)).toBe('1-0');
    expect(m.server).toBe('A');
  });

  it('decrement from 10-10 to 10-9 restores pre-deuce rotation (2-point)', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // Go to 10-10
    for (let i = 0; i < 10; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    expect(m.server).toBe('A'); // deuce, even total

    // now decrement B to get 10-9
    m = dec(m, 'B');
    expect(curScore(m)).toBe('10-9');
    // 19 total, floor(19/2)=9, 9%2=1 → opposite
    expect(m.server).toBe('B');
  });

  it('decrement from 11-10 (deuce) to 10-10 restores deuce rotation', () => {
    let m = createTestMatch({ firstServer: 'A' });
    for (let i = 0; i < 10; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    m = inc(m, 'A'); // 11-10, server=B
    expect(m.server).toBe('B');

    m = dec(m, 'A'); // 10-10, server=A (even)
    expect(curScore(m)).toBe('10-10');
    expect(m.server).toBe('A');
  });

  it('preventNegative: cannot decrement below 0', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // m is at 0-0
    const result = decrementScore(m, 'A', true);
    expect(result.events).toHaveLength(0); // no-op
  });

  it('preventNegative=false: can go negative', () => {
    let m = createTestMatch({ firstServer: 'A' });
    const result = decrementScore(m, 'A', false);
    expect(result.events).toHaveLength(1);
    expect(result.state.sets[0].score.A).toBe(-1);
  });
});

// ----------------------------------------------------------------
//  decrementScore – set rollback
// ----------------------------------------------------------------
describe('decrementScore – set rollback', () => {
  it('decrementing set-winning point rolls back the set and removes next set', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // Score to 10-0
    for (let i = 0; i < 10; i++) m = inc(m, 'A');
    expect(m.currentSet).toBe(0);
    expect(curScore(m)).toBe('10-0');

    // One more point wins the set and creates set 2
    m = inc(m, 'A'); // 11-0, set 1 won, set 2 created
    expect(m.sets).toHaveLength(2);
    expect(m.currentSet).toBe(1);
    expect(m.sets[0].winner).toBe('A');

    // Now decrement A – should roll back, remove set 2, and go to 10-0 in set 1
    m = dec(m, 'A');
    expect(m.sets).toHaveLength(1); // set 2 removed
    expect(m.currentSet).toBe(0);
    expect(curScore(m)).toBe('10-0');
    expect(m.sets[0].winner).toBeNull(); // set winner cleared
    expect(m.winner).toBeNull();
  });

  it('undo match point reopens match and removes extra set', () => {
    let m = createTestMatch({ firstServer: 'A', bestOf: 3 });
    // Win set 1: A wins 11-0
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    // Win set 2: A wins 11-0 → match over at 2-0
    for (let i = 0; i < 11; i++) m = inc(m, 'A');

    expect(m.winner).toBe('A');
    expect(m.endTime).not.toBeNull();
    expect(m.sets).toHaveLength(2); // no set 3 created (match ended)

    // Decrement the match-winning point → reopens match
    const result = decrementScore(m, 'A', true);
    expect(result.events).toHaveLength(1);
    expect(result.state.winner).toBeNull();
    expect(result.state.endTime).toBeNull();
    expect(result.state.sets[1].winner).toBeNull();
    expect(result.state.sets[1].score.A).toBe(10);
  });
});

// ----------------------------------------------------------------
//  Full match scenarios
// ----------------------------------------------------------------
describe('match flow', () => {
  it('best of 5, A wins 3-0', () => {
    let m = createTestMatch({ firstServer: 'A', bestOf: 5 });
    // Set 1: A wins 11-0
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets[0].winner).toBe('A');
    expect(m.winner).toBeNull();
    expect(m.currentSet).toBe(1);

    // Set 2: B's serve first (alternating), but A still wins 11-0
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets[1].winner).toBe('A');
    expect(m.winner).toBeNull();
    expect(m.currentSet).toBe(2);

    // Set 3: A's serve, A wins 11-0 → match over
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets[2].winner).toBe('A');
    expect(m.winner).toBe('A');
    expect(m.endTime).not.toBeNull();
  });

  it('best of 3, B wins 2-1 with deuce in final set', () => {
    let m = createTestMatch({ firstServer: 'A', bestOf: 3 });
    // Set 1: B wins 11-9
    for (let i = 0; i < 9; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    m = inc(m, 'B'); m = inc(m, 'B'); // 9-11
    expect(m.sets[0].winner).toBe('B');

    // Set 2: A wins 11-7
    m = createTestMatch({ firstServer: 'A', bestOf: 3 });
    for (let i = 0; i < 7; i++) { m = inc(m, 'A'); m = inc(m, 'B'); }
    m = inc(m, 'A'); m = inc(m, 'A'); m = inc(m, 'A'); m = inc(m, 'A'); // 11-7
    expect(m.sets[0].winner).toBe('A');

    // Reset and do it properly
    m = createTestMatch({ firstServer: 'A', bestOf: 3 });
    // Set 1 to B: force manually
    for (let i = 0; i < 11; i++) m = inc(m, 'B'); // B wins 0-11
    expect(m.sets[0].winner).toBe('B');
    // Set 2 to A: need 11 points
    for (let i = 0; i < 11; i++) m = inc(m, 'A'); // A wins 11-0
    expect(m.sets[1].winner).toBe('A');

    // Set 3: deuce, B wins 13-11
    for (let i = 0; i < 11; i++) { m = inc(m, 'A'); m = inc(m, 'B'); } // 11-11
    m = inc(m, 'B'); m = inc(m, 'B'); // 11-13
    expect(m.sets[2].winner).toBe('B');
    expect(m.winner).toBe('B');
    expect(m.sets).toHaveLength(3);
  });

  it('match winning point creates only one new set, then match ends', () => {
    let m = createTestMatch({ firstServer: 'A', bestOf: 3 });
    // Win set 1
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets).toHaveLength(2);

    // Win set 2 → match over at 2-0
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    expect(m.sets).toHaveLength(2); // no set 3 created
    expect(m.winner).toBe('A');
  });
});

// ----------------------------------------------------------------
//  Undo via snapshot (simulates match-store behavior)
// ----------------------------------------------------------------
describe('snapshot undo compatibility', () => {
  it('snapshot taken before increment restores exact state', () => {
    const m = createTestMatch({ firstServer: 'A' });
    const snapshot = structuredClone(m);

    const m2 = inc(m, 'A'); // 1-0

    // Restore from snapshot
    expect(snapshot).toEqual(m);
    // The snapshot should equal the original (before increment)
    expect(snapshot.sets[0].score.A).toBe(0);
    expect(snapshot.server).toBe('A');
  });

  it('snapshot before set-winning point captures pre-new-set state', () => {
    let m = createTestMatch({ firstServer: 'A' });
    // Go to 10-0
    for (let i = 0; i < 10; i++) m = inc(m, 'A');

    const snapshot = structuredClone(m);

    // Winning point
    m = inc(m, 'A');
    expect(m.sets).toHaveLength(2);
    expect(m.currentSet).toBe(1);

    // Restore snapshot
    m = snapshot;
    expect(m.sets).toHaveLength(1);
    expect(m.currentSet).toBe(0);
    expect(curScore(m)).toBe('10-0');
    expect(m.sets[0].winner).toBeNull();
  });

  it('multiple snapshots: each captures intermediary state', () => {
    let m = createTestMatch({ firstServer: 'A' });
    const snaps: MatchState[] = [];

    snaps.push(structuredClone(m));
    m = inc(m, 'A'); // 1-0

    snaps.push(structuredClone(m));
    m = inc(m, 'A'); // 2-0

    snaps.push(structuredClone(m));
    m = inc(m, 'B'); // 2-1

    // Undo last (restore snap[2])
    m = snaps[2];
    expect(curScore(m)).toBe('2-0');
    expect(m.server).toBe('B');

    // Undo again (restore snap[1])
    m = snaps[1];
    expect(curScore(m)).toBe('1-0');
    expect(m.server).toBe('A');

    // Undo again (restore snap[0])
    m = snaps[0];
    expect(curScore(m)).toBe('0-0');
    expect(m.server).toBe('A');
  });
});

// ----------------------------------------------------------------
//  getMatchSummary
// ----------------------------------------------------------------
describe('getMatchSummary', () => {
  it('returns summary for finished match', () => {
    let m = createTestMatch({ firstServer: 'A', bestOf: 3 });
    for (let i = 0; i < 11; i++) m = inc(m, 'A');
    for (let i = 0; i < 11; i++) m = inc(m, 'A');

    const summary = getMatchSummary(m);
    expect(summary.winner).toBe('A');
    expect(summary.sets).toBe('11-0, 11-0');
    expect(summary.duration).toBeGreaterThanOrEqual(0);
    expect(summary.date).toBeTruthy();
  });

  it('returns summary for ongoing match', () => {
    let m = createTestMatch({ firstServer: 'A' });
    m = inc(m, 'A');
    m = inc(m, 'B');

    const summary = getMatchSummary(m);
    expect(summary.winner).toBeNull();
    expect(summary.sets).toBe('1-1');
  });
});

// ----------------------------------------------------------------
//  oppositePlayer
// ----------------------------------------------------------------
describe('oppositePlayer', () => {
  it('A → B', () => expect(oppositePlayer('A')).toBe('B'));
  it('B → A', () => expect(oppositePlayer('B')).toBe('A'));
});
