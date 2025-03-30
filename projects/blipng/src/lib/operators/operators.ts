import { Signal, computed, signal, untracked, effect } from '@angular/core';
import { tick } from '@angular/core/testing';

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

export function debounce<T>(source: Signal<T>, delayMs: number): Signal<T> {
    const result = signal(source());
    let timeout: any;

    effect(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => result.set(source()), delayMs);
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
        return fifo[fifo.length - 1];
    });
}


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
  