import type { PlayerId, Score, SetScore, MatchState, MatchConfig, GameEvent } from './types';

let _eventIdCounter = 0;
function eventId(): string {
  return `evt_${Date.now()}_${++_eventIdCounter}`;
}

function newId(): string {
  return `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function oppositePlayer(p: PlayerId): PlayerId {
  return p === 'A' ? 'B' : 'A';
}

export function determineServer(
  currentScore: Score,
  firstServer: PlayerId,
  pointsPerSet: number
): PlayerId {
  const totalPoints = currentScore.A + currentScore.B;
  const isDeuce = currentScore.A >= pointsPerSet - 1 && currentScore.B >= pointsPerSet - 1
    && Math.abs(currentScore.A - currentScore.B) <= 1
    && currentScore.A >= 10 && currentScore.B >= 10;

  if (isDeuce) {
    return totalPoints % 2 === 0 ? firstServer : oppositePlayer(firstServer);
  }

  return Math.floor(totalPoints / 2) % 2 === 0
    ? firstServer
    : oppositePlayer(firstServer);
}

export function isSetOver(score: Score, pointsPerSet: number, winByTwo: boolean): boolean {
  if (winByTwo) {
    return (score.A >= pointsPerSet || score.B >= pointsPerSet)
      && Math.abs(score.A - score.B) >= 2;
  }
  return score.A >= pointsPerSet || score.B >= pointsPerSet;
}

export function isMatchOver(sets: SetScore[], bestOf: number): PlayerId | null {
  const needed = Math.ceil(bestOf / 2);
  let aWins = 0, bWins = 0;
  for (const s of sets) {
    if (s.winner === 'A') aWins++;
    else if (s.winner === 'B') bWins++;
  }
  if (aWins >= needed) return 'A';
  if (bWins >= needed) return 'B';
  return null;
}

export function createSet(number: number): SetScore {
  return { number, score: { A: 0, B: 0 }, winner: null };
}

export function createMatch(
  config: MatchConfig,
  playerA: { name: string; color: string },
  playerB: { name: string; color: string }
): MatchState {
  const firstServer: PlayerId =
    config.firstServer === 'random'
      ? (Math.random() < 0.5 ? 'A' : 'B')
      : config.firstServer;

  return {
    id: newId(),
    playerA: { name: playerA.name, color: playerA.color },
    playerB: { name: playerB.name, color: playerB.color },
    sets: [createSet(1)],
    currentSet: 0,
    server: firstServer,
    winner: null,
    startTime: Date.now(),
    endTime: null,
    config,
  };
}

export function incrementScore(
  state: MatchState,
  player: PlayerId
): { state: MatchState; events: GameEvent[] } {
  const events: GameEvent[] = [];

  if (state.winner) return { state, events };

  const next: MatchState = structuredClone(state);
  const set = next.sets[next.currentSet];

  if (!set || set.winner) return { state, events };

  set.score[player]++;

  events.push({
    id: eventId(),
    type: 'point',
    timestamp: Date.now(),
    player,
    score: { ...set.score },
    server: next.server,
  });

  if (isSetOver(set.score, next.config.pointsPerSet, next.config.winByTwo)) {
    set.winner = player;

    events.push({
      id: eventId(),
      type: 'set_won',
      timestamp: Date.now(),
      player,
      set: set.number,
    });

    const matchWinner = isMatchOver(next.sets, next.config.bestOf);
    if (matchWinner) {
      next.winner = matchWinner;
      next.endTime = Date.now();
      events.push({
        id: eventId(),
        type: 'match_won',
        timestamp: Date.now(),
        player: matchWinner,
      });
    } else {
      next.sets.push(createSet(set.number + 1));
      next.currentSet = set.number;

      const firstServerThisSet = next.config.autoServiceSwitch
        ? (next.currentSet % 2 === 0
          ? next.server
          : oppositePlayer(next.server))
        : next.server;
      next.server = firstServerThisSet;
    }
  } else {
    const firstServerThisSet = next.config.autoServiceSwitch
      ? (next.currentSet % 2 === 0
        ? (next.config.firstServer === 'random' ? next.server : next.config.firstServer)
        : oppositePlayer(next.config.firstServer === 'random' ? next.server : next.config.firstServer))
      : next.config.firstServer;

    const actualFirstServer = typeof firstServerThisSet === 'string' && (firstServerThisSet === 'A' || firstServerThisSet === 'B')
      ? firstServerThisSet as PlayerId
      : (next.config.firstServer === 'A' || next.config.firstServer === 'B' ? next.config.firstServer : 'A');

    if (next.config.firstServer === 'random') {
      next.server = determineServer(set.score, next.server as PlayerId, next.config.pointsPerSet);
    } else {
      const fs = next.currentSet % 2 === 0
        ? next.config.firstServer as PlayerId
        : oppositePlayer(next.config.firstServer as PlayerId);
      next.server = determineServer(set.score, fs, next.config.pointsPerSet);
    }
  }

  return { state: next, events };
}

export function decrementScore(
  state: MatchState,
  player: PlayerId,
  preventNegative: boolean
): { state: MatchState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  if (state.winner) return { state, events };

  const next: MatchState = structuredClone(state);
  const set = next.sets[next.currentSet];
  if (!set) return { state, events };

  if (preventNegative && set.score[player] <= 0) return { state, events };
  if (set.score[player] <= 0) return { state, events };

  set.score[player]--;

  if (set.winner) {
    set.winner = null;
    next.winner = null;
    next.endTime = null;
  }

  // Recalculate server after score change
  const firstServer = next.currentSet % 2 === 0
    ? (next.config.firstServer === 'random' ? next.server : next.config.firstServer as PlayerId)
    : oppositePlayer(next.config.firstServer === 'random' ? oppositePlayer(next.server) : next.config.firstServer as PlayerId);

  const actualFirstServer: PlayerId =
    next.config.firstServer === 'A' || next.config.firstServer === 'B'
      ? (next.currentSet % 2 === 0
        ? next.config.firstServer as PlayerId
        : oppositePlayer(next.config.firstServer as PlayerId))
      : (next.currentSet % 2 === 0 ? next.server : oppositePlayer(next.server));

  next.server = determineServer(set.score, actualFirstServer, next.config.pointsPerSet);

  events.push({
    id: eventId(),
    type: 'point',
    timestamp: Date.now(),
    player,
    score: { ...set.score },
    server: next.server,
  });

  return { state: next, events };
}

export function getMatchSummary(state: MatchState): {
  winner: PlayerId | null;
  sets: string;
  duration: number;
  date: string;
} {
  const setStrs = state.sets
    .filter(s => s.score.A > 0 || s.score.B > 0)
    .map(s => `${s.score.A}-${s.score.B}`);
  return {
    winner: state.winner,
    sets: setStrs.join(', '),
    duration: state.endTime ? state.endTime - state.startTime : Date.now() - state.startTime,
    date: new Date(state.startTime).toISOString(),
  };
}
