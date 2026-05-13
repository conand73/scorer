import { useRef, useCallback } from 'react';

interface SwipeConfig {
  threshold?: number;
  velocityThreshold?: number;
  maxDuration?: number;
  tapThreshold?: number;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
}

export function usePointerGestures(config: SwipeConfig) {
  const startY = useRef(0);
  const startX = useRef(0);
  const startTime = useRef(0);
  const isDragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const threshold = config.threshold ?? 40;
  const velThreshold = config.velocityThreshold ?? 0.3;
  const maxDuration = config.maxDuration ?? 500;
  const tapThreshold = config.tapThreshold ?? 15;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      startY.current = e.clientY;
      startX.current = e.clientX;
      startTime.current = Date.now();
      isDragging.current = false;
      longPressTriggered.current = false;

      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        config.onLongPress?.();
      }, 600);
    },
    [config.onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
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
      if (Math.abs(dy) > threshold) {
        isDragging.current = true;
      }
    },
    [threshold]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const target = e.currentTarget as HTMLElement;
      target.releasePointerCapture(e.pointerId);

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
        config.onTap?.();
        return;
      }

      if (absDy < threshold || dt > maxDuration) return;

      if (velocity < velThreshold) return;

      if (dy < 0) {
        config.onSwipeUp?.();
      } else {
        config.onSwipeDown?.();
      }
    },
    [threshold, velThreshold, maxDuration, tapThreshold, config.onSwipeUp, config.onSwipeDown, config.onTap]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
