/**
 * Centralized save system with localStorage persistence,
 * auto-save, manual export/import, and schema migration support.
 */

import {
  SaveData,
  CURRENT_SAVE_VERSION,
  createDefaultSave,
} from '../data/SaveSchema';

export type SaveEventType =
  | 'save'
  | 'load'
  | 'reset'
  | 'import'
  | 'export'
  | 'migrate';

export type SaveEventListener = (
  type: SaveEventType,
  data: SaveData,
) => void;

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

const STORAGE_KEY = 'hungry_ai_pog_save';

export class SaveManager {
  private state: SaveData;
  private listeners: SaveEventListener[] = [];
  private migrations: Map<number, Migration> = new Map();
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
    this.state = createDefaultSave();
  }

  /** Register a migration from version N to N+1. */
  registerMigration(fromVersion: number, migration: Migration): void {
    this.migrations.set(fromVersion, migration);
  }

  /** Get a deep copy of the current state. */
  getState(): SaveData {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Update state partially and auto-save. */
  update(partial: Partial<SaveData>): void {
    Object.assign(this.state, partial);
    this.save();
  }

  /** Update a nested part of state and auto-save. */
  updatePet(partial: Partial<NonNullable<SaveData['pet']>>): void {
    if (this.state.pet) {
      Object.assign(this.state.pet, partial);
      this.save();
    }
  }

  /** Save current state to localStorage. */
  save(): boolean {
    try {
      this.state.timestamps.lastSaved = Date.now();
      const serialized = JSON.stringify(this.state);
      this.storage.setItem(STORAGE_KEY, serialized);
      this.emit('save', this.state);
      return true;
    } catch {
      return false;
    }
  }

  /** Load state from localStorage. Returns true if save existed. */
  load(): boolean {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return false;

      let parsed = JSON.parse(raw) as Record<string, unknown>;

      const version = (parsed.version as number) ?? 0;
      if (version < CURRENT_SAVE_VERSION) {
        parsed = this.applyMigrations(parsed, version);
      }

      this.state = parsed as unknown as SaveData;
      this.state.timestamps.lastOpened = Date.now();
      this.emit('load', this.state);
      return true;
    } catch {
      return false;
    }
  }

  /** Check if a save exists in storage. */
  hasSave(): boolean {
    return this.storage.getItem(STORAGE_KEY) !== null;
  }

  /** Reset to default state and clear storage. */
  reset(): void {
    this.state = createDefaultSave();
    this.storage.removeItem(STORAGE_KEY);
    this.emit('reset', this.state);
  }

  /** Export current save as a JSON string. */
  exportSave(): string {
    this.state.timestamps.lastSaved = Date.now();
    const json = JSON.stringify(this.state, null, 2);
    this.emit('export', this.state);
    return json;
  }

  /** Trigger a file download of the save data. */
  downloadSave(): void {
    const json = this.exportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hungry-ai-pog-save-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Import save from a JSON string. Returns true on success. */
  importSave(json: string): boolean {
    try {
      let parsed = JSON.parse(json) as Record<string, unknown>;

      if (typeof parsed.version !== 'number') {
        return false;
      }

      if ((parsed.version as number) < CURRENT_SAVE_VERSION) {
        parsed = this.applyMigrations(parsed, parsed.version as number);
      }

      if ((parsed.version as number) !== CURRENT_SAVE_VERSION) {
        return false;
      }

      this.state = parsed as unknown as SaveData;
      this.save();
      this.emit('import', this.state);
      return true;
    } catch {
      return false;
    }
  }

  /** Import save from a File object. Returns a promise resolving to success. */
  importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = this.importSave(reader.result as string);
        resolve(result);
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }

  /** Calculate elapsed time since last save (for offline simulation). */
  getElapsedSinceLastSave(): number {
    return Date.now() - this.state.timestamps.lastSaved;
  }

  /** Add play time to the total. */
  addPlayTime(ms: number): void {
    this.state.timestamps.totalPlayTime += ms;
  }

  /** Subscribe to save events. Returns unsubscribe function. */
  on(listener: SaveEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(type: SaveEventType, data: SaveData): void {
    for (const listener of this.listeners) {
      listener(type, data);
    }
  }

  private applyMigrations(
    data: Record<string, unknown>,
    fromVersion: number,
  ): Record<string, unknown> {
    let current = data;
    for (let v = fromVersion; v < CURRENT_SAVE_VERSION; v++) {
      const migration = this.migrations.get(v);
      if (migration) {
        current = migration(current);
        current.version = v + 1;
      } else {
        current.version = v + 1;
      }
    }
    this.emit('migrate', current as unknown as SaveData);
    return current;
  }
}
