import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { effect, EnvironmentInjector, runInInjectionContext, Signal, signal, WritableSignal } from '@angular/core';
import { Blip, blip } from './blip';
import { merge } from 'blipng';

describe('Blip (with Angular injection context)', () => {
  let injector: EnvironmentInjector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(EnvironmentInjector);
  });

  it('should get and set values', () => {
    runInInjectionContext(injector, () => {
      const b = blip(5);
      expect(b.get()).toBe(5);

      b.set(10);
      expect(b.get()).toBe(10);
    });
  });

  it('should update values', () => {
    runInInjectionContext(injector, () => {
      const b = blip({ count: 1 });

      b.update(obj => ({ count: obj.count + 1 }));
      expect(b.get().count).toBe(2);
    });
  });

  it('should map values correctly', () => {
    runInInjectionContext(injector, () => {
      const b = blip(2);
      const mapped = b.map(n => n * 3);
      expect(mapped.get()).toBe(6);

      b.set(4);
      expect(mapped.get()).toBe(12);
    });
  });

  it('should filter values', () => {
    runInInjectionContext(injector, () => {
      const b = blip(1);
      const filtered = b.filter(n => n % 2 === 0);

      expect(filtered.get()).toBe(undefined);
      b.set(4);
      expect(filtered.get()).toBe(4);
      b.set(5);
      expect(filtered.get()).toBe(4); // last passing value retained
    });
  });

  it('should debounce values', (done) => {
    runInInjectionContext(injector, () => {
      const b = blip(1);
      const debounced = b.debounce(100);

      b.set(2);
      expect(debounced.get()).toBe(1);

      setTimeout(() => {
        expect(debounced.get()).toBe(2);
        done();
      }, 110);
    });
  });

  it('should apply distinctUntilChanged', () => {
    runInInjectionContext(injector, () => {
      const b = blip(1);
      const distinct = b.distinctUntilChanged();

      expect(distinct.get()).toBe(1);
      b.set(1);
      expect(distinct.get()).toBe(1); // no update
      b.set(2);
      expect(distinct.get()).toBe(2);
    });
  });

  it('should sample values on trigger', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const b = blip(10);
      const trigger = signal(false);
      const sampled = b.sample(trigger);
      b.set(20);
      expect(sampled.get()).toBe(10);

      trigger.set(true);
      flush();
      expect(sampled.get()).toBe(20);
    });
  }));

  it('should switchMap dynamically', () => {
    runInInjectionContext(injector, () => {
      const b = blip('a');
      const sm = b.switchMap(c => signal(c + '!'));

      expect(sm.get()).toBe('a!');
      b.set('z');
      expect(sm.get()).toBe('z!');
    });
  });

  it('should combine signals statically', () => {
    runInInjectionContext(injector, () => {
      const a = signal(1);
      const b = signal('x');
      const combined = Blip.combine(a, b);

      expect(combined.get()).toEqual([1, 'x']);
      a.set(2);
      expect(combined.get()).toEqual([2, 'x']);
    });
  });

  it('should merge signals statically', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const a = signal('a1');
      const b = signal('b1');
      const c = signal('c1');
      const merged = Blip.merge(b, a, c);
      tick();

      c.set('c2');
      b.set('b2');
      a.set('a2');
      tick()
      expect(merged.get()).toBe('a2');
    });
  }));

});
