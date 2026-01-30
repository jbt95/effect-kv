import { Schema } from 'effect';

/**
 * Error raised when a KV get operation fails
 */
export class KVGetError extends Schema.TaggedError<KVGetError>('KVGetError')('KVGetError', {
  key: Schema.String,
  cause: Schema.optionalWith(Schema.Unknown, { default: () => undefined }),
}) {
  override get message(): string {
    return `Failed to get value for key "${this.key}": ${this.cause}`;
  }
}

/**
 * Error raised when a KV put operation fails
 */
export class KVPutError extends Schema.TaggedError<KVPutError>('KVPutError')('KVPutError', {
  key: Schema.String,
  cause: Schema.optionalWith(Schema.Unknown, { default: () => undefined }),
}) {
  override get message(): string {
    return `Failed to put value for key "${this.key}": ${this.cause}`;
  }
}

/**
 * Error raised when a KV delete operation fails
 */
export class KVDeleteError extends Schema.TaggedError<KVDeleteError>('KVDeleteError')(
  'KVDeleteError',
  {
    key: Schema.String,
    cause: Schema.optionalWith(Schema.Unknown, { default: () => undefined }),
  }
) {
  override get message(): string {
    return `Failed to delete key "${this.key}": ${this.cause}`;
  }
}

/**
 * Error raised when a KV list operation fails
 */
export class KVListError extends Schema.TaggedError<KVListError>('KVListError')('KVListError', {
  cause: Schema.optionalWith(Schema.Unknown, { default: () => undefined }),
}) {
  override get message(): string {
    return `Failed to list keys: ${this.cause}`;
  }
}

/**
 * Union of all KV-related errors
 */
export type KVError = KVGetError | KVPutError | KVDeleteError | KVListError | KeyNotFoundError;

/**
 * Error raised when a key is not found and strict retrieval is requested
 */
export class KeyNotFoundError extends Schema.TaggedError<KeyNotFoundError>('KeyNotFoundError')(
  'KeyNotFoundError',
  {
    key: Schema.String,
  }
) {
  override get message(): string {
    return `Key "${this.key}" not found`;
  }
}
