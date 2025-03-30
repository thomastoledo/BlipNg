import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { BlipNgStore, provideBlipStore } from './blipng.store';
import { effect, EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { merge } from 'blipng';

interface TestState {
  count: number;
  user: string | null;
}

describe('BlipStore (with Blip)', () => {
  let store: BlipNgStore<TestState>;
  let injector: EnvironmentInjector;
  const initialState = { count: 1, user: 'alice' };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: provideBlipStore<TestState>(initialState)
    });
    store = TestBed.inject(BlipNgStore<TestState>);
    store.state.set(initialState)
    injector = TestBed.inject(EnvironmentInjector);

  });

  it('should expose the current state as a Blip', () => {
    expect(store.state.get()).toEqual(initialState);
  });

  it('should allow selecting a key as a Blip', () => {
    const countBlip = store.select('count');
    expect(countBlip.get()).toBe(1);
  });

  it('should update the state with setState()', () => {
    store.setState({ count: 5 });
    expect(store.state.get().count).toBe(5);
    expect(store.state.get().user).toBe('alice');
  });

  it('should update a single key with update()', () => {
    store.update('count', c => c + 10);
    expect(store.state.get().count).toBe(11);
  });

  it('selected Blips should reflect updated values', () => {
    const userBlip = store.select('user');
    expect(userBlip.get()).toBe('alice');
    store.setState({ user: 'bob' });
    expect(userBlip.get()).toBe('bob');
  });

  it('should allow chaining operators on select()', () => {
    const doubled = store.select('count').map(c => c * 2);
    expect(doubled.get()).toBe(2);
    store.update('count', c => c + 2);
    expect(doubled.get()).toBe(6);
  });


  it('should debounce updates', fakeAsync(() => {
    runInInjectionContext(injector, () => {

      const debounced = store.select('count').debounce(300);
      let latest: number = debounced.get();
  
      effect(() => {
        latest = debounced.get();
      });
  
      store.setState({ count: 5 });
      tick(100);
      expect(latest).toBe(1);
      tick(300);
      expect(latest).toBe(5);
    });
  }));

  it('should filter updates', () => {
    const even = store.select('count').filter(c => c % 2 === 0);
    expect(even.get()).toBeUndefined();

    store.setState({ count: 4 });
    expect(even.get()).toBe(4);

    store.setState({ count: 5 });
    expect(even.get()).toBe(4);
  });

  it('should allow combining selected signals', () => {
    const combined = store.select('count')
      .map(count => ({
        count,
        user: store.select('user').get()
      }));

    expect(combined.get()).toEqual({ count: 1, user: 'alice' });
    store.setState({ count: 7, user: 'bob' });
    expect(combined.get()).toEqual({ count: 7, user: 'bob' });
  });


  it('should support switchMap operator', () => {
    runInInjectionContext(injector, () => {
      const switched = store.select('count').switchMap(count => signal(count * 10));
      expect(switched.get()).toBe(10);
      store.setState({ count: 4 });
      expect(switched.get()).toBe(40);
    });
  });

  it('should support sample operator', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const trigger = signal(false);
      const sampled = store.select('count').sample(trigger);
  
      store.setState({ count: 99 });
      expect(sampled.get()).toBe(1);
      trigger.set(true);
      flush();
      expect(sampled.get()).toBe(99);
    });
  }));

  it('should support longer operator chains', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const chain = store.select('count')
        .filter(c => c > 0)
        .map(c => (c ?? 0) * 3)
        .debounce(200)
        .distinctUntilChanged();
  
      let value = chain.get();
  
      effect(() => {
        value = chain.get();
      });
  
      store.setState({ count: 2 });
      tick(100);
      expect(value).toBe(3);
      tick(200);
      expect(value).toBe(6);
  
      store.setState({ count: 2 });
      tick(200);
      expect(value).toBe(6);
  
      store.setState({ count: 3 });
      tick(300);
      expect(value).toBe(9);
    });
  }));

  it('should support merge operator', fakeAsync(() => {
    runInInjectionContext(injector, () => {

      const a = store.select('count');
      const b = store.select('count').map(c => c + 1);
      const merged = merge(a.signal(), b.signal());
  
      tick();
      let result = merged();
  
      effect(() => {
        result = merged();
      });

      tick();
      expect(result).toBe(2);
      tick();
      store.setState({ count: 3 });
      tick();
      expect(result).toBe(4);
      store.setState({ count: 5 });
      tick();
      expect(result).toBe(6);
    })
  }));
});
