# BlipNg

**BlipNg** is a lightweight, expressive and chainable utility layer for Angular Signals.
It provides a `Blip<T>` wrapper class that allows functional-style chaining of signal transformations, as well as a simple `blip()` helper function to quickly create signal-backed state.

It also includes a minimal, composable store: `BlipNgStore`, for simple global state management without NgRx.

## ✨ Features

- 🧠 Expressive API with `map`, `filter`, `switchMap`, etc.
- ⚡ Works with native Angular Signals
- 💬 Encourages a declarative, reactive mindset
- 🧱 Includes `BlipNgStore` for lightweight reactive state
- ❌ Excludes impure/asynchronous operators by design (see below)

---

## 🚀 Getting Started

Install the package:

```bash
npm install blipng
```

Import what you need:

```ts
import { blip, Blip, BlipNgStore, provideBlipStore } from 'blipng';
```

---

## 🛠 Usage

### Create a Blip

```ts
const count = blip(0); // WritableSignal wrapped in a Blip
```

### Read and write values

```ts
count.get();      // 0
count.set(1);     // set to 1
count.update(v => v + 1); // increment
```

### Readonly access

```ts
const readonlySignal = count.asReadonly();
```

### Access raw signal (for interop)

```ts
const angularSignal = count.signal();
```

---

## 📦 Operator chaining

### `map()`
```ts
const doubled = count.map(c => c * 2);
```

### `filter()`
```ts
const evenOnly = count.filter(c => c % 2 === 0);
```

### `distinctUntilChanged()`
```ts
const deduped = count.distinctUntilChanged();
```

### `switchMap()`
```ts
const status = count.switchMap(c => blip(c > 10 ? 'big' : 'small').signal());
```

---

## 🧩 Combine multiple signals

```ts
const a = blip(1);
const b = blip(2);
const combined = Blip.combine(a.signal(), b.signal());

combined.get(); // [1, 2]
```

---

## 🏪 BlipNgStore (Lightweight State Management)

BlipNgStore is a simple, reactive global store powered by Signals and Blip.

### Provide the store in your app:
```ts
@NgModule({
  providers: [
    provideBlipStore({ count: 0, user: 'guest' })
  ]
})
export class AppModule {}
```

### Inject and use it:
```ts
@Component({...})
export class MyComponent {
  private store = inject(BlipNgStore<{ count: number; user: string }>)

  count = this.store.select('count');

  increment() {
    this.store.update('count', c => c + 1);
  }
}
```

### Methods:
- `select(key)` → returns a Blip of the selected property
- `setState(partial)` → shallow merge
- `update(key, fn)` → update a specific property with a transform
- `state` → returns the whole state as a `Blip<T>`

---

## ⚠️ Deprecated / Removed Operators

To preserve the **synchronous and pure** nature of Angular Signals, the following operators are marked deprecated and will be removed:

| Operator     | Reason |
|--------------|--------|
| `debounce()` | Asynchronous with hidden `effect()` and `setTimeout()`; prefer RxJS interop |
| `merge()`    | Impure, creates internal effects, breaks dependency tracking |
| `sample()`   | Not traceable via Signal graph, impure `effect()` |

### ✅ Preferred alternatives:

Use `toSignal()` and `toObservable()` from `@angular/core/rxjs-interop`:

```ts
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';

const debounced = toSignal(
  toObservable(count.signal()).pipe(debounceTime(300))
);
```

---

## 🤔 Why BlipNg instead of using raw Signals directly?

Raw Angular Signals are great — but their ergonomics can become verbose:

```ts
const count = signal(0);
const doubled = computed(() => count() * 2);
count.set(count() + 1);
```

With BlipNg:

```ts
const count = blip(0);
const doubled = count.map(v => v * 2);
count.update(v => v + 1);
```

### Benefits:
- 👀 Clearer intent with method chaining
- 📦 Simplifies computed logic
- 🧩 Enables reusable, composable transformations
- 🏪 BlipNgStore adds a lightweight alternative to NgRx

Use BlipNg when you want structure, expressiveness, and composability — all with the full power of Angular Signals under the hood.

---

## ✅ Philosophy

- 🔒 Signals are **synchronous**, **pull-based** and **pure**
- ❌ We avoid hidden side-effects and async behavior inside operators
- 🌱 If you need advanced async logic — use RxJS. If you want lightweight reactivity — use Signals + BlipNg

---

## 📜 License

MIT

---

Made with ❤️ and signals.
