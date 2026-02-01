import { Context, Effect, Option, Schema } from 'effect';
import { KVDeleteError, KVGetError, KVListError, KVPutError, type KVError } from './errors.js';
import type { GetOptions, KVValue, ListOptions, ListResult, PutOptions } from './types.js';
import type { TypedKV } from './schema.js';
import { makeTypedKV } from './schema.js';

/**
 * KV Service interface providing type-safe key-value operations
 */
export interface KVService {
  /**
   * Retrieves a value from KV
   * @param key - The key to retrieve
   * @param options - Optional get configuration
   * @returns Effect that resolves to Option of the value (None if not found)
   */
  readonly get: (
    key: string,
    options?: GetOptions
  ) => Effect.Effect<Option.Option<string>, KVError>;

  /**
   * Retrieves a value from KV as JSON
   * @param key - The key to retrieve
   * @param options - Optional get configuration
   * @returns Effect that resolves to Option of the parsed JSON value
   */
  readonly getJSON: <T = unknown>(
    key: string,
    options?: Omit<GetOptions, 'type'>
  ) => Effect.Effect<Option.Option<T>, KVError>;

  /**
   * Retrieves a value from KV as ArrayBuffer
   * @param key - The key to retrieve
   * @param options - Optional get configuration
   * @returns Effect that resolves to Option of the ArrayBuffer value
   */
  readonly getArrayBuffer: (
    key: string,
    options?: Omit<GetOptions, 'type'>
  ) => Effect.Effect<Option.Option<ArrayBuffer>, KVError>;

  /**
   * Retrieves a value from KV as ReadableStream
   * @param key - The key to retrieve
   * @param options - Optional get configuration
   * @returns Effect that resolves to Option of the stream
   */
  readonly getStream: (
    key: string,
    options?: Omit<GetOptions, 'type'>
  ) => Effect.Effect<Option.Option<ReadableStream>, KVError>;

  /**
   * Stores a value in KV
   * @param key - The key to store
   * @param value - The value to store
   * @param options - Optional put configuration
   * @returns Effect that resolves when complete
   */
  readonly put: (key: string, value: KVValue, options?: PutOptions) => Effect.Effect<void, KVError>;

  /**
   * Stores a JSON value in KV
   * @param key - The key to store
   * @param value - The JSON-serializable value
   * @param options - Optional put configuration
   * @returns Effect that resolves when complete
   */
  readonly putJSON: <T>(
    key: string,
    value: T,
    options?: PutOptions
  ) => Effect.Effect<void, KVError>;

  /**
   * Deletes a key from KV
   * @param key - The key to delete
   * @returns Effect that resolves when complete
   */
  readonly delete: (key: string) => Effect.Effect<void, KVError>;

  /**
   * Lists keys in KV namespace
   * @param options - Optional list configuration
   * @returns Effect that resolves to list result
   */
  readonly list: (options?: ListOptions) => Effect.Effect<ListResult, KVError>;

  /**
   * Gets a value or fails if not found
   * @param key - The key to retrieve
   * @param options - Optional get configuration
   * @returns Effect that resolves to value or fails with KeyNotFoundError
   */
  readonly getOrFail: (key: string, options?: GetOptions) => Effect.Effect<string, KVError>;

  /**
   * Gets a value with a default fallback
   * @param key - The key to retrieve
   * @param defaultValue - Value to return if key not found
   * @param options - Optional get configuration
   * @returns Effect that resolves to value or default
   */
  readonly getOrElse: (
    key: string,
    defaultValue: string,
    options?: GetOptions
  ) => Effect.Effect<string, KVError>;
}

/**
 * Context tag for the KV Service with callable schema support
 * @example
 * ```typescript
 * // Basic string-based KV operations (default)
 * const kv = yield* KV
 * yield* kv.put('key', 'value')
 * const value = yield* kv.get('key') // Option<string>
 *
 * // Schema-validated JSON operations
 * const UserSchema = Schema.Struct({ id: Schema.Number, name: Schema.String })
 * const userKV = yield* KV(UserSchema)
 * yield* userKV.put('user:1', { id: 1, name: 'Alice' })
 * const user = yield* userKV.get('user:1') // Option<{ id: number, name: string }>
 * ```
 */
const KVTag = Context.Tag('effect-kv/KV')<'effect-kv/KV', KVService>();

// Create callable function that delegates to makeTypedKV
const KVCallable = <V>(
  schema: Schema.Schema<V>
): Effect.Effect<TypedKV<V>, never, 'effect-kv/KV'> => makeTypedKV(schema);

// Copy all tag properties to the callable function
Object.setPrototypeOf(KVCallable, Object.getPrototypeOf(KVTag));
Object.defineProperties(KVCallable, Object.getOwnPropertyDescriptors(KVTag));

export const KV = KVCallable as Context.Tag<'effect-kv/KV', KVService> & {
  <V>(schema: Schema.Schema<V>): Effect.Effect<TypedKV<V>, never, 'effect-kv/KV'>;
};
