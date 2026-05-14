import type { VoiceCommand } from '../domain/types';

export type VoiceStatus =
  | { type: 'idle' }
  | { type: 'listening' }
  | { type: 'heard'; text: string }
  | { type: 'command'; command: VoiceCommand }
  | { type: 'error'; message: string }
  | { type: 'unavailable' };

type CommandCallback = (command: VoiceCommand) => void;
type StatusCallback = (status: VoiceStatus) => void;

const COMMANDS: [RegExp, VoiceCommand][] = [
  // A +1: Italian & English
  [/(?:punto\s+)?a(?:|\s+più|\s+plus|\s+up|\s+1|\s*punto)/i, 'a_plus'],
  // B +1: Italian & English
  [/(?:punto\s+)?b(?:|\s+più|\s+plus|\s+up|\s+1|\s*punto)/i, 'b_plus'],
  // A -1
  [/\ba\s+(?:meno|minus|down|giù)\b/i, 'a_minus'],
  // B -1
  [/\bb\s+(?:meno|minus|down|giù)\b/i, 'b_minus'],
  // Undo / annulla / indietro
  [/\b(?:undo|annulla|indietro|torna\s*indietro|oops|back)\b/i, 'undo'],
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
  private internalRestarting = false;
  private lang = 'it-IT';

  /** Set the recognition language (default 'it-IT'). */
  setLang(lang: string): void {
    this.lang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  /** Update the command callback without re-initializing. */
  setCommandCallback(cb: CommandCallback): void {
    this.onCommand = cb;
  }

  /** Update the status callback without re-initializing. */
  setStatusCallback(cb: StatusCallback): void {
    this.onStatus = cb;
  }

  init(
    onCommand: CommandCallback,
    onStatus: StatusCallback
  ): boolean {
    this.onCommand = onCommand;
    this.onStatus = onStatus;

    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      this.onStatus?.({ type: 'unavailable' });
      return false;
    }

    try {
      this.recognition = new Recognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.lang;
      this.recognition.maxAlternatives = 2;

      this.recognition.onstart = () => {
        this.errorCount = 0;
        this.internalRestarting = false;
      };

      this.recognition.onaudioend = () => {};

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result.isFinal) continue;
          // Check all alternatives for a match
          for (let j = 0; j < result.length; j++) {
            const text = result[j].transcript.trim().toLowerCase();
            this.onStatus?.({ type: 'heard', text });

            for (const [pattern, cmd] of COMMANDS) {
              if (pattern.test(text)) {
                this.errorCount = 0;
                this.onCommand?.(cmd);
                this.onStatus?.({ type: 'command', command: cmd });
                return;
              }
            }

            // After checking all alternatives, show the first one
            if (j === 0) {
              this.onStatus?.({ type: 'heard', text });
            }
          }
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        this.errorCount++;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.running = false;
          this.onStatus?.({ type: 'error', message: 'Permesso microfono negato' });
          return;
        }

        if (event.error === 'no-speech') {
          this.scheduleRestart();
          return;
        }

        if (event.error === 'aborted') {
          return;
        }

        if (this.errorCount > 10) {
          this.running = false;
          this.onStatus?.({ type: 'error', message: 'Troppi errori' });
          return;
        }

        this.scheduleRestart();
      };

      this.recognition.onend = () => {
        if (this.running && !this.internalRestarting) {
          this.scheduleRestart();
        }
      };

      return true;
    } catch (err) {
      this.onStatus?.({ type: 'unavailable' });
      return false;
    }
  }

  start() {
    if (!this.recognition) return;
    if (this.running) return;
    this.running = true;
    this.errorCount = 0;
    this.internalRestarting = false;
    this.onStatus?.({ type: 'listening' });
    this.doStart();
  }

  stop() {
    this.running = false;
    this.errorCount = 0;
    this.internalRestarting = false;
    this.clearRestart();
    this.onStatus?.({ type: 'idle' });
    try {
      this.recognition?.stop();
    } catch { }
  }

  isRunning(): boolean {
    return this.running;
  }

  isAvailable(): boolean {
    return !!this.recognition;
  }

  private doStart() {
    if (!this.recognition || !this.running) return;
    try {
      this.recognition.start();
    } catch {
      this.running = false;
      this.internalRestarting = false;
      this.onStatus?.({ type: 'unavailable' });
    }
  }

  private scheduleRestart() {
    this.clearRestart();
    this.internalRestarting = true;
    this.restartTimer = setTimeout(() => {
      this.internalRestarting = false;
      if (!this.running) return;
      this.onStatus?.({ type: 'listening' });
      this.doStart();
    }, 300);
  }

  private clearRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}

export const voiceService = new VoiceService();
