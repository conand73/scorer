import { useEffect, useRef } from 'react';
import { voiceService } from '../services/voice-service';
import type { VoiceCommand } from '../domain/types';

export function useVoiceCommands(
  enabled: boolean,
  onCommand: (command: VoiceCommand) => void
) {
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    if (!enabled) {
      voiceService.stop();
      return;
    }

    const available = voiceService.init((cmd) => {
      onCommandRef.current(cmd);
    });

    if (available) {
      voiceService.start();
    }

    return () => {
      voiceService.stop();
    };
  }, [enabled]);
}
