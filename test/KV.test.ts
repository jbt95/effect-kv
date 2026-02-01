import { Effect, Option, Schema } from 'effect';
import { describe, expect, it, beforeEach } from 'vitest';
import { KV, KVTest } from '../src';
import type { KVNamespace } from '@cloudflare/workers-types';

// Mock KV namespace for unit testing
const createMockKV = (): KVNamespace => {
  const store = new Map<string, { value: string; metadata?: Record<string, unknown> }>();

  return {
    get: async (key: string, options?: { type?: string; cacheTtl?: number }) => {
      const data = store.get(key);
      if (!data) return null;

      if (options?.type === 'json') {
        return JSON.parse(data.value);
      }
      return data.value;
    },
    put: async (
      key: string,
      value: string | ArrayBuffer | ReadableStream,
      options?: { expiration?: number; expirationTtl?: number; metadata?: Record<string, unknown> }
    ) => {
      if (typeof value === 'string') {
        store.set(key, { value, metadata: options?.metadata });
      }
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async (options?: { prefix?: string; limit?: number; cursor?: string }) => {
      const keys = Array.from(store.keys())
        .filter((k) => !options?.prefix || k.startsWith(options.prefix))
        .slice(0, options?.limit || 1000)
        .map((name) => ({ name }));

      return {
        keys,
        list_complete: true,
      };
    },
  } as unknown as KVNamespace;
};

describe('KV Operations', () => {
  let mockNamespace: KVNamespace;

  beforeEach(() => {
    mockNamespace = createMockKV();
  });

  describe('put and get', () => {
    it('should store and retrieve a string value', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.put('test-key', 'test-value');
        const value = yield* kv.get('test-key');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toEqual(Option.some('test-value'));
    });

    it('should return None for non-existent key', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        const value = yield* kv.get('non-existent-key');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toEqual(Option.none());
    });
  });

  describe('putJSON and getJSON', () => {
    it('should store and retrieve JSON values', async () => {
      const testData = { id: 123, name: 'Test User', active: true };

      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.putJSON('test-json', testData);
        const value = yield* kv.getJSON<typeof testData>('test-json');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toEqual(Option.some(testData));
    });

    it('should return None for non-existent JSON key', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        const value = yield* kv.getJSON('non-existent-json');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toEqual(Option.none());
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.put('delete-test', 'value');
        yield* kv.delete('delete-test');
        const value = yield* kv.get('delete-test');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toEqual(Option.none());
    });

    it('should succeed when deleting non-existent key', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.delete('never-existed');
        return 'deleted';
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toBe('deleted');
    });
  });

  describe('list', () => {
    it('should list keys', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.put('list-key-1', 'value1');
        yield* kv.put('list-key-2', 'value2');
        const result = yield* kv.list({ prefix: 'list-key-' });
        return result;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result.keys.length).toBeGreaterThanOrEqual(2);
      expect(result.keys.some((k) => k.name === 'list-key-1')).toBe(true);
      expect(result.keys.some((k) => k.name === 'list-key-2')).toBe(true);
    });

    it('should support pagination options', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.put('page-1', 'value');
        yield* kv.put('page-2', 'value');
        yield* kv.put('page-3', 'value');
        const result = yield* kv.list({ prefix: 'page-', limit: 2 });
        return result;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result.keys.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getOrFail', () => {
    it('should return value when key exists', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.put('exists', 'value');
        const value = yield* kv.getOrFail('exists');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toBe('value');
    });

    it('should fail when key does not exist', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        const value = yield* kv.getOrFail('never-exists');
        return value;
      });

      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(exit._tag).toBe('Failure');
    });
  });

  describe('getOrElse', () => {
    it('should return value when key exists', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        yield* kv.put('has-value', 'actual-value');
        const value = yield* kv.getOrElse('has-value', 'default');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toBe('actual-value');
    });

    it('should return default when key does not exist', async () => {
      const program = Effect.gen(function* () {
        const kv = yield* KV;
        const value = yield* kv.getOrElse('no-value', 'default');
        return value;
      });

      const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

      expect(result).toBe('default');
    });
  });
});

describe('Schema Validation', () => {
  let mockNamespace: KVNamespace;

  beforeEach(() => {
    mockNamespace = createMockKV();
  });

  const UserSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String,
  });

  type User = Schema.Schema.Type<typeof UserSchema>;

  it('should validate and store typed data', async () => {
    const program = Effect.gen(function* () {
      const typedKV = yield* KV(UserSchema);
      const user: User = { id: 123, name: 'Alice', email: 'alice@example.com' };
      yield* typedKV.put('user:123', user);
      const result = yield* typedKV.get('user:123');
      return result;
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

    expect(result).toEqual(Option.some({ id: 123, name: 'Alice', email: 'alice@example.com' }));
  });

  it('should return None for non-existent keys', async () => {
    const program = Effect.gen(function* () {
      const typedKV = yield* KV(UserSchema);
      const result = yield* typedKV.get('user:nonexistent');
      return result;
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

    expect(result).toEqual(Option.none());
  });
});

describe('Error Handling', () => {
  let mockNamespace: KVNamespace;

  beforeEach(() => {
    mockNamespace = createMockKV();
  });

  it('should handle KeyNotFoundError with catchTag', async () => {
    const { KeyNotFoundError } = await import('../src/errors.js');

    const program = Effect.gen(function* () {
      const kv = yield* KV;
      const value = yield* kv.getOrFail('non-existent');
      return value;
    }).pipe(
      Effect.catchTag('KeyNotFoundError', (error) => Effect.succeed(`Key not found: ${error.key}`))
    );

    const result = await Effect.runPromise(program.pipe(Effect.provide(KVTest(mockNamespace))));

    expect(result).toBe('Key not found: non-existent');
  });
});
