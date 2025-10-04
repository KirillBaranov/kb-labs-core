type Json = any;

export function mergeProfiles(chain: Json[]): Json {
  let acc: Json = {};
  for (const next of chain) {
    acc = deepMerge(acc, next);
  }
  return acc;
}

function deepMerge(a: Json, b: Json): Json {
  if (Array.isArray(a) && Array.isArray(b)) {
    return dedupeById([...a, ...b]);
  }
  if (isObj(a) && isObj(b)) {
    const out: Record<string, any> = { ...a };
    for (const k of Object.keys(b)) {
      out[k] = k in out ? deepMerge(out[k], b[k]) : b[k];
    }
    return out;
  }
  // примитивы и разные типы — берём правый (последний выигрывает)
  return clone(b);
}

function isObj(x: unknown): x is Record<string, any> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function clone<T>(x: T): T {
  return isObj(x) || Array.isArray(x) ? JSON.parse(JSON.stringify(x)) : x;
}

function dedupeById(arr: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of arr) {
    const id = isObj(it) && typeof it.id === 'string' ? it.id : undefined;
    if (!id) { out.push(it); continue; }
    if (!seen.has(id)) { seen.add(id); out.push(it); }
  }
  return out;
}