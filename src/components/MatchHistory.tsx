import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PersistenceService } from '../services/persistence-service';
import { useMatchStore } from '../stores/match-store';
import type { MatchSummary, Page } from '../domain/types';

interface MatchHistoryProps {
  onNavigate: (page: Page) => void;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function MatchHistory({ onNavigate }: MatchHistoryProps) {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const restoreMatch = useMatchStore((s) => s.restoreMatch);

  useEffect(() => {
    PersistenceService.getMatchHistory().then((data) => {
      setMatches(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => onNavigate('start')}
            className="text-white/40 hover:text-white/80 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Match History</h1>
        </div>

        {loading && (
          <div className="text-center text-white/30 py-12">Loading...</div>
        )}

        {!loading && matches.length === 0 && (
          <div className="text-center text-white/30 py-12">
            <div className="text-4xl mb-4">🏓</div>
            <p>No matches yet</p>
            <p className="text-sm mt-1">Play your first match!</p>
          </div>
        )}

        <div className="space-y-2">
          {matches.map((summary, index) => (
            <motion.div
              key={summary.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-surface-card rounded-xl border border-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-white">{summary.playerA}</span>
                    <span className="text-white/30">vs</span>
                    <span className="font-semibold text-white">{summary.playerB}</span>
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {summary.sets}
                  </div>
                </div>
                <div className="text-right">
                  {summary.winner && (
                    <div className="text-xs font-bold text-accent">
                      {summary.winner === 'A' ? summary.playerA : summary.playerB} won
                    </div>
                  )}
                  <div className="text-xs text-white/30 mt-0.5">
                    {formatDate(summary.date)} · {formatDuration(summary.duration)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
