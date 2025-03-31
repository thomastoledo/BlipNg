import { Signal, computed, signal, untracked, effect } from '@angular/core';

export function map<T, R>(source: Signal<T>, transform: (value: T) => R): Signal<R> {
    return computed(() => transform(source()));
}

export function filter<T>(source: Signal<T>, predicate: (value: T) => boolean): Signal<T | undefined> {
    let previous: T;
    return computed(() => {
        const value = source();
        return predicate(value) ? (previous = value) : previous;
    });
}

/**
 * @deprecated this operator goes against Signals philosophy and will be removed in the next versions
 * Please stick to Observables for this one
 * @param source 
 * @param delayMs 
 * @returns a debounced Signal
 */
export function debounce<T>(source: Signal<T>, delayMs: number): Signal<T> {
    const result = signal(source());
    let timeout: number;
  
    effect(() => {
      clearTimeout(timeout);
      const current = source();
      timeout = window.setTimeout(() => {
        queueMicrotask(() => result.set(current));
      }, delayMs);
    });
  
    return result;
  }
  

export function distinctUntilChanged<T>(source: Signal<T>): Signal<T> {
    let previous: T;
    return computed(() => {
        const current = source();
        if (current !== previous) {
            previous = current;
            return current;
        }
        return previous;
    });
}

export function combine<T extends unknown[]>(...sources: { [K in keyof T]: Signal<T[K]> }): Signal<T> {
    return computed(() => sources.map(s => s()) as T);
}

/**
 * @deprecated this operator goes against Signals philosophy and will be removed in the next versions
 * Please stick to Observables or use mergeMap with interop Signal for this one
 * @param sources
 * @returns 
 */
export function merge<T>(...sources: Signal<T>[]): Signal<T> {

    if (sources.length === 0) {
        throw new Error(`[BlipNg:merge] Expected at least one signal to merge, but got none.`)
    }
    const queue = signal<T[]>([]);

    sources.forEach((source) => {
        effect(() => {
            const value = source();
            queue.update((state) => [...state, value]);
        });
    });

    return computed(() => {
        const fifo = [...queue()];
        return fifo.length > 0 ? fifo[fifo.length - 1] : untracked(sources[0]);
    });
}

/**
 * @deprecated this operator goes against Signals philosophy and will be removed in the next versions
 * Please use toSignal(toObservable(...).pipe(sample(...))) or stick to observables for this one
 * @param source 
 * @param trigger 
 * @returns a Signal
 */
export function sample<T>(source: Signal<T>, trigger: Signal<any>): Signal<T> {

    const result = signal(source());

    effect(() => {
        trigger();
        result.set(untracked(source));
    });

    return result;
}

export function switchMap<T, R>(source: Signal<T>, transform: (value: T) => Signal<R>): Signal<R> {
    return computed(() => {
      return transform(source())();
    });
  }
  