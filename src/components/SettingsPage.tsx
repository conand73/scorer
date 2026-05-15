import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../stores/settings-store';
import { PersistenceService } from '../services/persistence-service';
import type { Page } from '../domain/types';

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-white/30 mb-3 px-1">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-card rounded-xl border border-white/5">
      <span className="text-sm text-white/80">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-accent' : 'bg-white/10'
      }`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          value ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-accent/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-surface">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Range({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-24 accent-accent"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent"
    />
  );
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const settings = useSettingsStore();
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);

  const handleReset = useCallback(() => {
    if (confirm('Reset all settings to defaults?')) {
      reset();
      PersistenceService.saveSettings(settings.getAll());
    }
  }, [reset, settings]);

  const autoSave = useCallback(
    (key: string) => (value: any) => {
      update(key as any, value);
      const current = useSettingsStore.getState();
      PersistenceService.saveSettings(current.getAll());
    },
    [update]
  );

  return (
    <div className="h-full w-full bg-surface flex flex-col min-h-0">
      {/* Fixed header */}
      <div className="flex items-center gap-4 px-4 py-4 flex-shrink-0 border-b border-white/5">
        <button
          onClick={() => onNavigate('start')}
          className="text-white/40 hover:text-white/80 text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 py-4 pb-8">

        {/* Players */}
        <Section title="Players">
          <SettingRow label="Player A Name">
            <input
              type="text"
              value={settings.playerAName}
              onChange={(e) => update('playerAName', e.target.value)}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 w-32 border border-white/10 focus:outline-none focus:border-accent/50 text-right"
            />
          </SettingRow>
          <SettingRow label="Player A Color">
            <ColorInput value={settings.playerAColor} onChange={(v) => update('playerAColor', v)} />
          </SettingRow>
          <SettingRow label="Player B Name">
            <input
              type="text"
              value={settings.playerBName}
              onChange={(e) => update('playerBName', e.target.value)}
              className="bg-white/10 text-white text-sm rounded-lg px-3 py-1.5 w-32 border border-white/10 focus:outline-none focus:border-accent/50 text-right"
            />
          </SettingRow>
          <SettingRow label="Player B Color">
            <ColorInput value={settings.playerBColor} onChange={(v) => update('playerBColor', v)} />
          </SettingRow>
          <SettingRow label="Invert Sides">
            <Toggle value={settings.invertSides} onChange={(v) => update('invertSides', v)} />
          </SettingRow>
        </Section>

        {/* Match Rules */}
        <Section title="Match Rules">
          <SettingRow label="Points Per Set">
            <Select
              value={settings.pointsPerSet}
              options={[11, 21, 15, 7, 5].map((n) => ({ label: `${n}`, value: n }))}
              onChange={(v) => update('pointsPerSet', parseInt(v))}
            />
          </SettingRow>
          <SettingRow label="Best Of">
            <Select
              value={settings.bestOf}
              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ label: `${n}`, value: n }))}
              onChange={(v) => update('bestOf', parseInt(v))}
            />
          </SettingRow>
          <SettingRow label="Win By Two">
            <Toggle value={settings.winByTwo} onChange={(v) => update('winByTwo', v)} />
          </SettingRow>
          <SettingRow label="First Server">
            <Select
              value={settings.firstServer}
              options={[
                { label: 'Random', value: 'random' },
                { label: 'Player A', value: 'A' },
                { label: 'Player B', value: 'B' },
              ]}
              onChange={(v) => update('firstServer', v as 'A' | 'B' | 'random')}
            />
          </SettingRow>
          <SettingRow label="Auto Service Switch">
            <Toggle value={settings.autoServiceSwitch} onChange={(v) => update('autoServiceSwitch', v)} />
          </SettingRow>
          <SettingRow label="Auto Side Switch">
            <Toggle value={settings.autoSideSwitch} onChange={(v) => update('autoSideSwitch', v)} />
          </SettingRow>
        </Section>

        {/* Controls */}
        <Section title="Controls">
          <SettingRow label="Tap to Increment">
            <Toggle value={settings.enableTapIncrement} onChange={(v) => update('enableTapIncrement', v)} />
          </SettingRow>
          <SettingRow label="Swipe Gestures">
            <Toggle value={settings.enableSwipeGestures} onChange={(v) => update('enableSwipeGestures', v)} />
          </SettingRow>
          <SettingRow label="Swipe Sensitivity">
            <Range
              value={settings.swipeSensitivity}
              min={1}
              max={10}
              onChange={(v) => update('swipeSensitivity', v)}
            />
          </SettingRow>
          <SettingRow label="Prevent Negative Score">
            <Toggle value={settings.preventNegativeScore} onChange={(v) => update('preventNegativeScore', v)} />
          </SettingRow>
          <SettingRow label="Lock After Match End">
            <Toggle value={settings.lockControlsAfterMatchEnd} onChange={(v) => update('lockControlsAfterMatchEnd', v)} />
          </SettingRow>
        </Section>

        {/* Voice */}
        <Section title="Voice">
          <SettingRow label="Enable Voice Commands">
            <Toggle value={settings.enableVoiceCommands} onChange={(v) => update('enableVoiceCommands', v)} />
          </SettingRow>
          {settings.enableVoiceCommands && (
            <>
              <SettingRow label="Audio Confirmation">
                <Toggle value={settings.audioConfirmation} onChange={(v) => update('audioConfirmation', v)} />
              </SettingRow>
              <SettingRow label="Voice Volume">
                <Range
                  value={settings.voiceFeedbackVolume}
                  min={0}
                  max={100}
                  onChange={(v) => update('voiceFeedbackVolume', v)}
                />
              </SettingRow>
              <SettingRow label="Announce Score After Point">
                <Toggle value={settings.announceScoreAfterPoint} onChange={(v) => update('announceScoreAfterPoint', v)} />
              </SettingRow>
              <SettingRow label="Announce Set Point">
                <Toggle value={settings.announceSetPoint} onChange={(v) => update('announceSetPoint', v)} />
              </SettingRow>
              <SettingRow label="Announce Match Point">
                <Toggle value={settings.announceMatchPoint} onChange={(v) => update('announceMatchPoint', v)} />
              </SettingRow>
            </>
          )}
        </Section>

        {/* Blind Mode */}
        <Section title="Blind Mode">
          <SettingRow label="Enable Blind Mode">
            <Toggle value={settings.blindMode} onChange={(v) => update('blindMode', v)} />
          </SettingRow>
          {settings.blindMode && (
            <>
              <SettingRow label="Giant Numbers">
                <Toggle value={settings.giantNumbers} onChange={(v) => update('giantNumbers', v)} />
              </SettingRow>
              <SettingRow label="High Contrast">
                <Toggle value={settings.highContrast} onChange={(v) => update('highContrast', v)} />
              </SettingRow>
              <SettingRow label="Vibration Feedback">
                <Toggle value={settings.vibration} onChange={(v) => update('vibration', v)} />
              </SettingRow>
              <SettingRow label="Wake Lock">
                <Toggle value={settings.wakeLock} onChange={(v) => update('wakeLock', v)} />
              </SettingRow>
              <SettingRow label="Hide Menus">
                <Toggle value={settings.hideMenusDuringMatch} onChange={(v) => update('hideMenusDuringMatch', v)} />
              </SettingRow>
            </>
          )}
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow label="Dark Mode">
            <Toggle value={settings.darkMode} onChange={(v) => update('darkMode', v)} />
          </SettingRow>
          <SettingRow label="Animations">
            <Toggle value={settings.animationsEnabled} onChange={(v) => update('animationsEnabled', v)} />
          </SettingRow>
          <SettingRow label="Font Scaling">
            <Range
              value={settings.fontScaling}
              min={0.5}
              max={2}
              step={0.1}
              onChange={(v) => update('fontScaling', v)}
            />
          </SettingRow>
        </Section>

        {/* Data */}
        <Section title="Data">
          <SettingRow label="Auto-Save Matches">
            <Toggle value={settings.autoSaveMatches} onChange={(v) => update('autoSaveMatches', v)} />
          </SettingRow>
          {!settings.autoSaveMatches && (
            <SettingRow label="Export Matches">
              <button
                onClick={() => {/* TODO */}}
                className="text-xs text-accent hover:text-accent/80"
              >
                Export
              </button>
            </SettingRow>
          )}
          <SettingRow label="Clear History">
            <button
              onClick={async () => {
                if (confirm('Clear all match history?')) {
                  await PersistenceService.clearHistory();
                }
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </SettingRow>
          <SettingRow label="Reset Settings">
            <button
              onClick={handleReset}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Reset
            </button>
          </SettingRow>
        </Section>

        <div className="text-center text-white/20 text-xs pt-4 pb-8">
          Scorer v1.0.0
        </div>
      </div>
    </div>
    </div>
  );
}
