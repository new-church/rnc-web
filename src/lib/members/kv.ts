import { createItemsStoreFromEnv, type ItemsStore } from '../items-table';
import { isLive } from '../signup';
import { memoryKv } from './memory-kv';

/** The part of the items store this feature uses (lets tests pass an in-memory store). */
export type Kv = Pick<ItemsStore, 'get' | 'put' | 'delete' | 'query' | 'incr'>;

let dev: Kv | undefined;

/**
 * The store for member self-service. Live environments use the real items table; anywhere else an in-memory store is
 * used (it forgets on restart), so a local run never writes working rows to the production database.
 */
export function memberKv(): Kv {
  if (isLive()) return createItemsStoreFromEnv();
  return (dev ??= memoryKv());
}
