import { readJson, writeJson } from '../utils/fs.js';
import { resolve } from 'node:path';
import { SkillSource } from './index.js';

interface SourcesData {
  version: 1;
  sources: Record<string, SkillSource>;
}

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const SOURCES_FILE = resolve(PROJECT_ROOT, 'sources.json');

export function loadSources(): Record<string, SkillSource> {
  const data = readJson<SourcesData>(SOURCES_FILE, { version: 1, sources: {} });
  return data.sources;
}

export function saveSources(sources: Record<string, SkillSource>): void {
  writeJson(SOURCES_FILE, { version: 1, sources });
}

export function addSource(sources: Record<string, SkillSource>, source: SkillSource): void {
  sources[source.name] = source;
  saveSources(sources);
}

export function removeSource(sources: Record<string, SkillSource>, name: string): boolean {
  if (!sources[name]) return false;
  delete sources[name];
  saveSources(sources);
  return true;
}

export function getSourcesDir(): string {
  return resolve(PROJECT_ROOT, '.sources');
}

export function getSkillsDir(): string {
  return resolve(PROJECT_ROOT, 'skills');
}
