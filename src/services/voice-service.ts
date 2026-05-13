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
  [/\b(a|eh|ay|ah)\s*(plus|píu|piu|più|up|[+]1|one|1)\b/i, 'a_plus'],
  [/\b(b|bee|be)\s*(plus|píu|piu|più|up|[+]1|one|1)\b/i, 'b_plus'],
  [/\b(a|eh|ay|ah)\s*(minus|meno|down|\-1)\b/i, 'a_minus'],
  [/\b(b|bee|be)\s*(minus|meno|down|\-1)\b/i, 'b_minus'],
  [/\b(undo|annulla|indietro|oops|back|stop|torn|ritor)\b/i, 'undo'],
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
      // Single utterance mode – more reliable on mobile than continuous
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        console.log('[Voice] STARTED');
        this.errorCount = 0;
      };

      this.recognition.onspeechend = () => {
        console.log('[Voice] SPEECH END');
      };

      this.recognition.onaudioend = () => {
        console.log('[Voice] AUDIO END');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result.isFinal) continue;
          const text = result[0].transcript.trim().toLowerCase();
          const conf = result[0].confidence;
          console.log(`[Voice] RESULT: "${text}" conf=${conf.toFixed(2)}`);

          // Always show what we heard
          this.onStatus?.({ type: 'heard', text });

          for (const [pattern, cmd] of COMMANDS) {
            if (pattern.test(text)) {
              console.log(`[Voice] MATCH: ${cmd}`);
              this.errorCount = 0;
              this.onCommand?.(cmd);
              this.onStatus?.({ type: 'command', command: cmd });
              return;
            }
          }

          console.log('[Voice] no pattern matched');
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('[Voice] ERROR:', event.error, event.message || '');
        this.errorCount++;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.running = false;
          this.onStatus?.({ type: 'error', message: 'Permesso microfono negato' });
          return;
        }

        if (event.error === 'no-speech') {
          // Normal – user didn't speak. Restart silently.
          this.scheduleRestart();
          return;
        }

        if (event.error === 'aborted') {
          // We stopped it intentionally – don't restart
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
        console.log('[Voice] END');
        if (this.running && !this.internalRestarting) {
          this.scheduleRestart();
        }
      };

      return true;
    } catch (err) {
      console.error('[Voice] init failed:', err);
      this.onStatus?.({ type: 'unavailable' });
      return false;
    }
  }

  start() {
    if (!this.recognition) return;
    if (this.running) {
      console.log('[Voice] already running');
      return;
    }
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
      this.recognition?.abort();
    } catch { /* ignore */ }
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
    } catch (err) {
      console.warn('[Voice] start() threw:', err);
      this.running = false;
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
    }, 150);
  }

  private clearRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}

export const voiceService = new VoiceService();
