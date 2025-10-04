export type IoRules = {
  allow?: string[];
  deny?: string[];
};

export type IoResolved = {
  allow: string[];
  deny: string[];
  conflicts: string[]; // пересечения allow ∩ deny
};

export function resolveIo(base?: IoRules, override?: IoRules): IoResolved {
  const a = new Set<string>([...(base?.allow ?? []), ...(override?.allow ?? [])]);
  const d = new Set<string>([...(base?.deny ?? []), ...(override?.deny ?? [])]);

  const conflicts: string[] = [];
  for (const pat of a) if (d.has(pat)) conflicts.push(pat);

  return { allow: [...a], deny: [...d], conflicts };
}

export function hasIoConflicts(io?: IoResolved): boolean {
  return !!io?.conflicts?.length;
}