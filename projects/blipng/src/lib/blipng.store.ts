import { InjectionToken, inject, effect } from '@angular/core';
import { blip, Blip } from './blip';
import { IndexedDbService } from './indexeddb.service';

import { InjectionToken, inject, effect } from '@angular/core';
import { blip, Blip } from './blip';
import { IndexedDbService } from './indexeddb.service';

export const INITIAL_STATE = new InjectionToken<object>('BLIP_INITIAL_STATE');
export const BLIP_DB_NAME = new InjectionToken<string>('BLIP_DB_NAME');
export const BLIP_OBJECT_STORE_NAME = new InjectionToken<string>('BLIP_OBJECT_STORE_NAME');
export const BLIP_STORE_KEY = new InjectionToken<string>('BLIP_STORE_KEY');
export const BLIP_PERSISTENCE_ENABLED = new InjectionToken<boolean>('BLIP_PERSISTENCE_ENABLED');

export class BlipNgStore<T extends object> {
  private readonly _blip: Blip<T>;
  private readonly indexedDBService?: IndexedDbService; // Optional if persistence is disabled
  private readonly storeKey?: string; // Optional if persistence is disabled
  private isInitialized = false;
  private readonly persistenceEnabled: boolean;

  constructor() {
    const initialState = inject(INITIAL_STATE) as T;
    this._blip = blip<T>(initialState);
    this.persistenceEnabled = inject(BLIP_PERSISTENCE_ENABLED);

    if (this.persistenceEnabled) {
      const dbName = inject(BLIP_DB_NAME);
      const objectStoreName = inject(BLIP_OBJECT_STORE_NAME);
      this.storeKey = inject(BLIP_STORE_KEY);
      this.indexedDBService = new IndexedDbService(dbName, objectStoreName);
      this._initializeDB();
    } else {
      this.isInitialized = true; // No DB init, so mark as initialized
    }

    effect(() => {
      if (this.isInitialized && this.persistenceEnabled && this.indexedDBService && this.storeKey) {
        const currentState = this._blip.get();
        this.indexedDBService.setItem(this.storeKey, currentState)
          .catch(error => console.error('Error saving state to IndexedDB:', error));
      }
    });
  }

  private async _initializeDB(): Promise<void> {
    if (!this.persistenceEnabled || !this.indexedDBService || !this.storeKey) {
      this.isInitialized = true;
      return;
    }
    try {
      await this.indexedDBService.init();
      const storedState = await this.indexedDBService.getItem(this.storeKey);
      if (storedState) {
        this._blip.set(storedState as T);
      }
    } catch (error) {
      console.error('Error initializing IndexedDB or getting stored state:', error);
    } finally {
      this.isInitialized = true;
    }
  }

  get state(): Blip<T> {
    return this._blip;
  }

  select<K extends keyof T>(key: K): Blip<T[K]> {
    return this._blip.map(state => state[key]);
  }

  setState(partial: Partial<T>): void {
    this._blip.update(state => ({ ...state, ...partial }));
  }

  update<K extends keyof T>(key: K, updater: (value: T[K]) => T[K]): void {
    this._blip.update(state => ({ ...state, [key]: updater(state[key]) }));
  }
}

export interface BlipNgStoreConfig {
  dbName?: string;
  storeName?: string;
  storeKey?: string;
  persistenceEnabled?: boolean;
}

export function provideBlipStore<T extends object>(
  initialState: T = {} as T,
  config: BlipNgStoreConfig = {}
) {
  return [
    { provide: INITIAL_STATE, useValue: initialState },
    { provide: BLIP_DB_NAME, useValue: config.dbName || 'blipStore' },
    { provide: BLIP_OBJECT_STORE_NAME, useValue: config.storeName || 'blips' },
    { provide: BLIP_STORE_KEY, useValue: config.storeKey || 'appState' },
    { provide: BLIP_PERSISTENCE_ENABLED, useValue: config.persistenceEnabled ?? true },
    IndexedDbService,
    { provide: BlipNgStore, useClass: BlipNgStore<T> },
  ];
}