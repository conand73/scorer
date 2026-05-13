import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMatchStore } from '../stores/match-store';
import { useSettingsStore } from '../stores/settings-store';
import { PersistenceService } from '../services/persistence-service';
import { AudioService } from '../services/audio-service';
import type { Page, PlayerId, MatchConfig, PlayerConfig } from '../domain/types';

interface StartScreenProps {
  onNavigate: (page: Page) => void;
}

export function StartScreen({ onNavigate }: StartScreenProps) {
  const [hasSavedMatch, setHasSavedMatch] = useState(false);
  const startMatch = useMatchStore((s) => s.startMatch);
  const restoreMatch = useMatchStore((s) => s.restoreMatch);
  const settings = useSettingsStore();

  useEffect(() => {
    PersistenceService.loadActiveMatch().then((match) => {
      if (match && !match.winner) {
        setHasSavedMatch(true);
      }
    });
  }, []);

  const handleStartMatch = () => {
    const firstServer: PlayerId =
      settings.firstServer === 'random'
        ? (Math.random() < 0.5 ? 'A' : 'B')
        : settings.firstServer;

    const config: MatchConfig = {
      pointsPerSet: settings.pointsPerSet,
      bestOf: settings.bestOf,
      winByTwo: settings.winByTwo,
      firstServer,
      autoServiceSwitch: settings.autoServiceSwitch,
      autoSideSwitch: settings.autoSideSwitch,
    };

    const playerA: PlayerConfig = {
      name: settings.playerAName,
      color: settings.playerAColor,
    };

    const playerB: PlayerConfig = {
      name: settings.playerBName,
      color: settings.playerBColor,
    };

    startMatch(config, playerA, playerB);
    AudioService.setWon();
    onNavigate('game');
  };

  const handleResumeMatch = async () => {
    const match = await PersistenceService.loadActiveMatch();
    if (match && !match.winner) {
      restoreMatch(match);
      onNavigate('game');
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-surface px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-player-a to-player-b flex items-center justify-center mb-4 shadow-2xl">
            <span className="text-4xl font-black text-white">S</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Scorer</h1>
          <p className="text-white/40 text-sm mt-1">
            Table Tennis Score Tracker
          </p>
        </div>

        {/* Main actions */}
        <div className="space-y-3 max-w-xs mx-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStartMatch}
            className="w-full py-4 bg-accent text-white font-bold text-lg rounded-2xl shadow-lg hover:brightness-110 active:brightness-90 transition-all"
          >
            New Match
          </motion.button>

          {hasSavedMatch && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleResumeMatch}
              className="w-full py-3 bg-surface-light text-white font-semibold rounded-2xl border border-white/10 hover:bg-surface-lighter transition-colors"
            >
              Resume Match
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('settings')}
            className="w-full py-3 bg-surface-card text-white/70 font-medium rounded-2xl border border-white/5 hover:bg-surface-light transition-colors"
          >
            Settings
          </motion.button>
        </div>

        {/* Secondary actions */}
        <div className="mt-8">
          <button
            onClick={() => onNavigate('settings')}
            className="text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            Match History
          </button>
        </div>
      </motion.div>
    </div>
  );
}
