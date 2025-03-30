import { Signal, signal, WritableSignal } from '@angular/core';
import {
  map,
  filter,
  debounce,
  distinctUntilChanged,
  combine,
  merge,
  sample,
  switchMap,
} from './operators/operators';

export class Blip<T> {
  constructor(private _signal: WritableSignal<T> | Signal<T>) {}

  static fromSignal<U>(sig: Signal<U>): Blip<U> {
    return new Blip(sig);
  }

  static combine<U extends unknown[]>(...sources: { [K in keyof U]: Signal<U[K]> }): Blip<U> {
    return new Blip<U>(combine<U>(...sources));
  }

  static merge<U>(...sources: Signal<U>[]): Blip<U> {
    return new Blip<U>(merge<U>(...sources));
  }

  map<R>(fn: (value: T) => R): Blip<R> {
    return new Blip(map(this._signal, fn));
  }

  filter(predicate: (value: T) => boolean): Blip<T | undefined> {
    return new Blip(filter(this._signal, predicate));
  }

  debounce(ms: number): Blip<T> {
    return new Blip(debounce(this._signal, ms));
  }

  distinctUntilChanged(): Blip<T> {
    return new Blip(distinctUntilChanged(this._signal));
  }

  sample(trigger: Signal<any>): Blip<T> {
    return new Blip(sample(this._signal, trigger));
  }

  switchMap<R>(fn: (value: T) => Signal<R>): Blip<R> {
    return new Blip(switchMap(this._signal, fn));
  }

  signal(): Signal<T> {
    return this._signal;
  }

  get(): T {
    return this._signal();
  }

  set(value: T): void {
    if (this.isWritableSignal(this._signal)) {
      this._signal.set(value);
    }
  }

  update(updateFn: (value: T) => T): void {
    if (this.isWritableSignal(this._signal)) {
      this._signal.update(updateFn);
    }
  }

  asReadonly(): Signal<T> {
    return this.isWritableSignal(this._signal)
      ? this._signal.asReadonly()
      : this._signal;
  }

  private isWritableSignal<U>(sig: any): sig is WritableSignal<U> {
    return 'set' in sig && typeof sig.set === 'function';
  }
}

export function blip<T>(initial: T): Blip<T> {
  return new Blip(signal(initial));
}
