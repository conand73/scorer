import { get, set, del, keys } from 'idb-keyval';
import type { MatchState, MatchSummary, AppSettings } from '../domain/types';

const SETTINGS_KEY = 'scorer_settings';
const ACTIVE_MATCH_KEY = 'scorer_active_match';
const MATCH_INDEX_KEY = 'scorer_match_index';

export const PersistenceService = {
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await set(SETTINGS_KEY, settings);
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  },

  async loadSettings(): Promise<AppSettings | null> {
    try {
      return (await get(SETTINGS_KEY)) ?? null;
    } catch {
      return null;
    }
  },

  async saveActiveMatch(match: MatchState): Promise<void> {
    try {
      await set(ACTIVE_MATCH_KEY, match);
    } catch (e) {
      console.warn('Failed to save active match:', e);
    }
  },

  async loadActiveMatch(): Promise<MatchState | null> {
    try {
      return (await get(ACTIVE_MATCH_KEY)) ?? null;
    } catch {
      return null;
    }
  },

  async clearActiveMatch(): Promise<void> {
    try {
      await del(ACTIVE_MATCH_KEY);
    } catch { /* ignore */ }
  },

  async saveMatchHistory(match: MatchState, summary: MatchSummary): Promise<void> {
    try {
      const index: string[] = (await get(MATCH_INDEX_KEY)) ?? [];
      index.unshift(summary.id);
      if (index.length > 200) index.length = 200;
      await set(MATCH_INDEX_KEY, index);
      await set(`match_${summary.id}`, { match, summary });
    } catch (e) {
      console.warn('Failed to save match history:', e);
    }
  },

  async getMatchHistory(): Promise<MatchSummary[]> {
    try {
      const index: string[] = (await get(MATCH_INDEX_KEY)) ?? [];
      const results: MatchSummary[] = [];
      for (const id of index.slice(0, 50)) {
        const entry: { match: MatchState; summary: MatchSummary } | undefined =
          await get(`match_${id}`);
        if (entry?.summary) results.push(entry.summary);
      }
      return results;
    } catch {
      return [];
    }
  },

  async clearHistory(): Promise<void> {
    try {
      const index: string[] = (await get(MATCH_INDEX_KEY)) ?? [];
      for (const id of index) {
        await del(`match_${id}`);
      }
      await del(MATCH_INDEX_KEY);
    } catch { /* ignore */ }
  },
};
