import { symlinkSync, unlinkSync, existsSync, lstatSync, readlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { ensureDir } from './fs.js';

/** Create a symlink at `linkPath` pointing to `target`. Always uses absolute paths. */
export function createSymlink(target: string, linkPath: string): void {
  const absTarget = resolve(target);
  ensureDir(dirname(linkPath));
  if (existsSync(linkPath)) {
    unlinkSync(linkPath);
  }
  symlinkSync(absTarget, linkPath, 'dir');
}

/** Remove a symlink. Returns true if removed, false if it wasn't a symlink. */
export function removeSymlink(linkPath: string): boolean {
  if (!existsSync(linkPath)) return false;
  const stat = lstatSync(linkPath);
  if (!stat.isSymbolicLink()) return false;
  unlinkSync(linkPath);
  return true;
}

/** Check if a path is a symlink and return its target, or null. */
export function readSymlinkTarget(linkPath: string): string | null {
  if (!existsSync(linkPath)) return null;
  const stat = lstatSync(linkPath);
  if (!stat.isSymbolicLink()) return null;
  return readlinkSync(linkPath);
}

/** Check if a path exists AND is a symlink. */
export function isSymlink(linkPath: string): boolean {
  if (!existsSync(linkPath)) return false;
  return lstatSync(linkPath).isSymbolicLink();
}
