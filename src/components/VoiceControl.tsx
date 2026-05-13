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

  useEffect(() => {
    if (!enabled) {
      voiceService.stop();
      setStatus({ type: 'idle' });
      initialized.current = false;
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

  const handleTap = () => {
    if (status.type === 'listening') {
      // Tap to stop
      voiceService.stop();
    } else {
      // Tap to start (this is the user gesture Chrome needs)
      voiceService.start();
    }
  };

  if (!enabled) return null;

  if (!available) {
    return (
      <div className="text-white/20 text-xs px-2" title="Riconoscimento vocale non supportato">
        🎤—
      </div>
    );
  }

  const isListening = status.type === 'listening';
  const isCommand = status.type === 'command';
  const isHeard = status.type === 'heard';
  const isError = status.type === 'error';
  const showHeard = isHeard || isCommand;

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={handleTap}
        className={`
          relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all
          ${isListening
            ? 'bg-accent/15 text-accent'
            : isCommand
            ? 'bg-accent/20 text-accent'
            : isError
            ? 'bg-red-500/10 text-red-400'
            : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
        `}
        title={
          isListening
            ? 'Tocca per fermare'
            : 'Tocca per attivare microfono'
        }
      >
        {/* Pulsing ring when listening */}
        {isListening && (
          <motion.span
            className="absolute inset-0 rounded-lg border border-accent/50"
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}

        <span className="relative z-10 text-sm">
          {isListening ? '🎤' : isCommand ? '🎯' : isError ? '⚠️' : '🎤'}
        </span>

        <span className="relative z-10 text-xs whitespace-nowrap">
          {isListening
            ? 'Ascolto'
            : isCommand
            ? COMMAND_LABELS[status.command]
            : isHeard
            ? status.text.slice(0, 15)
            : isError
            ? (status as any).message?.slice(0, 20) ?? 'Errore'
            : 'Off'}
        </span>
      </button>

      {/* Floating feedback for recognized commands */}
      <AnimatePresence>
        {isCommand && (
          <motion.div
            key={status.command + Date.now()}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -24, scale: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-accent font-bold text-sm whitespace-nowrap z-50"
          >
            {COMMAND_LABELS[status.command]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
