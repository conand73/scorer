import { create } from 'zustand';
import type { AppSettings } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';

interface SettingsStore extends AppSettings {
  loaded: boolean;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  reset: () => void;
  load: (settings: Partial<AppSettings>) => void;
  getAll: () => AppSettings;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  update: (key, value) => set({ [key]: value }),

  reset: () => set({ ...DEFAULT_SETTINGS, loaded: true }),

  load: (settings) =>
    set((state) => ({ ...state, ...settings, loaded: true })),

  getAll: () => {
    const s = get();
    const { update, reset, load, getAll, loaded, ...settings } = s;
    return settings as AppSettings;
  },
}));
