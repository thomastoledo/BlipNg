import { InjectionToken, inject, signal, computed, WritableSignal, Signal } from '@angular/core';

export const INITIAL_STATE = new InjectionToken<object>('BLIP_INITIAL_STATE');

export class BlipNgStore<T extends object> {
  private readonly _state: WritableSignal<T> = signal<T>(inject(INITIAL_STATE) as T);

  readonly state: Signal<T> = this._state.asReadonly();

  select<K extends keyof T>(key: K): Signal<T[K]> {
    return computed(() => this._state()[key]);
  }

  setState(partial: Partial<T>): void {
    this._state.update(state => ({ ...state, ...partial }));
  }

  update<K extends keyof T>(key: K, updater: (value: T[K]) => T[K]): void {
    this._state.update(state => ({ ...state, [key]: updater(state[key]) }));
  }
}

export function provideBlipStore<T extends object>(initialState: T = {} as T) {
  return [
    { provide: INITIAL_STATE, useValue: initialState },
    { provide: BlipNgStore, useClass: BlipNgStore<T> },
  ];
}