export type CacheGet<T> = (key: string) => Promise<T | null>;
export type CacheSet<T> = (key: string, value: T) => Promise<void>;

export function memCache<T>() {
  const m = new Map<string, T>();
  return {
    get: async (k: string) => m.get(k) ?? null,
    set: async (k: string, v: T) => { m.set(k, v); }
  } as { get: CacheGet<T>; set: CacheSet<T> };
}