import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameScreen } from './components/GameScreen';
import { StartScreen } from './components/StartScreen';
import { SettingsPage } from './components/SettingsPage';
import { MatchHistory } from './components/MatchHistory';
import { useSettingsStore } from './stores/settings-store';
import { useMatchStore } from './stores/match-store';
import { PersistenceService } from './services/persistence-service';
import type { Page } from './domain/types';

function useAutoSave() {
  const match = useMatchStore((s) => s.match);
  const autoSave = useSettingsStore((s) => s.autoSaveMatches);

  useEffect(() => {
    if (!match || !autoSave) return;
    const timer = setTimeout(() => {
      if (!match.endTime) {
        PersistenceService.saveActiveMatch(match);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [match, autoSave]);
}

export default function App() {
  const [page, setPage] = useState<Page>('start');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const loadSettings = useSettingsStore((s) => s.load);

  useAutoSave();

  useEffect(() => {
    PersistenceService.loadSettings().then((saved) => {
      if (saved) {
        loadSettings(saved);
      }
      setSettingsLoaded(true);
    });
  }, [loadSettings]);

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', true);
  }, []);

  // Prevent default touch behaviors
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    document.addEventListener('gesturestart', prevent as any, { passive: false });
    return () => {
      document.removeEventListener('touchmove', prevent);
      document.removeEventListener('gesturestart', prevent as any);
    };
  }, []);

  const navigate = useCallback((p: Page) => setPage(p), []);

  if (!settingsLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface">
        <div className="text-white/30 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full w-full overflow-hidden bg-surface">
        <AnimatePresence mode="wait">
          {page === 'start' && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <StartScreen onNavigate={navigate} />
            </motion.div>
          )}
          {page === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <GameScreen onNavigate={navigate} />
            </motion.div>
          )}
          {page === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full w-full"
            >
              <SettingsPage onNavigate={navigate} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
