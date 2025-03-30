# BlipNg

**BlipNg** is a lightweight library of functional operators for Angular Signals.  
It brings expressive and composable utilities inspired by RxJS—but optimized for the reactive signal-based paradigm in Angular 17+.

---

## 🚀 Features

- Functional signal operators (`map`, `filter`, `debounce`, `merge`, etc.)
- Composable and testable
- Zero dependencies
- Compatible with Angular's `Signal<T>` and `WritableSignal<T>`
- Built for Angular 17+
- A lightweight store based solely on signals

---

## 📦 Installation

```bash
npm install blipng
```

---

## 🧠 Usage

```ts
import { signal } from '@angular/core';
import { map, debounce, merge, switchMap } from 'blipng';

const count = signal(0);
const doubled = map(count, n => n * 2);
```

## 🧱 BlipStore: lightweight reactive state management

BlipNg includes an optional injectable service, `BlipStore<T>`, for managing application or feature state using Angular Signals.

It provides a minimal, type-safe, and fully reactive alternative to NgRx or ComponentStore.

---

### 🛠️ Setup

Register it in your `app.config.ts` or `bootstrapApplication()`:

```ts
import { provideBlipStore } from 'blipng';

provideBlipStore<{ count: number; user: string | null }>({
  count: 0,
  user: null
})
```

---

### 📦 Usage in a component or service

```ts
import { BlipStore } from 'blipng';

@Component({...})
export class MyComponent {
  readonly count = this.store.select('count');
  readonly user = this.store.select('user');

  constructor(private store: BlipStore<{ count: number; user: string | null }>) {}

  increment() {
    this.store.update('count', c => c + 1);
  }

  login(name: string) {
    this.store.setState({ user: name });
  }
}
```

---

### 🧠 API

#### `select<K extends keyof T>(key: K): Signal<T[K]>`
Returns a signal for a specific property in the state.

#### `setState(partial: Partial<T>): void`
Partially replaces the state with new values.

#### `update<K extends keyof T>(key: K, updater: (value: T[K]) => T[K]): void`
Applies a transformation function to a specific key.

#### `state: Signal<T>`
Provides read-only access to the full state object.

---

### ✅ Example

```ts
const store = inject(BlipStore<{ count: number }>);

store.select('count')(); // 0

store.update('count', c => c + 1);
store.setState({ count: 42 });
```

---

### 🔍 Why BlipStore?

- 🔸 Type-safe and reactive
- 🔸 No actions, reducers or selectors
- 🔸 Encourages clean component-driven state
- 🔸 Built directly on Angular Signals
- 🔸 Easy to test and compose

---

### 🧪 Testing

BlipStore is fully testable using `TestBed`:

```ts
TestBed.configureTestingModule({
  providers: provideBlipStore({ count: 0, user: 'test' })
});
const store = TestBed.inject(BlipStore);
```

---

## 💡 Tip

You can create multiple stores (e.g., `AuthStore`, `TodoStore`) by extending `BlipStore<T>` or by registering with different types using `provideBlipStore()`.

---


## 📚 Available Operators

### `map(source, transform)`

Transforms the value of a signal.

```ts
map(count, n => n * 2); // → Signal<number>
```

---

### `filter(source, predicate)`

Filters values based on a condition. Returns `undefined` if the condition fails.

```ts
filter(count, n => n % 2 === 0); // → Signal<number | undefined>
```

---

### `debounce(source, delayMs)`

Emits the signal value only after a specified delay.

```ts
debounce(searchInput, 300); // → Signal<string>
```

---

### `distinctUntilChanged(source)`

Only emits when the value actually changes.

```ts
distinctUntilChanged(userId); // → Signal<string>
```

---

### `combine(...sources)`

Combines multiple signals into a single signal containing a tuple of their values.

```ts
combine(a, b, c); // → Signal<[A, B, C]>
```

---

### `merge(...sources)`

Merges multiple signals and emits the **last value received**, respecting the **actual order of emission**, even within the same Angular change detection cycle.

```ts
merge(a, b, c); // → Signal<T>
```

---

### `sample(source, trigger)`

Emits the current value of `source` **only** when `trigger` changes.

```ts
sample(formValue, submitClick);
```

---

### `switchMap(source, transform)`

Dynamically switches to a new signal when `source` changes.

```ts
switchMap(userId, id => fetchUserSignal(id));
```

---

## 🧪 Testing

BlipNg is tested with:

- Angular 17+
- `@angular/core/testing` utilities (`runInInjectionContext`, `fakeAsync`, `tick`)
- No DOM dependencies
- No Zone.js or Karma required

---

## 🔧 Example

```ts
const count = signal(0);
const even = filter(count, n => n % 2 === 0);
const delayed = debounce(count, 500);
const combined = combine(count, even);
const dynamic = switchMap(count, value => signal(`Count: ${value}`));
```

---

## 🧩 Why "BlipNg"?

Because it's small, reactive, and fits Angular's signal ecosystem perfectly.  
Also, it's fun to say.

---

## 📃 License

MIT