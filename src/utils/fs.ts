import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function readJson<T>(filepath: string, fallback: T): T {
  try {
    const raw = readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(filepath: string, data: unknown): void {
  ensureDir(dirname(filepath));
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function resolvePath(base: string, ...segments: string[]): string {
  return resolve(base, ...segments);
}
