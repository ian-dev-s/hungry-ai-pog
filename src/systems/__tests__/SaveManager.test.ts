import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager } from '../SaveManager';
import {
  CURRENT_SAVE_VERSION,
  createDefaultSave,
  createDefaultTrainingState,
  createDefaultHygieneState,
  createDefaultSleepState,
} from '../../data/SaveSchema';

/** Minimal in-memory Storage implementation for tests. */
function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe('SaveManager', () => {
  let storage: Storage;
  let manager: SaveManager;

  beforeEach(() => {
    storage = createMockStorage();
    manager = new SaveManager(storage);
  });

  describe('initial state', () => {
    it('starts with default save data', () => {
      const state = manager.getState();
      expect(state.version).toBe(CURRENT_SAVE_VERSION);
      expect(state.pet).toBeNull();
      expect(state.coins).toBe(0);
      expect(state.inventory).toEqual([]);
    });

    it('hasSave returns false when no save exists', () => {
      expect(manager.hasSave()).toBe(false);
    });
  });

  describe('save and load', () => {
    it('saves state to storage and loads it back', () => {
      manager.update({ coins: 42 });
      expect(manager.hasSave()).toBe(true);

      const manager2 = new SaveManager(storage);
      const loaded = manager2.load();
      expect(loaded).toBe(true);
      expect(manager2.getState().coins).toBe(42);
    });

    it('load returns false when no save exists', () => {
      expect(manager.load()).toBe(false);
    });

    it('updates lastSaved timestamp on save', () => {
      const before = Date.now();
      manager.save();
      const state = manager.getState();
      expect(state.timestamps.lastSaved).toBeGreaterThanOrEqual(before);
    });

    it('updates lastOpened timestamp on load', () => {
      manager.save();
      const before = Date.now();
      const manager2 = new SaveManager(storage);
      manager2.load();
      expect(manager2.getState().timestamps.lastOpened).toBeGreaterThanOrEqual(
        before,
      );
    });
  });

  describe('update', () => {
    it('merges partial state and auto-saves', () => {
      manager.update({ coins: 100 });
      expect(manager.getState().coins).toBe(100);
      expect(manager.hasSave()).toBe(true);
    });

    it('updatePet merges into pet state', () => {
      const defaultSave = createDefaultSave();
      defaultSave.pet = {
        name: 'Blobby',
        elementType: 'forest',
        lifeStage: 'blob',
        stats: {
          hunger: 80,
          happiness: 80,
          energy: 80,
          hygiene: 80,
          health: 80,
          bond: 50,
          discipline: 50,
        },
        hiddenStats: {
          personality: [0.5, 0.5, 0.5, 0.5],
          trust: 50,
          stress: 10,
        },
        evolutionPath: null,
        birthTimestamp: Date.now(),
        stageStartTimestamp: Date.now(),
        training: createDefaultTrainingState(),
        hygieneCare: createDefaultHygieneState(),
        sleep: createDefaultSleepState(),
      };
      manager.update(defaultSave);
      manager.updatePet({ name: 'Sparkle' });
      expect(manager.getState().pet!.name).toBe('Sparkle');
    });

    it('updatePet is a no-op when pet is null', () => {
      manager.updatePet({ name: 'Ghost' });
      expect(manager.getState().pet).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears storage and resets to default', () => {
      manager.update({ coins: 999 });
      manager.reset();
      expect(manager.hasSave()).toBe(false);
      expect(manager.getState().coins).toBe(0);
    });
  });

  describe('export and import', () => {
    it('exports save as JSON string', () => {
      manager.update({ coins: 77 });
      const json = manager.exportSave();
      const parsed = JSON.parse(json);
      expect(parsed.coins).toBe(77);
      expect(parsed.version).toBe(CURRENT_SAVE_VERSION);
    });

    it('imports valid save JSON', () => {
      const save = createDefaultSave();
      save.coins = 200;
      const json = JSON.stringify(save);

      const result = manager.importSave(json);
      expect(result).toBe(true);
      expect(manager.getState().coins).toBe(200);
    });

    it('rejects invalid JSON', () => {
      expect(manager.importSave('not json')).toBe(false);
    });

    it('rejects save without version', () => {
      expect(manager.importSave(JSON.stringify({ coins: 5 }))).toBe(false);
    });
  });

  describe('migration', () => {
    it('applies registered migration on load', () => {
      // Simulate a v0 save in storage
      const oldSave = { version: 0, coins: 10, oldField: true };
      storage.setItem(
        'hungry_ai_pog_save',
        JSON.stringify(oldSave),
      );

      const mgr = new SaveManager(storage);
      mgr.registerMigration(0, (data) => {
        const migrated = { ...createDefaultSave(), ...data };
        delete (migrated as Record<string, unknown>).oldField;
        return migrated as unknown as Record<string, unknown>;
      });

      const loaded = mgr.load();
      expect(loaded).toBe(true);
      expect(mgr.getState().version).toBe(CURRENT_SAVE_VERSION);
      expect(mgr.getState().coins).toBe(10);
    });

    it('applies migration on import', () => {
      const oldSave = JSON.stringify({ version: 0, coins: 5 });
      const mgr = new SaveManager(storage);
      mgr.registerMigration(0, (data) => {
        return { ...createDefaultSave(), ...data };
      });

      expect(mgr.importSave(oldSave)).toBe(true);
      expect(mgr.getState().version).toBe(CURRENT_SAVE_VERSION);
    });
  });

  describe('events', () => {
    it('emits save event on save', () => {
      const listener = vi.fn();
      manager.on(listener);
      manager.save();
      expect(listener).toHaveBeenCalledWith('save', expect.any(Object));
    });

    it('emits load event on load', () => {
      manager.save();
      const listener = vi.fn();
      manager.on(listener);
      manager.load();
      expect(listener).toHaveBeenCalledWith('load', expect.any(Object));
    });

    it('emits reset event on reset', () => {
      const listener = vi.fn();
      manager.on(listener);
      manager.reset();
      expect(listener).toHaveBeenCalledWith('reset', expect.any(Object));
    });

    it('unsubscribe stops events', () => {
      const listener = vi.fn();
      const unsub = manager.on(listener);
      unsub();
      manager.save();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('elapsed time', () => {
    it('calculates elapsed time since last save', () => {
      manager.save();
      const elapsed = manager.getElapsedSinceLastSave();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(1000);
    });

    it('tracks total play time', () => {
      manager.addPlayTime(5000);
      manager.addPlayTime(3000);
      expect(manager.getState().timestamps.totalPlayTime).toBe(8000);
    });
  });

  describe('getState returns deep copy', () => {
    it('mutations to returned state do not affect internal state', () => {
      const state = manager.getState();
      state.coins = 9999;
      expect(manager.getState().coins).toBe(0);
    });
  });
});
