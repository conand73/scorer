import { useEffect, useRef, useState, useCallback } from 'react';
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
  const commandCount = useRef(0);
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStatusTimeout = useCallback(() => {
    if (statusTimeout.current) {
      clearTimeout(statusTimeout.current);
      statusTimeout.current = null;
    }
  }, []);

  // Keep callbacks in refs so voiceService can always call the latest version
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const handleStatus = useCallback((s: VoiceStatus) => {
    setStatus(s);
    clearStatusTimeout();

    // Auto-dismiss notification states after a delay
    if (s.type === 'command' || s.type === 'heard' || s.type === 'error') {
      statusTimeout.current = setTimeout(() => {
        if (voiceService.isRunning()) {
          setStatus({ type: 'listening' });
        } else {
          setStatus({ type: 'idle' });
        }
      }, s.type === 'command' ? 1500 : 2500);
    }
  }, [clearStatusTimeout]);

  const handleCommand = useCallback((cmd: VoiceCommand) => {
    onCommandRef.current(cmd);
  }, []);

  useEffect(() => {
    return () => clearStatusTimeout();
  }, [clearStatusTimeout]);

  useEffect(() => {
    if (!enabled) {
      voiceService.stop();
      setStatus({ type: 'idle' });
      initialized.current = false;
      setAvailable(true);
      clearStatusTimeout();
      return;
    }

    if (initialized.current) {
      // Already initialized – just update callbacks
      voiceService.setCommandCallback(handleCommand);
      voiceService.setStatusCallback(handleStatus);
      return;
    }

    initialized.current = true;

    const ok = voiceService.init(handleCommand, handleStatus);

    if (!ok) {
      setAvailable(false);
    }
  }, [enabled, handleCommand, handleStatus, clearStatusTimeout]);

  const handleTap = () => {
    if (status.type === 'listening') {
      voiceService.stop();
    } else {
      voiceService.start();
    }
  };

  if (!enabled) return null;

  if (!available) {
    return (
      <div className="text-white/40 text-xs px-2" title="Riconoscimento vocale non supportato">
        🎤—
      </div>
    );
  }

  const isListening = status.type === 'listening';
  const isCommand = status.type === 'command';
  const isHeard = status.type === 'heard';
  const isError = status.type === 'error';
  const showHeard = isHeard || isCommand;

  // Generate stable key for AnimatePresence
  if (isCommand) commandCount.current++;

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
            ? status.message.slice(0, 20)
            : 'Off'}
        </span>
      </button>

      <AnimatePresence mode="wait">
        {isCommand && (
          <motion.div
            key={`cmd-${commandCount.current}`}
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
