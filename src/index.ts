/**
 * Effect-KV - A lightweight, type-safe wrapper around Cloudflare KV using Effect.ts
 *
 * @module effect-kv
 * @description
 * This library provides a functional programming interface to Cloudflare KV with:
 * - Full type safety via TypeScript and Effect Schema
 * - Structured error handling with tagged errors
 * - Composable effects for building complex workflows
 * - Schema validation for runtime type checking
 *
 * @example
 * ```typescript
 * import { Effect, Schema } from 'effect'
 * import { KV, KVTest, layerFromNamespace } from 'effect-kv'
 *
 * // Basic string-based KV operations
 * const basicProgram = Effect.gen(function* () {
 *   const kv = yield* KV
 *
 *   // Store a string value
 *   yield* kv.put('key', 'value', { expirationTtl: 3600 })
 *
 *   // Retrieve a value
 *   const value = yield* kv.get('key') // Option<string>
 *
 *   return value
 * })
 *
 * // Schema-validated JSON operations
 * const UserSchema = Schema.Struct({
 *   id: Schema.Number,
 *   name: Schema.String,
 *   email: Schema.String,
 * })
 *
 * const typedProgram = Effect.gen(function* () {
 *   const userKV = yield* KV(UserSchema)
 *
 *   // Store validated user data
 *   yield* userKV.put('user:123', { id: 123, name: 'Alice', email: 'alice@example.com' })
 *
 *   // Retrieve validated user
 *   const user = yield* userKV.get('user:123') // Option<{ id: number, name: string, email: string }>
 *
 *   return user
 * })
 *
 * // Provide the layer and run
 * const result = await Effect.runPromise(
 *   typedProgram.pipe(Effect.provide(layerFromNamespace(env.KV_NAMESPACE)))
 * )
 * ```
 */

// Core service and types
export { KV, type KVService } from './KV.js';
export {
  type GetOptions,
  type KVValue,
  type ListOptions,
  type ListResult,
  type PutOptions,
  KVNamespaceTag,
  type TypedKVNamespace,
} from './types.js';

// Error types
export {
  KVDeleteError,
  KVGetError,
  KVListError,
  KVPutError,
  KeyNotFoundError,
  type KVError,
} from './errors.js';

// Layer implementations
export { KVLive, KVNamespaceBinding, KVTest, layerFromNamespace } from './layer.js';

// Schema validation
export { makeTypedKV, KVListResultSchema, KVMetadataSchema, type TypedKV } from './schema.js';
