export type PlayerId = 'A' | 'B';

export interface Score {
  A: number;
  B: number;
}

export interface SetScore {
  number: number;
  score: Score;
  winner: PlayerId | null;
}

export interface PlayerConfig {
  name: string;
  color: string;
}

export interface MatchConfig {
  pointsPerSet: number;
  bestOf: number;
  winByTwo: boolean;
  firstServer: PlayerId | 'random';
  autoServiceSwitch: boolean;
  autoSideSwitch: boolean;
}

export interface MatchState {
  id: string;
  playerA: PlayerConfig;
  playerB: PlayerConfig;
  sets: SetScore[];
  currentSet: number;
  server: PlayerId;
  winner: PlayerId | null;
  startTime: number;
  endTime: number | null;
  config: MatchConfig;
}

export type GameEventType =
  | 'point'
  | 'undo'
  | 'set_won'
  | 'match_won'
  | 'match_start'
  | 'match_end'
  | 'server_change';

export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  player?: PlayerId;
  set?: number;
  score?: Score;
  server?: PlayerId;
}

export interface SnapshotEntry {
  id: string;
  timestamp: number;
  state: MatchState;
  description: string;
}

export interface MatchSummary {
  id: string;
  playerA: string;
  playerB: string;
  winner: PlayerId | null;
  sets: string;
  date: string;
  duration: number;
}

export interface AppSettings {
  playerAName: string;
  playerBName: string;
  playerAColor: string;
  playerBColor: string;
  invertSides: boolean;
  pointsPerSet: number;
  bestOf: number;
  winByTwo: boolean;
  firstServer: 'A' | 'B' | 'random';
  autoServiceSwitch: boolean;
  autoSideSwitch: boolean;
  enableTapIncrement: boolean;
  enableSwipeGestures: boolean;
  swipeSensitivity: number;
  preventNegativeScore: boolean;
  lockControlsAfterMatchEnd: boolean;
  enableVoiceCommands: boolean;
  audioConfirmation: boolean;
  voiceFeedbackVolume: number;
  announceScoreAfterPoint: boolean;
  announceSetPoint: boolean;
  announceMatchPoint: boolean;
  blindMode: boolean;
  giantNumbers: boolean;
  highContrast: boolean;
  vibration: boolean;
  wakeLock: boolean;
  hideMenusDuringMatch: boolean;
  darkMode: boolean;
  animationsEnabled: boolean;
  fontScaling: number;
  autoSaveMatches: boolean;
}

export type VoiceCommand = 'a_plus' | 'b_plus' | 'a_minus' | 'b_minus' | 'undo';

export type Page = 'start' | 'game' | 'settings';

export const DEFAULT_SETTINGS: AppSettings = {
  playerAName: 'Player A',
  playerBName: 'Player B',
  playerAColor: '#2563eb',
  playerBColor: '#dc2626',
  invertSides: false,
  pointsPerSet: 11,
  bestOf: 5,
  winByTwo: true,
  firstServer: 'random',
  autoServiceSwitch: true,
  autoSideSwitch: true,
  enableTapIncrement: true,
  enableSwipeGestures: true,
  swipeSensitivity: 5,
  preventNegativeScore: true,
  lockControlsAfterMatchEnd: true,
  enableVoiceCommands: false,
  audioConfirmation: true,
  voiceFeedbackVolume: 50,
  announceScoreAfterPoint: false,
  announceSetPoint: true,
  announceMatchPoint: true,
  blindMode: false,
  giantNumbers: false,
  highContrast: false,
  vibration: true,
  wakeLock: false,
  hideMenusDuringMatch: false,
  darkMode: true,
  animationsEnabled: true,
  fontScaling: 1,
  autoSaveMatches: true,
};
