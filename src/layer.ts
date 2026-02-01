import { Context, Effect, Layer, Option, pipe } from 'effect';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  KVDeleteError,
  KVGetError,
  KeyNotFoundError,
  KVListError,
  KVPutError,
  type KVError,
} from './errors.js';
import { KV, type KVService } from './KV.js';
import type { GetOptions, ListOptions, ListResult, PutOptions } from './types.js';

/**
 * Context tag for the raw KVNamespace binding
 */
export class KVNamespaceBinding extends Context.Tag('effect-kv/KVNamespaceBinding')<
  KVNamespaceBinding,
  KVNamespace
>() {}

/**
 * Helper to get a value from KV namespace with error handling
 */
const getFromNamespace = (
  namespace: KVNamespace,
  key: string,
  options?: GetOptions
): Effect.Effect<string | null, KVGetError> =>
  Effect.tryPromise({
    try: () => {
      const type = options?.type ?? 'text';
      if (type === 'text') {
        return namespace.get(key, { type: 'text', cacheTtl: options?.cacheTtl });
      }
      // For other types, return as text and let the caller handle conversion
      return namespace.get(key, { type: 'text', cacheTtl: options?.cacheTtl });
    },
    catch: (cause) => new KVGetError({ key, cause }),
  });

/**
 * Helper to get JSON from KV namespace
 */
const getJSONFromNamespace = <T>(
  namespace: KVNamespace,
  key: string,
  options?: Omit<GetOptions, 'type'>
): Effect.Effect<T | null, KVGetError> =>
  Effect.tryPromise({
    try: () =>
      namespace.get(key, {
        type: 'json',
        cacheTtl: options?.cacheTtl,
      }) as Promise<T | null>,
    catch: (cause) => new KVGetError({ key, cause }),
  });

/**
 * Helper to get ArrayBuffer from KV namespace
 */
const getArrayBufferFromNamespace = (
  namespace: KVNamespace,
  key: string,
  options?: Omit<GetOptions, 'type'>
): Effect.Effect<ArrayBuffer | null, KVGetError> =>
  Effect.tryPromise({
    try: () =>
      namespace.get(key, {
        type: 'arrayBuffer',
        cacheTtl: options?.cacheTtl,
      }),
    catch: (cause) => new KVGetError({ key, cause }),
  });

/**
 * Helper to get stream from KV namespace
 */
const getStreamFromNamespace = (
  namespace: KVNamespace,
  key: string,
  options?: Omit<GetOptions, 'type'>
): Effect.Effect<ReadableStream | null, KVGetError> =>
  Effect.tryPromise({
    try: () =>
      namespace.get(key, {
        type: 'stream',
        cacheTtl: options?.cacheTtl,
      }),
    catch: (cause) => new KVGetError({ key, cause }),
  });

/**
 * Helper to put a value to KV namespace
 */
const putToNamespace = (
  namespace: KVNamespace,
  key: string,
  value: string | ArrayBuffer | ReadableStream,
  options?: PutOptions
): Effect.Effect<void, KVPutError> =>
  Effect.tryPromise({
    try: () =>
      namespace.put(key, value, {
        expiration: options?.expiration,
        expirationTtl: options?.expirationTtl,
        metadata: options?.metadata,
      }),
    catch: (cause) => new KVPutError({ key, cause }),
  });

/**
 * Helper to delete from KV namespace
 */
const deleteFromNamespace = (
  namespace: KVNamespace,
  key: string
): Effect.Effect<void, KVDeleteError> =>
  Effect.tryPromise({
    try: () => namespace.delete(key),
    catch: (cause) => new KVDeleteError({ key, cause }),
  });

/**
 * Helper to list keys from KV namespace
 */
const listFromNamespace = (
  namespace: KVNamespace,
  options?: ListOptions
): Effect.Effect<ListResult, KVListError> =>
  Effect.tryPromise({
    try: async () => {
      const result = await namespace.list({
        prefix: options?.prefix,
        limit: options?.limit,
        cursor: options?.cursor,
      });
      return result as ListResult;
    },
    catch: (cause) => new KVListError({ cause }),
  });

/**
 * Implementation of KVService interface
 */
const makeKVService = (namespace: KVNamespace): KVService => ({
  get: (key, options) =>
    pipe(getFromNamespace(namespace, key, options), Effect.map(Option.fromNullable)),

  getJSON: <T>(key: string, options?: Omit<GetOptions, 'type'>) =>
    pipe(getJSONFromNamespace<T>(namespace, key, options), Effect.map(Option.fromNullable)),

  getArrayBuffer: (key, options) =>
    pipe(getArrayBufferFromNamespace(namespace, key, options), Effect.map(Option.fromNullable)),

  getStream: (key, options) =>
    pipe(getStreamFromNamespace(namespace, key, options), Effect.map(Option.fromNullable)),

  put: (key, value, options) => putToNamespace(namespace, key, value, options),

  putJSON: <T>(key: string, value: T, options?: PutOptions) =>
    pipe(
      Effect.try(() => JSON.stringify(value)),
      Effect.mapError((cause) => new KVPutError({ key, cause })),
      Effect.flatMap((json) => putToNamespace(namespace, key, json, options))
    ),

  delete: (key) => deleteFromNamespace(namespace, key),

  list: (options) => listFromNamespace(namespace, options),

  getOrFail: (key, options) =>
    pipe(
      getFromNamespace(namespace, key, options),
      Effect.flatMap((value) =>
        value === null
          ? Effect.fail(new KeyNotFoundError({ key }) as KVError)
          : Effect.succeed(value)
      )
    ) as Effect.Effect<string, KVError>,

  getOrElse: (key, defaultValue, options) =>
    pipe(
      getFromNamespace(namespace, key, options),
      Effect.map((value) => (value === null ? defaultValue : value))
    ),
});

/**
 * Live Layer implementation using a real KVNamespace
 * Expects KVNamespaceBinding to be provided in context
 */
export const KVLive = Layer.effect(
  KV,
  Effect.gen(function* () {
    const namespace = yield* KVNamespaceBinding;
    return makeKVService(namespace);
  })
);

/**
 * Creates a Layer from a direct KVNamespace binding
 * Use this when you have a direct reference to a KVNamespace (e.g., from env)
 * @param namespace - The KVNamespace to wrap
 */
export const layerFromNamespace = (namespace: KVNamespace) =>
  Layer.succeed(KV, makeKVService(namespace));

/**
 * Test Layer that uses a mock KVNamespace
 * Useful for testing without actual Cloudflare bindings
 */
export const KVTest = (mockNamespace: KVNamespace) =>
  Layer.succeed(KV, makeKVService(mockNamespace));
