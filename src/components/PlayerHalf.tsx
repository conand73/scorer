import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PlayerId, SetScore } from '../domain/types';
import { ScoreDisplay } from './ScoreDisplay';
import { hexToRgba } from '../utils/color';

interface PlayerHalfProps {
  player: PlayerId;
  name: string;
  color: string;
  score: number;
  sets: SetScore[];
  currentSet: number;
  isServing: boolean;
  isWinner: boolean;
  blindMode: boolean;
  giantNumbers: boolean;
  animationsEnabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onTap: () => void;
}

export function PlayerHalf({
  player,
  name,
  color,
  score,
  sets,
  currentSet,
  isServing,
  isWinner,
  blindMode,
  giantNumbers,
  animationsEnabled,
  onIncrement,
  onDecrement,
  onTap,
}: PlayerHalfProps) {
  const startY = useRef(0);
  const startX = useRef(0);
  const startTime = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const isDragging = useRef(false);

  const threshold = 40;
  const tapThreshold = 15;
  const maxDuration = 500;
  const velThreshold = 0.3;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    startX.current = e.clientX;
    startTime.current = Date.now();
    isDragging.current = false;
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => { longPressTriggered.current = true; }, 600);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current) {
      const dx = Math.abs(e.clientX - startX.current);
      const dy = Math.abs(e.clientY - startY.current);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    if (longPressTriggered.current) return;
    const dy = e.clientY - startY.current;
    if (Math.abs(dy) > threshold) isDragging.current = true;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (longPressTriggered.current) return;

    const dy = e.clientY - startY.current;
    const dt = Date.now() - startTime.current;
    const velocity = Math.abs(dy) / Math.max(dt, 1);
    const absDy = Math.abs(dy);

    if (absDy < tapThreshold && dt < 300) {
      onTap();
      return;
    }
    if (absDy < threshold || dt > maxDuration) return;
    if (velocity < velThreshold) return;
    if (dy < 0) onIncrement();
    else onDecrement();
  }, [onIncrement, onDecrement, onTap]);

  const setsWon = sets.filter(s => s.winner === player).length;

  const bgColor = isServing ? hexToRgba(color, 0.25) : '#0f0f1a';

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center h-full select-none touch-none
        ${blindMode ? 'gap-4' : 'gap-2'}
        ${isWinner ? 'z-10' : ''}`}
      style={{
        backgroundColor: bgColor,
        borderRight: player === 'A' ? '1px solid rgba(255,255,255,0.06)' : 'none',
        touchAction: 'none',
      }}
      animate={{
        backgroundColor: bgColor,
      }}
      transition={animationsEnabled ? { duration: 0.3 } : { duration: 0 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {isWinner && (
        <motion.div
          className="absolute inset-0 z-20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-4xl font-bold text-white drop-shadow-lg">
            WINNER
          </div>
        </motion.div>
      )}

      <div
        className={`font-semibold tracking-wide uppercase ${
          blindMode ? 'text-2xl' : 'text-lg'
        }`}
        style={{ color }}
      >
        {name}
      </div>

      <ScoreDisplay
        score={score}
        giant={giantNumbers}
        blind={blindMode}
        highlight={isServing}
      />

      {!blindMode && (
        <div className="flex gap-1.5 mt-1">
          {sets.map((set) => (
            <div
              key={set.number}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold
                ${currentSet === set.number - 1 ? 'ring-1 ring-white/20' : ''}
                ${set.winner === player ? 'text-white' : 'text-white/40'}
              `}
              style={{
                backgroundColor: set.winner === player
                  ? color
                  : 'rgba(255,255,255,0.06)',
              }}
            >
              {set.score[player]}
            </div>
          ))}
        </div>
      )}

      {blindMode && (
        <div className="flex gap-2 mt-1">
          {sets.map((set) => (
            <div
              key={set.number}
              className={`w-3 h-3 rounded-full ${
                set.winner === player ? 'opacity-100' : 'opacity-20'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
