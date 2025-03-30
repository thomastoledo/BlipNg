import { InjectionToken, inject, signal, computed, WritableSignal, Signal } from '@angular/core';
import { blip, Blip } from './blip';
export const INITIAL_STATE = new InjectionToken<object>('BLIP_INITIAL_STATE');

export class BlipNgStore<T extends object> {
  private readonly _blip: Blip<T> = blip<T>(inject(INITIAL_STATE) as T);

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


export function provideBlipStore<T extends object>(initialState: T = {} as T) {
  return [
    { provide: INITIAL_STATE, useValue: initialState },
    { provide: BlipNgStore, useClass: BlipNgStore<T> },
  ];
}