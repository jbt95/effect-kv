# Effect-KV

A lightweight, type-safe wrapper around Cloudflare KV using Effect.ts. This library provides a functional programming interface with ergonomic DX, full type safety, and structured error handling.

## Features

- **Full Type Safety**: Leverages Effect's powerful type system and Schema validation
- **Functional Programming**: Pure functions, immutable operations, and composable effects
- **Structured Errors**: Tagged errors for type-safe error handling
- **Schema Validation**: Runtime type checking with Effect Schema
- **Testable**: Easy mocking with provided test layers
- **Ergonomic DX**: Sensible defaults, fluent APIs, and excellent IntelliSense

## Installation

```bash
npm install effect-kv effect
# or
pnpm add effect-kv effect
# or
yarn add effect-kv effect
```

## Quick Start

### Basic Usage

```typescript
import { Effect } from 'effect';
import { KV, layerFromNamespace } from 'effect-kv';
import type { KVNamespace } from '@cloudflare/workers-types';

// In a Cloudflare Worker
export default {
  async fetch(request, env): Promise<Response> {
    const program = Effect.gen(function* () {
      const kv = yield* KV;

      // Store a value
      yield* kv.put('key', 'value', { expirationTtl: 3600 });

      // Retrieve a value
      const value = yield* kv.get('key');

      // Handle missing values
      if (Option.isNone(value)) {
        return new Response('Not found', { status: 404 });
      }

      return new Response(value.value);
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(layerFromNamespace(env.MY_KV_NAMESPACE)))
    );

    return result;
  },
} satisfies ExportedHandler<{ MY_KV_NAMESPACE: KVNamespace }>;
```

### Type-Safe Operations with Schema Validation

```typescript
import { Effect, Schema } from 'effect';
import { KV, layerFromNamespace, makeTypedKV } from 'effect-kv';

const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/.+@.+\..+/)),
});

type User = Schema.Schema.Type<typeof UserSchema>;

const program = Effect.gen(function* () {
  const userKV = yield* makeTypedKV(UserSchema);

  // Type-safe put - validates at runtime
  yield* userKV.put('user:123', {
    id: 123,
    name: 'Alice',
    email: 'alice@example.com',
  });

  // Type-safe get - returns Option<User>
  const user = yield* userKV.get('user:123');

  // Type-safe getOrFail - returns User or fails
  const existingUser = yield* userKV.getOrFail('user:123');

  return existingUser;
});
```

### Error Handling

```typescript
import { Effect } from 'effect';
import { KV, KVGetError, KeyNotFoundError } from 'effect-kv';

const program = Effect.gen(function* () {
  const kv = yield* KV;
  const value = yield* kv.getOrFail('might-not-exist');
  return value;
}).pipe(
  // Handle specific error types
  Effect.catchTag('KeyNotFoundError', (error) => Effect.succeed(`Key ${error.key} was not found`)),
  Effect.catchTag('KVGetError', (error) => Effect.succeed(`Error getting value: ${error.message}`))
);
```

### Working with JSON

```typescript
const program = Effect.gen(function* () {
  const kv = yield* KV;

  // Automatic JSON serialization
  yield* kv.putJSON('config', {
    theme: 'dark',
    notifications: true,
  });

  // Automatic JSON parsing
  const config = yield* kv.getJSON<{ theme: string; notifications: boolean }>('config');

  return config;
});
```

## API Reference

### Core Operations

#### `KV.get(key, options?)`

Retrieves a value as text. Returns `Effect<Option<string>, KVGetError>`.

#### `KV.getJSON<T>(key, options?)`

Retrieves and parses a JSON value. Returns `Effect<Option<T>, KVGetError>`.

#### `KV.getArrayBuffer(key, options?)`

Retrieves a value as ArrayBuffer. Returns `Effect<Option<ArrayBuffer>, KVGetError>`.

#### `KV.getStream(key, options?)`

Retrieves a value as ReadableStream. Returns `Effect<Option<ReadableStream>, KVGetError>`.

#### `KV.put(key, value, options?)`

Stores a value. Returns `Effect<void, KVPutError>`.

#### `KV.putJSON<T>(key, value, options?)`

Serializes and stores JSON. Returns `Effect<void, KVPutError>`.

#### `KV.delete(key)`

Deletes a key. Returns `Effect<void, KVDeleteError>`.

#### `KV.list(options?)`

Lists keys with optional prefix/limit. Returns `Effect<ListResult, KVListError>`.

### Convenience Methods

#### `KV.getOrFail(key, options?)`

Gets value or fails with `KeyNotFoundError`. Returns `Effect<string, KVError>`.

#### `KV.getOrElse(key, defaultValue, options?)`

Gets value or returns default. Returns `Effect<string, KVError>`.

### Schema Operations

#### `makeTypedKV(schema)`

Creates a type-safe KV wrapper. Returns `Effect<TypedKV<V>, never, KV>`.

## Testing

The library provides test utilities for easy mocking:

```typescript
import { describe, it, expect } from 'vitest';
import { KV, KVTest } from 'effect-kv';
import { Effect } from 'effect';

// Create a mock KV namespace
const mockKV = {
  get: async () => 'mock-value',
  put: async () => {},
  delete: async () => {},
  list: async () => ({ keys: [], list_complete: true }),
} as unknown as KVNamespace;

describe('My Tests', () => {
  it('should work with mock KV', async () => {
    const program = Effect.gen(function* () {
      const kv = yield* KV;
      yield* kv.put('test', 'value');
      const value = yield* kv.get('test');
      return value;
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockKV))));

    expect(result).toEqual(Option.some('mock-value'));
  });
});
```

## Error Types

All errors are tagged for type-safe handling:

- `KVGetError` - Failed to retrieve a value
- `KVPutError` - Failed to store a value
- `KVDeleteError` - Failed to delete a key
- `KVListError` - Failed to list keys
- `KeyNotFoundError` - Key does not exist (used by `getOrFail`)

## License

MIT
