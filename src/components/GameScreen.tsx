import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMatchStore } from '../stores/match-store';
import { useSettingsStore } from '../stores/settings-store';
import { PlayerHalf } from './PlayerHalf';
import { VoiceControl } from './VoiceControl';
import { AudioService } from '../services/audio-service';
import { PersistenceService } from '../services/persistence-service';
import { useWakeLock } from '../hooks/use-wake-lock';
import { useVibration } from '../hooks/use-vibration';
import { useKeyboard } from '../hooks/use-keyboard';
import type { VoiceCommand, Page } from '../domain/types';

interface GameScreenProps {
  onNavigate: (page: Page) => void;
}

export function GameScreen({ onNavigate }: GameScreenProps) {
  const match = useMatchStore((s) => s.match);
  const snapshots = useMatchStore((s) => s.snapshots);
  const increment = useMatchStore((s) => s.increment);
  const decrement = useMatchStore((s) => s.decrement);
  const undo = useMatchStore((s) => s.undo);
  const endMatch = useMatchStore((s) => s.endMatch);
  const isDeuce = useMatchStore((s) => s.isDeuce);
  const isSetPoint = useMatchStore((s) => s.isSetPoint);
  const isMatchPoint = useMatchStore((s) => s.isMatchPoint);
  const canUndo = useMatchStore((s) => s.canUndo);
  const resetMatch = useMatchStore((s) => s.resetMatch);

  const settings = useSettingsStore((s) => ({
    blindMode: s.blindMode,
    giantNumbers: s.giantNumbers,
    animationsEnabled: s.animationsEnabled,
    hideMenusDuringMatch: s.hideMenusDuringMatch,
    audioConfirmation: s.audioConfirmation,
    vibration: s.vibration,
    enableVoiceCommands: s.enableVoiceCommands,
    preventNegativeScore: s.preventNegativeScore,
    enableTapIncrement: s.enableTapIncrement,
    enableSwipeGestures: s.enableSwipeGestures,
    lockControlsAfterMatchEnd: s.lockControlsAfterMatchEnd,
    autoSaveMatches: s.autoSaveMatches,
  }));

  const vibrate = useVibration();
  const [showMenu, setShowMenu] = useState(false);
  const [flashPlayer, setFlashPlayer] = useState<'A' | 'B' | null>(null);
  const prevServerRef = useRef(match?.server);
  const prevScoreRef = useRef(match ? `${match.sets[match.currentSet]?.score.A}-${match.sets[match.currentSet]?.score.B}` : '0-0');

  useWakeLock(settings.blindMode);

  const isLocked = settings.lockControlsAfterMatchEnd && (match?.winner != null);

  // Auto-save match on changes
  useEffect(() => {
    if (match && settings.blindMode) {
      PersistenceService.saveActiveMatch(match);
    }
  }, [match, settings.blindMode]);

  // Save match to history when it ends
  useEffect(() => {
    if (match?.endTime && settings.autoSaveMatches) {
      const summary = {
        id: match.id,
        playerA: match.playerA.name,
        playerB: match.playerB.name,
        winner: match.winner,
        sets: match.sets.filter(s => s.score.A > 0 || s.score.B > 0).map(s => `${s.score.A}-${s.score.B}`).join(', '),
        date: new Date(match.startTime).toISOString(),
        duration: match.endTime - match.startTime,
      };
      PersistenceService.saveMatchHistory(match, summary as any);
      PersistenceService.clearActiveMatch();
    } else if (match && !match.endTime) {
      PersistenceService.saveActiveMatch(match);
    }
  }, [match?.endTime]);

  // Audio and haptic feedback on score changes
  useEffect(() => {
    if (!match) return;

    const set = match.sets[match.currentSet];
    if (!set) return;

    const currentScore = `${set.score.A}-${set.score.B}`;
    const prevScore = prevScoreRef.current;
    prevScoreRef.current = currentScore;

    if (currentScore === prevScore) return;

    const [aStr, bStr] = prevScore.split('-');
    const prevA = parseInt(aStr), prevB = parseInt(bStr);
    const isIncrement = set.score.A > prevA || set.score.B > prevB;
    const scoringPlayer = set.score.A > prevA ? 'A' : 'B';

    if (settings.vibration) {
      if (isIncrement) vibrate.increment();
      else vibrate.decrement();
    }

    if (settings.audioConfirmation) {
      if (match.winner) {
        AudioService.matchWon();
      } else if (set.winner) {
        AudioService.setWon();
      } else if (match.server !== prevServerRef.current) {
        AudioService.serveChange();
      } else if (isIncrement) {
        AudioService.increment();
      } else {
        AudioService.decrement();
      }
    }

    if (settings.animationsEnabled) {
      setFlashPlayer(scoringPlayer);
      setTimeout(() => setFlashPlayer(null), 200);
    }

    prevServerRef.current = match.server;
  }, [match?.sets]);

  // Voice commands
  const handleVoiceCommand = useCallback((cmd: VoiceCommand) => {
    if (!match || match.winner) return;
    if (settings.audioConfirmation) AudioService.voiceCommand();

    switch (cmd) {
      case 'a_plus': increment('A'); break;
      case 'b_plus': increment('B'); break;
      case 'a_minus': decrement('A', settings.preventNegativeScore); break;
      case 'b_minus': decrement('B', settings.preventNegativeScore); break;
      case 'undo': undo(); break;
    }
  }, [match, increment, decrement, undo, settings.audioConfirmation, settings.preventNegativeScore]);



  // Keyboard shortcuts
  useKeyboard({
    onIncrement: (p) => { if (!isLocked) increment(p); },
    onDecrement: (p) => { if (!isLocked) decrement(p, settings.preventNegativeScore); },
    onUndo: undo,
  });

  const handleIncrement = useCallback((player: 'A' | 'B') => {
    if (!isLocked) increment(player);
  }, [increment, isLocked]);

  const handleDecrement = useCallback((player: 'A' | 'B') => {
    if (!isLocked) decrement(player, settings.preventNegativeScore);
  }, [decrement, isLocked]);

  const handleTap = useCallback((player: 'A' | 'B') => {
    if (settings.enableTapIncrement && !isLocked) increment(player);
  }, [increment, settings.enableTapIncrement, isLocked]);

  const handleEndMatch = () => {
    endMatch();
  };

  const handleNewMatch = () => {
    resetMatch();
    onNavigate('start');
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-xl">No match in progress</p>
      </div>
    );
  }

  const set = match.sets[match.currentSet];
  const deuceText = isDeuce() ? 'DEUCE' : '';
  const setPointText = isSetPoint() ? (isMatchPoint() ? 'Match Point' : 'Set Point') : '';

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Top bar */}
      {(!settings.hideMenusDuringMatch || settings.blindMode) && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2">
          <button
            onClick={() => onNavigate('start')}
            className="text-white/40 hover:text-white/80 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            {deuceText && (
              <span className="text-yellow-400 font-bold text-sm tracking-widest">
                {deuceText}
              </span>
            )}
            {setPointText && (
              <span className="text-accent font-bold text-sm tracking-widest">
                {setPointText}
              </span>
            )}

            <button
              onClick={() => undo()}
              disabled={!canUndo()}
              className="text-white/40 hover:text-white/80 disabled:opacity-20 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:cursor-not-allowed"
            >
              Undo
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-white/40 hover:text-white/80 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Menu
            </button>

            <VoiceControl enabled={settings.enableVoiceCommands} onCommand={handleVoiceCommand} />
          </div>
        </div>
      )}

      {/* Menu dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-10 right-4 z-40 bg-surface-light border border-white/10 rounded-xl shadow-2xl p-3 min-w-[160px]"
          >
            {!match.endTime && (
              <button
                onClick={handleEndMatch}
                className="w-full text-left px-3 py-2 text-sm text-yellow-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                End Match
              </button>
            )}
            <button
              onClick={handleNewMatch}
              className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg transition-colors"
            >
              New Match
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 rounded-lg transition-colors"
            >
              Settings
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score flash overlay */}
      <AnimatePresence>
        {flashPlayer && settings.animationsEnabled && (
          <motion.div
            key={flashPlayer + Date.now()}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 z-10 pointer-events-none`}
            style={{
              background: flashPlayer === 'A'
                ? `radial-gradient(ellipse at 25% 50%, ${match.playerA.color}40 0%, transparent 70%)`
                : `radial-gradient(ellipse at 75% 50%, ${match.playerB.color}40 0%, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Player halves */}
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <PlayerHalf
            player="A"
            name={match.playerA.name}
            color={match.playerA.color}
            score={set?.score.A ?? 0}
            sets={match.sets}
            currentSet={match.currentSet}
            isServing={match.server === 'A'}
            isWinner={match.winner === 'A'}
            blindMode={settings.blindMode}
            giantNumbers={settings.giantNumbers}
            animationsEnabled={settings.animationsEnabled}
            onIncrement={() => handleIncrement('A')}
            onDecrement={() => handleDecrement('A')}
            onTap={() => handleTap('A')}
          />
        </div>
        <div className="flex-1 relative">
          <PlayerHalf
            player="B"
            name={match.playerB.name}
            color={match.playerB.color}
            score={set?.score.B ?? 0}
            sets={match.sets}
            currentSet={match.currentSet}
            isServing={match.server === 'B'}
            isWinner={match.winner === 'B'}
            blindMode={settings.blindMode}
            giantNumbers={settings.giantNumbers}
            animationsEnabled={settings.animationsEnabled}
            onIncrement={() => handleIncrement('B')}
            onDecrement={() => handleDecrement('B')}
            onTap={() => handleTap('B')}
          />
        </div>
      </div>

      {/* Bottom controls */}
      {match.winner && (
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 z-30 flex justify-center gap-4 p-4 bg-gradient-to-t from-surface to-transparent"
        >
          <button
            onClick={handleNewMatch}
            className="px-8 py-3 bg-accent text-white font-bold rounded-xl text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            New Match
          </button>
        </motion.div>
      )}
    </div>
  );
}
