import type { VoiceCommand } from '../domain/types';

export type VoiceStatus =
  | { type: 'idle' }
  | { type: 'listening' }
  | { type: 'command'; command: VoiceCommand }
  | { type: 'error'; message: string }
  | { type: 'unavailable' };

type CommandCallback = (command: VoiceCommand) => void;
type StatusCallback = (status: VoiceStatus) => void;

const COMMANDS: [RegExp, VoiceCommand][] = [
  [/\b(a|eh|ay|ah)\s*(plus|píu|piu|più|up|\+1|one|1)\b/i, 'a_plus'],
  [/\b(b|bee|be)\s*(plus|píu|piu|più|up|\+1|one|1)\b/i, 'b_plus'],
  [/\b(a|eh|ay|ah)\s*(minus|meno|down|dow|-1|\-1)\b/i, 'a_minus'],
  [/\b(b|bee|be)\s*(minus|meno|down|dow|-1|\-1)\b/i, 'b_minus'],
  [/\b(undo|annulla|indietro|oops|back|stop)\b/i, 'undo'],
];

export const COMMAND_LABELS: Record<VoiceCommand, string> = {
  a_plus: 'A +1',
  b_plus: 'B +1',
  a_minus: 'A -1',
  b_minus: 'B -1',
  undo: 'Undo',
};

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private running = false;
  private onCommand: CommandCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private errorCount = 0;

  init(
    onCommand: CommandCallback,
    onStatus: StatusCallback
  ): boolean {
    this.onCommand = onCommand;
    this.onStatus = onStatus;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      this.onStatus({ type: 'unavailable' });
      return false;
    }

    try {
      this.recognition = new Recognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.results.length - 1; i >= 0; i--) {
          const result = event.results[i];
          if (!result.isFinal) continue;
          const t = result[0].transcript.trim().toLowerCase();
          console.log('[Voice] heard:', t, 'conf:', result[0].confidence.toFixed(2));

          for (const [pattern, cmd] of COMMANDS) {
            if (pattern.test(t)) {
              this.errorCount = 0;
              this.onCommand?.(cmd);
              this.onStatus?.({ type: 'command', command: cmd });
              return;
            }
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('[Voice] error:', event.error);
        this.errorCount++;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.running = false;
          this.onStatus?.({ type: 'error', message: 'Permesso microfono negato' });
          return;
        }

        if (event.error === 'aborted') {
          this.errorCount = 0;
          return;
        }

        if (this.errorCount > 10) {
          this.running = false;
          this.onStatus?.({ type: 'error', message: 'Troppi errori, riavviare' });
          return;
        }

        this.scheduleRestart();
      };

      this.recognition.onend = () => {
        if (this.running) {
          this.scheduleRestart();
        }
      };

      return true;
    } catch {
      this.onStatus({ type: 'unavailable' });
      return false;
    }
  }

  start() {
    if (!this.recognition || this.running) return;
    this.running = true;
    this.errorCount = 0;
    this.onStatus?.({ type: 'listening' });
    try {
      this.recognition.start();
    } catch {
      this.running = false;
      this.onStatus?.({ type: 'unavailable' });
    }
  }

  stop() {
    this.running = false;
    this.errorCount = 0;
    this.clearRestart();
    this.onStatus?.({ type: 'idle' });
    try {
      this.recognition?.stop();
    } catch { /* ignore */ }
  }

  isRunning(): boolean {
    return this.running;
  }

  isAvailable(): boolean {
    return !!this.recognition;
  }

  private scheduleRestart() {
    this.clearRestart();
    this.restartTimer = setTimeout(() => {
      if (!this.running || !this.recognition) return;
      try {
        this.recognition.start();
      } catch {
        this.running = false;
        this.onStatus?.({ type: 'unavailable' });
      }
    }, 200);
  }

  private clearRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}

export const voiceService = new VoiceService();
