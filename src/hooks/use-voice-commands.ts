import { useEffect, useRef } from 'react';
import { voiceService, type VoiceStatus } from '../services/voice-service';
import type { VoiceCommand } from '../domain/types';

export function useVoiceCommands(
  enabled: boolean,
  onCommand: (command: VoiceCommand) => void,
  onStatus?: (status: VoiceStatus) => void
) {
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!enabled) {
      voiceService.stop();
      return;
    }

    const available = voiceService.init(
      (cmd) => onCommandRef.current(cmd),
      (status) => onStatusRef.current?.(status)
    );

    if (available) {
      voiceService.start();
    } else {
      onStatusRef.current?.({ type: 'unavailable' });
    }

    return () => {
      voiceService.stop();
    };
  }, [enabled]);
}
