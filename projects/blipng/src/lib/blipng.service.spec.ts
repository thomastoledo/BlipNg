import { TestBed } from '@angular/core/testing';
import { BlipNgStore, provideBlipStore } from './blipng.store';

interface TestState {
  count: number;
  user: string | null;
}

describe('BlipStore (with Blip)', () => {
  let store: BlipNgStore<TestState>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: provideBlipStore<TestState>({ count: 1, user: 'alice' })
    });
    store = TestBed.inject(BlipNgStore<TestState>);
  });

  it('should expose the current state as a Blip', () => {
    expect(store.state.get()).toEqual({ count: 1, user: 'alice' });
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
});
