import type { VoiceCommand } from '../domain/types';

type CommandCallback = (command: VoiceCommand) => void;
type StatusCallback = (status: VoiceStatus) => void;

export type VoiceStatus =
  | { type: 'idle' }
  | { type: 'listening' }
  | { type: 'command'; command: VoiceCommand }
  | { type: 'error'; message: string }
  | { type: 'unavailable' };

const COMMAND_MAP: [RegExp, VoiceCommand][] = [
  [/a\s*plu(s|s)?/i, 'a_plus'],
  [/a\s*pi[ùu]/i, 'a_plus'],
  [/a\s*up/i, 'a_plus'],
  [/a\s*\+1/i, 'a_plus'],

  [/b\s*plu(s|s)?/i, 'b_plus'],
  [/b\s*pi[ùu]/i, 'b_plus'],
  [/b\s*up/i, 'b_plus'],
  [/b\s*\+1/i, 'b_plus'],

  [/a\s*meno/i, 'a_minus'],
  [/a\s*minus/i, 'a_minus'],
  [/a\s*down/i, 'a_minus'],
  [/a\s*-1/i, 'a_minus'],

  [/b\s*meno/i, 'b_minus'],
  [/b\s*minus/i, 'b_minus'],
  [/b\s*down/i, 'b_minus'],
  [/b\s*-1/i, 'b_minus'],

  [/\bundo\b/i, 'undo'],
  [/annulla/i, 'undo'],
  [/indietro/i, 'undo'],
];

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private running = false;
  private onCommand: CommandCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private errorCount = 0;

  init(
    onCommand: CommandCallback,
    onStatus?: StatusCallback
  ): boolean {
    this.onCommand = onCommand;
    this.onStatus = onStatus ?? null;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      this.onStatus?.({ type: 'unavailable' });
      return false;
    }

    try {
      this.recognition = new Recognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'it-IT';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.results.length - 1; i >= 0; i--) {
          const result = event.results[i];
          if (!result.isFinal) continue;
          const transcript = result[0].transcript.trim().toLowerCase();
          for (const [pattern, command] of COMMAND_MAP) {
            if (pattern.test(transcript)) {
              this.onStatus?.({ type: 'command', command });
              this.onCommand?.(command);
              this.errorCount = 0;
              return;
            }
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('[Voice] Error:', event.error);
        this.errorCount++;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.onStatus?.({
            type: 'error',
            message: 'Microfono non consentito. Abilita il permesso nelle impostazioni del browser.',
          });
          this.running = false;
          return;
        }

        if (event.error === 'no-speech' || event.error === 'aborted') {
          this.errorCount = 0;
        }

        if (this.errorCount > 5) {
          this.onStatus?.({
            type: 'error',
            message: 'Troppi errori. Riavvia la pagina o controlla il microfono.',
          });
          this.running = false;
          return;
        }

        if (this.running) {
          setTimeout(() => this.start(), 300);
        }
      };

      this.recognition.onend = () => {
        if (this.running) {
          setTimeout(() => this.start(), 100);
        }
      };

      return true;
    } catch {
      this.onStatus?.({ type: 'unavailable' });
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
    this.onStatus?.({ type: 'idle' });
    try {
      this.recognition?.stop();
    } catch { /* ignore */ }
  }

  isAvailable(): boolean {
    return !!this.recognition;
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const voiceService = new VoiceService();
