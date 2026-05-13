import { useEffect } from 'react';
import type { PlayerId } from '../domain/types';

interface KeyboardMap {
  incrementA?: string;
  incrementB?: string;
  decrementA?: string;
  decrementB?: string;
  undo?: string;
}

export function useKeyboard(handlers: {
  onIncrement: (player: PlayerId) => void;
  onDecrement: (player: PlayerId) => void;
  onUndo: () => void;
}, keyMap?: KeyboardMap) {
  useEffect(() => {
    const map = keyMap ?? {
      incrementA: 'a',
      incrementB: 'l',
      decrementA: 'z',
      decrementB: 'k',
      undo: 'u',
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === map.incrementA) handlers.onIncrement('A');
      else if (key === map.incrementB) handlers.onIncrement('B');
      else if (key === map.decrementA) handlers.onDecrement('A');
      else if (key === map.decrementB) handlers.onDecrement('B');
      else if (key === map.undo) handlers.onUndo();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handlers, keyMap]);
}
