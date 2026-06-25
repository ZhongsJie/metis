import { readJson, writeJson } from './utils/fs.js';
import { resolve } from 'node:path';

export interface SkillEntry {
  name: string;
  description: string;
  source: string;
  sourceType: 'marketplace' | 'git';
  sourceUrl?: string;
  sourceRef?: string;
  installPath: string;
  version: string;
  installedAt: string;
  updatedAt: string;
  linkedProjects: string[];
}

interface RegistryData {
  version: 1;
  skills: Record<string, SkillEntry>;
}

const SKILLS_DIR = resolve(import.meta.dirname, '..', 'skills');

export class Registry {
  private file: string;
  private data: RegistryData;

  constructor(file?: string) {
    this.file = file ?? resolve(SKILLS_DIR, '.registry.json');
    this.data = readJson<RegistryData>(this.file, { version: 1, skills: {} });
  }

  get(name: string): SkillEntry | undefined {
    return this.data.skills[name];
  }

  list(): SkillEntry[] {
    return Object.values(this.data.skills);
  }

  add(entry: SkillEntry): void {
    this.data.skills[entry.name] = entry;
    this.save();
  }

  remove(name: string): boolean {
    if (!this.data.skills[name]) return false;
    delete this.data.skills[name];
    this.save();
    return true;
  }

  addLinkedProject(name: string, projectPath: string): void {
    const entry = this.data.skills[name];
    if (!entry) return;
    if (!entry.linkedProjects.includes(projectPath)) {
      entry.linkedProjects.push(projectPath);
      this.save();
    }
  }

  removeLinkedProject(name: string, projectPath: string): void {
    const entry = this.data.skills[name];
    if (!entry) return;
    entry.linkedProjects = entry.linkedProjects.filter(p => p !== projectPath);
    this.save();
  }

  private save(): void {
    writeJson(this.file, this.data);
  }
}
