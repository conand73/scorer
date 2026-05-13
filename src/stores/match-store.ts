import { create } from 'zustand';
import type { PlayerId, MatchState, MatchConfig, PlayerConfig, SnapshotEntry } from '../domain/types';
import { createMatch, incrementScore, decrementScore, getMatchSummary } from '../domain/match-engine';

interface MatchStore {
  match: MatchState | null;
  snapshots: SnapshotEntry[];
  summary: ReturnType<typeof getMatchSummary> | null;
  lastActionPlayer: PlayerId | null;

  startMatch: (config: MatchConfig, playerA: PlayerConfig, playerB: PlayerConfig) => void;
  increment: (player: PlayerId) => void;
  decrement: (player: PlayerId, preventNegative: boolean) => void;
  undo: () => void;
  endMatch: () => void;
  resetMatch: () => void;
  restoreMatch: (match: MatchState) => void;
  isDeuce: () => boolean;
  isSetPoint: () => boolean;
  isMatchPoint: () => boolean;
  canUndo: () => boolean;
  canPlayerUndo: (player: PlayerId) => boolean;
}

function pushSnapshot(state: MatchStore['match'], snapshots: SnapshotEntry[], desc: string): SnapshotEntry[] {
  if (!state) return snapshots;
  return [
    ...snapshots.slice(-99),
    {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      state: structuredClone(state),
      description: desc,
    },
  ];
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  match: null,
  snapshots: [],
  summary: null,
  lastActionPlayer: null,

  startMatch: (config, playerA, playerB) => {
    const match = createMatch(config, playerA, playerB);
    set({ match, snapshots: [], summary: null, lastActionPlayer: null });
  },

  increment: (player) => {
    const { match, snapshots } = get();
    if (!match) return;
    const { state: newState, events } = incrementScore(match, player);
    if (events.length === 0) return;
    const newSnapshots = pushSnapshot(match, snapshots, `+1 ${player}`);
    set({
      match: newState,
      snapshots: newSnapshots,
      summary: newState.endTime ? getMatchSummary(newState) : null,
      lastActionPlayer: player,
    });
  },

  decrement: (player, preventNegative) => {
    const { match, snapshots } = get();
    if (!match) return;
    const { state: newState, events } = decrementScore(match, player, preventNegative);
    if (events.length === 0) return;
    const newSnapshots = pushSnapshot(match, snapshots, `-1 ${player}`);
    set({
      match: newState,
      snapshots: newSnapshots,
      summary: null,
      lastActionPlayer: player,
    });
  },

  undo: () => {
    const { snapshots } = get();
    if (snapshots.length === 0) return;
    const last = snapshots[snapshots.length - 1];
    set({
      match: last.state,
      snapshots: snapshots.slice(0, -1),
      summary: null,
      lastActionPlayer: null,
    });
  },

  endMatch: () => {
    const { match } = get();
    if (!match) return;
    const ended = {
      ...match,
      winner: match.winner || undefined,
      endTime: match.endTime || Date.now(),
    } as MatchState;
    if (!ended.winner) {
      const aScore = ended.sets.reduce((sum, s) => sum + s.score.A, 0);
      const bScore = ended.sets.reduce((sum, s) => sum + s.score.B, 0);
      (ended as any).winner = aScore > bScore ? 'A' : bScore > aScore ? 'B' : undefined;
    }
    set({
      match: ended,
      summary: getMatchSummary(ended),
    });
  },

  resetMatch: () => {
    set({ match: null, snapshots: [], summary: null, lastActionPlayer: null });
  },

  restoreMatch: (match) => {
    set({ match: structuredClone(match), snapshots: [], summary: null, lastActionPlayer: null });
  },

  isDeuce: () => {
    const { match } = get();
    if (!match) return false;
    const set = match.sets[match.currentSet];
    if (!set) return false;
    return set.score.A >= 10 && set.score.B >= 10;
  },

  isSetPoint: () => {
    const { match } = get();
    if (!match) return false;
    const set = match.sets[match.currentSet];
    if (!set || set.winner) return false;
    const { pointsPerSet, winByTwo } = match.config;
    return (
      (set.score.A >= pointsPerSet - 1 && set.score.A > set.score.B) ||
      (set.score.B >= pointsPerSet - 1 && set.score.B > set.score.A)
    );
  },

  isMatchPoint: () => {
    const { match } = get();
    if (!match) return false;
    const set = match.sets[match.currentSet];
    if (!set || set.winner) return false;
    const { pointsPerSet, winByTwo, bestOf } = match.config;
    const setsNeeded = Math.ceil(bestOf / 2);
    let aSets = 0, bSets = 0;
    for (const s of match.sets) {
      if (s.winner === 'A') aSets++;
      if (s.winner === 'B') bSets++;
    }
    const isLeading = set.score.A > set.score.B;
    const leadingPlayer = isLeading ? 'A' : 'B';
    const leadingSets = leadingPlayer === 'A' ? aSets : bSets;
    if (leadingSets < setsNeeded - 1) return false;
    return (
      (set.score.A >= pointsPerSet - 1 && set.score.A > set.score.B) ||
      (set.score.B >= pointsPerSet - 1 && set.score.B > set.score.A)
    );
  },

  canUndo: () => {
    return get().snapshots.length > 0;
  },

  canPlayerUndo: (player) => {
    const { snapshots, lastActionPlayer } = get();
    return snapshots.length > 0 && lastActionPlayer === player;
  },
}));
