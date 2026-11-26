/** Return every path (e.g. "owner.password") at which `key` appears in a JSON value. */
export function findKeyPaths(value: unknown, key: string, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findKeyPaths(item, key, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [
      ...(k === key ? [`${path}.${k}`] : []),
      ...findKeyPaths(v, key, `${path}.${k}`),
    ]);
  }
  return [];
}
