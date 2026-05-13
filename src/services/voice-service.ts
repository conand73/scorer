import type { VoiceCommand } from '../domain/types';

type CommandCallback = (command: VoiceCommand) => void;

const COMMAND_MAP: [RegExp, VoiceCommand][] = [
  [/a\s*pi[ùu]/i, 'a_plus'],
  [/b\s*pi[ùu]/i, 'b_plus'],
  [/a\s*meno/i, 'a_minus'],
  [/b\s*meno/i, 'b_minus'],
  [/\bundo\b/i, 'undo'],
  [/annulla/i, 'undo'],
];

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private enabled = false;
  private running = false;
  private onCommand: CommandCallback | null = null;

  init(onCommand: CommandCallback): boolean {
    this.onCommand = onCommand;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      console.warn('Speech recognition not available');
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
          const transcript = result[0].transcript.trim();
          for (const [pattern, command] of COMMAND_MAP) {
            if (pattern.test(transcript)) {
              this.onCommand?.(command);
              return;
            }
          }
        }
      };

      this.recognition.onerror = () => {
        if (this.running) {
          setTimeout(() => this.start(), 500);
        }
      };

      this.recognition.onend = () => {
        if (this.running) {
          setTimeout(() => this.start(), 100);
        }
      };

      return true;
    } catch {
      return false;
    }
  }

  start() {
    if (!this.recognition || this.running) return;
    this.running = true;
    this.enabled = true;
    try {
      this.recognition.start();
    } catch {
      this.running = false;
    }
  }

  stop() {
    this.running = false;
    this.enabled = false;
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
