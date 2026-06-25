import { readJson, writeJson } from '../utils/fs.js';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { SkillSource } from './index.js';

interface SourcesData {
  version: 1;
  sources: Record<string, SkillSource>;
}

const DATA_ROOT = resolve(homedir(), '.metis');
const SOURCES_FILE = resolve(DATA_ROOT, 'sources.json');

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

export function getSkillsDir(): string {
  return resolve(DATA_ROOT, 'skills');
}

export function getDataRoot(): string {
  return DATA_ROOT;
}
