import { Effect, Option, Schema } from 'effect';
import { KVGetError, KVPutError, type KVError } from './errors.js';
import { KV } from './KV.js';
import type { PutOptions } from './types.js';

/**
 * Schema-enhanced KV operations for type-safe storage and retrieval
 */
export interface TypedKV<V> {
  /**
   * Retrieves and validates a value from KV
   * @param key - The key to retrieve
   * @returns Effect resolving to validated value (None if not found)
   */
  readonly get: (key: string) => Effect.Effect<Option.Option<V>, KVError>;

  /**
   * Validates and stores a value in KV
   * @param key - The key to store
   * @param value - The value to validate and store
   * @param options - Optional put configuration
   * @returns Effect that resolves when complete
   */
  readonly put: (key: string, value: V, options?: PutOptions) => Effect.Effect<void, KVError>;

  /**
   * Retrieves value or fails if not found
   * @param key - The key to retrieve
   * @returns Effect resolving to validated value or fails
   */
  readonly getOrFail: (key: string) => Effect.Effect<V, KVError>;

  /**
   * Retrieves value with a default fallback
   * @param key - The key to retrieve
   * @param defaultValue - Value to return if key not found
   * @returns Effect resolving to validated value or default
   */
  readonly getOrElse: (key: string, defaultValue: V) => Effect.Effect<V, KVError>;
}

/**
 * Creates a typed KV wrapper with schema validation
 * @param schema - Effect Schema for type V
 * @returns TypedKV instance with validated get/put operations
 * @example
 * ```typescript
 * const UserSchema = Schema.Struct({
 *   id: Schema.Number,
 *   name: Schema.String,
 * });
 *
 * const UserKV = makeTypedKV(UserSchema);
 *
 * // Type-safe operations
 * yield* UserKV.put("user:123", { id: 123, name: "Alice" });
 * const user = yield* UserKV.get("user:123"); // Option<{ id: number, name: string }>
 * ```
 */
export const makeTypedKV = <V>(
  schema: Schema.Schema<V>
): Effect.Effect<TypedKV<V>, never, 'effect-kv/KV'> =>
  Effect.gen(function* () {
    const kv = yield* KV;

    return {
      get: (key: string) =>
        Effect.gen(function* () {
          const maybeValue = yield* kv.getJSON<V>(key);
          if (Option.isNone(maybeValue)) {
            return Option.none<V>();
          }
          const decoded = yield* Schema.decodeUnknown(schema)(maybeValue.value).pipe(
            Effect.map(Option.some),
            Effect.mapError(
              (error) =>
                new KVGetError({
                  key,
                  cause: `Schema validation failed: ${error.message}`,
                })
            )
          );
          return decoded;
        }),

      put: (key: string, value: V, options?: PutOptions) =>
        Effect.gen(function* () {
          const encoded = yield* Schema.encode(schema)(value).pipe(
            Effect.mapError(
              (error) =>
                new KVPutError({
                  key,
                  cause: `Schema encoding failed: ${error.message}`,
                })
            )
          );
          yield* kv.putJSON(key, encoded, {
            ...options,
            metadata: {
              ...options?.metadata,
              _schema: schema.ast.toString(),
            },
          });
        }),

      getOrFail: (key: string) =>
        Effect.gen(function* () {
          const maybeValue = yield* kv.getJSON<V>(key);
          if (Option.isNone(maybeValue)) {
            return yield* Effect.fail(
              new KVGetError({
                key,
                cause: 'Key not found',
              })
            );
          }
          const decoded = yield* Schema.decodeUnknown(schema)(maybeValue.value).pipe(
            Effect.mapError(
              (error) =>
                new KVGetError({
                  key,
                  cause: `Schema validation failed: ${error.message}`,
                })
            )
          );
          return decoded;
        }),

      getOrElse: (key: string, defaultValue: V) =>
        Effect.gen(function* () {
          const encodedDefault = yield* Schema.encode(schema)(defaultValue).pipe(
            Effect.mapError(
              (error) =>
                new KVGetError({
                  key,
                  cause: `Default value encoding failed: ${error.message}`,
                })
            )
          );
          const maybeValue = yield* kv.getJSON<V>(key);
          if (Option.isNone(maybeValue)) {
            return yield* Schema.decodeUnknown(schema)(encodedDefault).pipe(
              Effect.mapError(
                (error) =>
                  new KVGetError({
                    key,
                    cause: `Default value decoding failed: ${error.message}`,
                  })
              )
            );
          }
          const decoded = yield* Schema.decodeUnknown(schema)(maybeValue.value).pipe(
            Effect.mapError(
              (error) =>
                new KVGetError({
                  key,
                  cause: `Schema validation failed: ${error.message}`,
                })
            )
          );
          return decoded;
        }),
    };
  });

/**
 * Schema for KV key metadata
 */
export const KVMetadataSchema = Schema.Struct({
  name: Schema.String,
  expiration: Schema.optional(Schema.Number),
  metadata: Schema.optional(Schema.Unknown),
});

/**
 * Schema for KV list result
 */
export const KVListResultSchema = Schema.Struct({
  keys: Schema.Array(KVMetadataSchema),
  cursor: Schema.optional(Schema.String),
  list_complete: Schema.Boolean,
});
