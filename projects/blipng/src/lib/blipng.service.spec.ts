import { runInInjectionContext, destroyPlatform } from '@angular/core';
import { BlipNgStore, provideBlipStore } from './blipng.store';
import { TestBed } from '@angular/core/testing';

interface TestState {
  count: number;
  user: string | null;
}

describe('BlipStore', () => {
  let store: BlipNgStore<TestState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: provideBlipStore<TestState>({ count: 1, user: 'alice' })
    });
    store = TestBed.inject(BlipNgStore<TestState>);
  });

  afterEach(() => {
    destroyPlatform();
  });

  it('should expose the current state as a signal', () => {
    expect(store.state()).toEqual({ count: 1, user: 'alice' });
  });

  it('should allow selecting a specific key', () => {
    const countSignal = store.select('count');
    expect(countSignal()).toBe(1);
  });

  it('should update the state via setState', () => {
    store.setState({ count: 5 });
    expect(store.state().count).toBe(5);
    expect(store.state().user).toBe('alice');
  });

  it('should update a specific key via update()', () => {
    store.update('count', c => c + 10);
    expect(store.state().count).toBe(11);
  });

  it('select() should reflect updated values', () => {
    const userSignal = store.select('user');
    expect(userSignal()).toBe('alice');
    store.setState({ user: 'bob' });
    expect(userSignal()).toBe('bob');
  });
});
