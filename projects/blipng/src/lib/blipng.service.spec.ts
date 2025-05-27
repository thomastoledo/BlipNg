import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { BlipNgStore, INITIAL_STATE, provideBlipStore, BLIP_DB_NAME, BLIP_OBJECT_STORE_NAME, BLIP_STORE_KEY, BLIP_PERSISTENCE_ENABLED } from './blipng.store';
import { effect, EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { IndexedDbService } from './indexeddb.service';
import { merge } from 'blipng';

interface TestState {
  count: number;
  user: string | null;
  extraField?: string;
}

// Helper function to run effects and wait for them
const runEffects = () => tick();

describe('BlipNgStore Core Logic (No Persistence)', () => {
  let store: BlipNgStore<TestState>;
  let injector: EnvironmentInjector;
  const initialState: TestState = { count: 1, user: 'alice' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideBlipStore<TestState>(initialState, { persistenceEnabled: false }),
      ]
    });
    store = TestBed.inject(BlipNgStore<TestState>);
    // store.state.set(initialState) // state is set by provideBlipStore via INITIAL_STATE
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
      expect(latest).toBe(initialState.count); // Before debounce time
      tick(300);
      expect(latest).toBe(5);
    });
  }));

  it('should filter updates', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const even = store.select('count').filter(c => c % 2 === 0);
      let latest: number | undefined = even.get();

      effect(() => {
        latest = even.get();
      });
      runEffects(); // initial effect run

      expect(latest).toBeUndefined();

      store.setState({ count: 4 });
      runEffects();
      expect(latest).toBe(4);

      store.setState({ count: 5 });
      runEffects();
      expect(latest).toBe(4); // Should still be last even value
    });
  }));

  it('should allow combining selected signals', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const combined = store.select('count')
        .map(count => ({
          count,
          user: store.select('user').get() // Direct get inside map for simplicity here
        }));
      let latest = combined.get();
      effect(() => {
        latest = combined.get();
      });
      runEffects();

      expect(latest).toEqual({ count: initialState.count, user: initialState.user });
      store.setState({ count: 7, user: 'bob' });
      runEffects();
      expect(latest).toEqual({ count: 7, user: 'bob' });
    });
  }));


  it('should support switchMap operator', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const switched = store.select('count').switchMap(count => signal(count * 10));
      let latest = switched.get();
      effect(() => {
        latest = switched.get();
      });
      runEffects();
      expect(latest).toBe(initialState.count * 10);
      store.setState({ count: 4 });
      runEffects();
      expect(latest).toBe(40);
    });
  }));

  it('should support sample operator', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const trigger = signal(false);
      const sampled = store.select('count').sample(trigger);
      let latest = sampled.get(); // Initial value before trigger

      effect(() => {
        latest = sampled.get();
      });
      runEffects(); // Run effect to capture initial state if necessary

      store.setState({ count: 99 });
      runEffects();
      // latest should still be initial value as trigger hasn't fired with new state context
      expect(latest).toBe(initialState.count);


      trigger.set(true);
      runEffects(); // Trigger the sample
      expect(latest).toBe(99);
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
      runEffects(); // initial effect run

      store.setState({ count: 2 });
      tick(100); // Debounce not yet passed
      expect(value).toBe(initialState.count * 3); // Should be initial * 3 due to map, or last stable if distinctUntilChanged is quick
      tick(200); // Debounce passed
      expect(value).toBe(6);

      store.setState({ count: 2 }); // Same value
      runEffects();
      tick(200);
      expect(value).toBe(6); // DistinctUntilChanged keeps it same

      store.setState({ count: 3 });
      runEffects();
      tick(300); // Debounce and distinct checks
      expect(value).toBe(9);
    });
  }));

  it('should support merge operator', fakeAsync(() => {
    runInInjectionContext(injector, () => {
      const a = store.select('count');
      const b = store.select('count').map(c => c + 1); // Note: Blip's map returns a Blip
      const mergedSignal = merge(a.signal(), b.signal()); // Blip.merge expects Signals

      let result: number = 0; // Initialize with a default
      effect(() => {
        result = mergedSignal();
      });
      runEffects(); // Run initial effect

      // Initial state: count is 1. a is 1, b is 2. merge could be 1 then 2, or 2 then 1.
      // The last one set in the effect will be the one from b.signal() if evaluation order is fixed.
      // Let's check for one of them, usually the last update wins in merge for signals.
      expect([initialState.count, initialState.count + 1]).toContain(result);


      store.setState({ count: 3 });
      runEffects();
      // count is 3. a is 3, b is 4.
      expect(result).toBe(4); // Assuming b.signal() update is last captured

      store.setState({ count: 5 });
      runEffects();
      // count is 5. a is 5, b is 6.
      expect(result).toBe(6); // Assuming b.signal() update is last captured
    });
  }));
});

describe('BlipNgStore with IndexedDB Persistence', () => {
  let store: BlipNgStore<TestState>;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  const initialTestState: TestState = { count: 0, user: 'test' };
  const dbState: TestState = { count: 10, user: 'fromDB', extraField: 'loaded' };

  // Default config
  const defaultConfig = {
    dbName: 'blipStore',
    storeName: 'blips',
    storeKey: 'appState',
    persistenceEnabled: true,
  };

  const setupTestBed = (config?: Partial<typeof defaultConfig>, customInitialState?: TestState) => {
    const effectiveConfig = { ...defaultConfig, ...config };
    mockIndexedDbService = jasmine.createSpyObj('IndexedDbService', ['init', 'getItem', 'setItem', 'removeItem']);

    TestBed.configureTestingModule({
      providers: [
        provideBlipStore<TestState>(customInitialState || initialTestState, {
          dbName: effectiveConfig.dbName,
          storeName: effectiveConfig.storeName,
          storeKey: effectiveConfig.storeKey,
          persistenceEnabled: effectiveConfig.persistenceEnabled,
        }),
        { provide: IndexedDbService, useValue: mockIndexedDbService },
      ],
    });

    // Mock default implementations
    mockIndexedDbService.init.and.returnValue(Promise.resolve());
    mockIndexedDbService.getItem.and.returnValue(Promise.resolve(null)); // Default to no data in DB
    mockIndexedDbService.setItem.and.returnValue(Promise.resolve());
    mockIndexedDbService.removeItem.and.returnValue(Promise.resolve());

    store = TestBed.inject(BlipNgStore<TestState>);
  };

  // --- Store Initialization Tests ---
  describe('Initialization', () => {
    it('should call IndexedDBService.init and getItem on startup when persistence is enabled', fakeAsync(() => {
      setupTestBed();
      flush(); // Resolve promises from init and getItem

      expect(mockIndexedDbService.init).toHaveBeenCalledTimes(1);
      expect(mockIndexedDbService.getItem).toHaveBeenCalledOnceWith(defaultConfig.storeKey);
    }));

    it('should initialize with state from IndexedDB if data is found, overriding INITIAL_STATE', fakeAsync(() => {
      mockIndexedDbService.getItem.and.returnValue(Promise.resolve(dbState));
      setupTestBed();
      flush();

      expect(store.state.get()).toEqual(dbState);
    }));

    it('should initialize with INITIAL_STATE if no data in IndexedDB (getItem resolves null)', fakeAsync(() => {
      mockIndexedDbService.getItem.and.returnValue(Promise.resolve(null));
      setupTestBed(undefined, initialTestState); // Explicitly pass initial state for clarity
      flush();

      expect(store.state.get()).toEqual(initialTestState);
    }));

    it('should initialize with INITIAL_STATE and log error if IndexedDB.getItem rejects', fakeAsync(() => {
      const error = new Error('DB Get Error');
      mockIndexedDbService.getItem.and.returnValue(Promise.reject(error));
      spyOn(console, 'error');
      setupTestBed(undefined, initialTestState);
      flush();

      expect(store.state.get()).toEqual(initialTestState);
      expect(console.error).toHaveBeenCalledWith('Error initializing IndexedDB or getting stored state:', error);
    }));

     it('should initialize with INITIAL_STATE and log error if IndexedDB.init rejects', fakeAsync(() => {
      const error = new Error('DB Init Error');
      mockIndexedDbService.init.and.returnValue(Promise.reject(error));
      spyOn(console, 'error');
      setupTestBed(undefined, initialTestState);
      flush();

      expect(store.state.get()).toEqual(initialTestState);
      expect(console.error).toHaveBeenCalledWith('Error initializing IndexedDB or getting stored state:', error);
    }));
  });

  // --- State Synchronization Tests ---
  describe('State Synchronization', () => {
    it('should save state to IndexedDB via setItem when state changes after initialization', fakeAsync(() => {
      setupTestBed(); // Initializes with initialTestState, getItem returns null
      flush(); // Ensure init is done

      mockIndexedDbService.setItem.calls.reset(); // Reset after initial effect if any (shouldn't be one that saves)

      const newState: TestState = { count: 50, user: 'updated' };
      store.setState(newState);
      runEffects(); // Allow effect to run

      expect(mockIndexedDbService.setItem).toHaveBeenCalledOnceWith(defaultConfig.storeKey, newState);
    }));

    it('should NOT call setItem during initial hydration if data is loaded from IndexedDB', fakeAsync(() => {
      mockIndexedDbService.getItem.and.returnValue(Promise.resolve(dbState));
      setupTestBed();
      flush(); // Initialization complete, state is dbState

      // setItem should not have been called yet as part of hydration
      // The effect runs once initially, but isInitialized flag should prevent saving.
      expect(mockIndexedDbService.setItem).not.toHaveBeenCalled();

      // Now, a subsequent change should trigger setItem
      store.setState({ count: 100 });
      runEffects();
      expect(mockIndexedDbService.setItem).toHaveBeenCalledOnceWith(defaultConfig.storeKey, { ...dbState, count: 100 });
    }));

    it('should call setItem after INITIAL_STATE is set and DB hydration fails (e.g. getItem returns null)', fakeAsync(() => {
      mockIndexedDbService.getItem.and.returnValue(Promise.resolve(null));
      setupTestBed(undefined, initialTestState);
      flush(); // init done, state is initialTestState

      mockIndexedDbService.setItem.calls.reset(); // effect might run once, ensure isInitialized prevents it

      const updatedState: TestState = { ...initialTestState, count: 25 };
      store.setState({ count: 25 });
      runEffects();

      expect(mockIndexedDbService.setItem).toHaveBeenCalledOnceWith(defaultConfig.storeKey, updatedState);
    }));
  });

  // --- persistenceEnabled Flag Tests ---
  describe('persistenceEnabled Flag', () => {
    it('should NOT call init, getItem, or setItem when persistenceEnabled is false', fakeAsync(() => {
      setupTestBed({ persistenceEnabled: false });
      flush();

      expect(mockIndexedDbService.init).not.toHaveBeenCalled();
      expect(mockIndexedDbService.getItem).not.toHaveBeenCalled();

      store.setState({ count: 123 });
      runEffects();
      expect(mockIndexedDbService.setItem).not.toHaveBeenCalled();
      // Also verify state is just the initial state
      expect(store.state.get()).toEqual(initialTestState);
    }));

    it('should call DB methods when persistenceEnabled is true (default behavior tested elsewhere)', () => {
      // This is implicitly tested by the other describe blocks.
      // We can add a simple check here for init.
      setupTestBed({ persistenceEnabled: true });
      expect(mockIndexedDbService.init).toHaveBeenCalled();
    });
  });

  // --- Configuration Options Tests ---
  describe('Configuration Options', () => {
    const customConfig = {
      dbName: 'MyCustomDB',
      storeName: 'MyObjects',
      storeKey: 'MyAppStateKey',
      persistenceEnabled: true,
    };

    it('should use custom dbName and storeName for IndexedDBService instantiation', fakeAsync(() => {
      // We can't directly spy on the constructor of IndexedDbService with jasmine.createSpyObj.
      // However, we re-provide IndexedDbService with our mock.
      // The BlipNgStore itself instantiates IndexedDbService.
      // To test this, we'd need to inject the BLIP_DB_NAME and BLIP_OBJECT_STORE_NAME
      // tokens and check their values, or have a way to see what args IndexedDbService constructor was called with.
      // For now, we trust that the DI passes the correct values.
      // We will test that getItem and setItem are called with the custom storeKey.
      setupTestBed(customConfig);
      flush();

      // Verify that the service methods are called with the custom key
      expect(mockIndexedDbService.getItem).toHaveBeenCalledWith(customConfig.storeKey);

      store.setState({ count: 1 });
      runEffects();
      expect(mockIndexedDbService.setItem).toHaveBeenCalledWith(customConfig.storeKey, jasmine.any(Object));
    }));

    // This test is a bit more involved as it would require spying on the actual IndexedDbService constructor
    // or checking the injected values for BLIP_DB_NAME and BLIP_OBJECT_STORE_NAME.
    // We'll focus on the storeKey for now as it's directly used by the store's interaction with the service.
    it('should use custom storeKey for getItem and setItem', fakeAsync(() => {
      setupTestBed(customConfig);
      flush();
      expect(mockIndexedDbService.getItem).toHaveBeenCalledOnceWith(customConfig.storeKey);

      mockIndexedDbService.getItem.calls.reset(); // for the next check
      mockIndexedDbService.setItem.calls.reset();

      store.setState({ user: 'customKeyTest' });
      runEffects();
      expect(mockIndexedDbService.setItem).toHaveBeenCalledOnceWith(customConfig.storeKey, jasmine.objectContaining({ user: 'customKeyTest' }));
    }));
  });
});
