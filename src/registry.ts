import { readJson, writeJson } from './utils/fs.js';
import { resolve } from 'node:path';
import { getDataRoot } from './sources/config.js';

export interface SkillEntry {
  id: string;
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  installPath: string;
  updatedAt: string;
  linkedProjects: string[];
}

interface RegistryData {
  version: 1;
  skills: Record<string, SkillEntry>;
}

export class Registry {
  private file: string;
  private data: RegistryData;

  constructor(file?: string) {
    this.file = file ?? resolve(getDataRoot(), 'registry.json');
    this.data = readJson<RegistryData>(this.file, { version: 1, skills: {} });
  }

  get(ref: string): SkillEntry | undefined {
    if (this.data.skills[ref]) return this.data.skills[ref];
    const matches = this.findByName(ref);
    return matches.length === 1 ? matches[0] : undefined;
  }

  getExact(id: string): SkillEntry | undefined {
    return this.data.skills[id];
  }

  findByName(name: string): SkillEntry[] {
    return this.list().filter(skill => skill.name === name);
  }

  listBySource(source: string): SkillEntry[] {
    return this.list().filter(skill => skill.source === source);
  }

  list(): SkillEntry[] {
    return Object.values(this.data.skills);
  }

  renameSource(oldName: string, newName: string): SkillEntry[] {
    const renamed: SkillEntry[] = [];
    for (const entry of this.listBySource(oldName)) {
      delete this.data.skills[entry.id];
      const next: SkillEntry = {
        ...entry,
        id: `${newName}/${entry.name}`,
        source: newName,
        installPath: entry.installPath === oldName
          ? newName
          : entry.installPath.replace(`${oldName}/`, `${newName}/`),
        updatedAt: new Date().toISOString(),
      };
      this.data.skills[next.id] = next;
      renamed.push(next);
    }
    this.save();
    return renamed;
  }

  add(entry: SkillEntry): void {
    this.data.skills[entry.id] = entry;
    this.save();
  }

  remove(ref: string): boolean {
    const entry = this.get(ref);
    if (!entry) return false;
    delete this.data.skills[entry.id];
    this.save();
    return true;
  }

  addLinkedProject(ref: string, projectPath: string): void {
    const entry = this.get(ref);
    if (!entry) return;
    if (!entry.linkedProjects.includes(projectPath)) {
      entry.linkedProjects.push(projectPath);
      this.save();
    }
  }

  removeLinkedProject(ref: string, projectPath: string): void {
    const entry = this.get(ref);
    if (!entry) return;
    entry.linkedProjects = entry.linkedProjects.filter(p => p !== projectPath);
    this.save();
  }

  private save(): void {
    writeJson(this.file, this.data);
  }
}
