import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService, type VoiceStatus, COMMAND_LABELS } from '../services/voice-service';
import type { VoiceCommand } from '../domain/types';

interface VoiceControlProps {
  enabled: boolean;
  onCommand: (command: VoiceCommand) => void;
}

export function VoiceControl({ enabled, onCommand }: VoiceControlProps) {
  const [status, setStatus] = useState<VoiceStatus>({ type: 'idle' });
  const [available, setAvailable] = useState(true);
  const initialized = useRef(false);
  const startedByUser = useRef(false);

  useEffect(() => {
    if (!enabled) {
      voiceService.stop();
      setStatus({ type: 'idle' });
      initialized.current = false;
      startedByUser.current = false;
      setAvailable(true);
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const ok = voiceService.init(
      (cmd) => onCommand(cmd),
      (s) => {
        setStatus(s);
        if (s.type === 'unavailable') setAvailable(false);
      }
    );

    if (!ok) {
      setAvailable(false);
    }
  }, [enabled, onCommand]);

  const toggleListening = () => {
    if (status.type === 'listening') {
      voiceService.stop();
      startedByUser.current = false;
    } else {
      startedByUser.current = true;
      voiceService.start();
    }
  };

  const canListen: boolean = status.type === 'idle' || status.type === 'error';
  const isListening = status.type === 'listening';
  const isCommand = status.type === 'command';
  const commandLabel = isCommand
    ? COMMAND_LABELS[status.command]
    : null;

  if (!enabled || !available) {
    if (!enabled) return null;
    return (
      <div className="text-white/20 text-xs px-2" title="Riconoscimento vocale non disponibile su questo browser">
        🎤—
      </div>
    );
  }

  // Auto-start when we first get the listening state from init
  useEffect(() => {
    if (!startedByUser.current && status.type === 'idle' && enabled && available) {
      voiceService.start();
    }
  }, []);

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        className={`
          relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all
          ${isListening
            ? 'bg-accent/15 text-accent'
            : isCommand
            ? 'bg-accent/15 text-accent'
            : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
        `}
        title={isListening ? 'Disattiva microfono' : 'Attiva microfono'}
      >
        {/* Pulsing ring when listening */}
        {isListening && (
          <motion.span
            className="absolute inset-0 rounded-lg border border-accent/40"
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}

        <span className="relative z-10 text-sm">
          {isListening ? '🎤' : isCommand ? '🎯' : '🎤'}
        </span>

        <AnimatePresence mode="wait">
          {isListening && (
            <motion.span
              key="listen"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative z-10 overflow-hidden whitespace-nowrap text-xs"
            >
              Ascolto
            </motion.span>
          )}
          {isCommand && (
            <motion.span
              key="cmd"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative z-10 font-bold text-accent text-xs"
            >
            {commandLabel!}
            </motion.span>
          )}
          {canListen && (
            <motion.span
              key="off"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative z-10 overflow-hidden whitespace-nowrap text-xs"
            >
              Off
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Floating command feedback */}
      <AnimatePresence>
        {isCommand && (
          <motion.div
            key={status.command}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -24, scale: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-accent font-bold text-sm whitespace-nowrap"
          >
            {commandLabel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
