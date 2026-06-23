import { get, set, del } from "idb-keyval";

const key = (id: string) => `tab-bytes:${id}`;

export async function getCachedTab(id: string): Promise<Uint8Array | null> {
  try {
    const v = await get(key(id));
    return v instanceof Uint8Array ? v : null;
  } catch {
    return null;
  }
}

export async function setCachedTab(id: string, bytes: Uint8Array) {
  try {
    await set(key(id), bytes);
  } catch {
    /* quota / private mode — ignore */
  }
}

export async function clearCachedTab(id: string) {
  try {
    await del(key(id));
  } catch {
    /* noop */
  }
}
