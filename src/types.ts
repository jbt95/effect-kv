import type { KVNamespace } from '@cloudflare/workers-types';

/**
 * Type representing values that can be stored in KV
 */
export type KVValue = string | ArrayBuffer | ReadableStream;

/**
 * Options for the get operation
 */
export interface GetOptions {
  /**
   * Type of the value to retrieve
   */
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';

  /**
   * Cache TTL in seconds
   */
  cacheTtl?: number;
}

/**
 * Options for the put operation
 */
export interface PutOptions {
  /**
   * Expiration timestamp (seconds since epoch)
   */
  expiration?: number;

  /**
   * Expiration TTL in seconds from now (minimum 60)
   */
  expirationTtl?: number;

  /**
   * Metadata to store with the value (max 1024 bytes serialized)
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options for the list operation
 */
export interface ListOptions {
  /**
   * Prefix to filter keys
   */
  prefix?: string;

  /**
   * Maximum number of keys to return (default 1000, max 1000)
   */
  limit?: number;

  /**
   * Cursor for pagination
   */
  cursor?: string;
}

/**
 * Result of a list operation
 */
export interface ListResult {
  /**
   * Array of key metadata
   */
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: unknown;
  }>;

  /**
   * Cursor for the next page (undefined if no more results)
   */
  cursor?: string;

  /**
   * Total count of keys (if available)
   */
  list_complete: boolean;
}

/**
 * Tag identifier for injecting a KVNamespace binding
 */
export const KVNamespaceTag = Symbol.for('effect-kv/KVNamespace');

/**
 * Context tag type for KVNamespace
 */
export type KVNamespaceTag = typeof KVNamespaceTag;

/**
 * A typed KV namespace reference
 */
export interface TypedKVNamespace {
  readonly namespace: KVNamespace;
}
