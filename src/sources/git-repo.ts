import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { simpleGit } from 'simple-git';
import { Registry, SkillEntry } from '../registry.js';
import { parseSkillFile } from '../utils/skill-parser.js';
import { ensureDir } from '../utils/fs.js';
import { SkillSource, AvailableSkill } from './index.js';

export type CloneProgress = (line: string) => void;

export function inferSourceName(url: string): string {
  const trimmed = url.replace(/\/$/, '');
  const last = basename(trimmed);
  return last.endsWith('.git') ? last.slice(0, -4) : last;
}

export function getSourceRepoPath(skillsDir: string, sourceName: string): string {
  return resolve(skillsDir, sourceName);
}

export function parseGitProgressLines(chunk: string): string[] {
  return chunk
    .split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(Boolean);
}

export async function cloneSource(source: SkillSource, skillsDir: string, onProgress?: CloneProgress): Promise<void> {
  const repoPath = getSourceRepoPath(skillsDir, source.name);
  if (existsSync(repoPath)) {
    throw new Error(`Source '${source.name}' already exists at ${repoPath}`);
  }
  ensureDir(skillsDir);
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn('git', ['clone', '--depth', '1', '--progress', source.url, repoPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output: string[] = [];

    const handleOutput = (data: Buffer) => {
      for (const line of parseGitProgressLines(data.toString())) {
        output.push(line);
        onProgress?.(line);
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);
    child.on('error', err => {
      reject(err);
    });
    child.on('close', code => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rmSync(repoPath, { recursive: true, force: true });
      const summary = output.slice(-5).join('\n');
      reject(new Error(summary || `git clone exited with code ${code}`));
    });
  });
}

export async function ensureSourceRepo(source: SkillSource, skillsDir: string, onProgress?: CloneProgress): Promise<'cloned' | 'existing'> {
  const repoPath = getSourceRepoPath(skillsDir, source.name);
  if (existsSync(join(repoPath, '.git'))) {
    return 'existing';
  }
  await cloneSource(source, skillsDir, onProgress);
  return 'cloned';
}

export async function updateSource(source: SkillSource, skillsDir: string): Promise<void> {
  const repoPath = getSourceRepoPath(skillsDir, source.name);
  if (!existsSync(join(repoPath, '.git'))) {
    throw new Error(`Source '${source.name}' is configured but not cloned at ${repoPath}. Run 'metis source add ${source.url}' to clone it.`);
  }
  await simpleGit(repoPath).pull();
}

export function scanSourceSkills(source: SkillSource, skillsDir: string): AvailableSkill[] {
  const repoPath = getSourceRepoPath(skillsDir, source.name);
  const candidates: string[] = [];
  const rootSkill = join(repoPath, 'SKILL.md');
  if (existsSync(rootSkill)) {
    candidates.push('.');
  }

  const nestedSkillsDir = join(repoPath, 'skills');
  if (existsSync(nestedSkillsDir)) {
    for (const dir of readdirSync(nestedSkillsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      if (existsSync(join(nestedSkillsDir, dir.name, 'SKILL.md'))) {
        candidates.push(join('skills', dir.name));
      }
    }
  }

  // Claude Code plugin layout: .claude/skills/*/SKILL.md
  const claudeSkillsDir = join(repoPath, '.claude', 'skills');
  if (existsSync(claudeSkillsDir)) {
    for (const dir of readdirSync(claudeSkillsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      if (existsSync(join(claudeSkillsDir, dir.name, 'SKILL.md'))) {
        candidates.push(join('.claude', 'skills', dir.name));
      }
    }
  }

  const seen = new Set<string>();
  const skills: AvailableSkill[] = [];
  for (const skillRelPath of candidates) {
    const skillMd = join(repoPath, skillRelPath, 'SKILL.md');
    const meta = parseSkillFile(readFileSync(skillMd, 'utf-8'));
    if (!meta) continue;
    if (seen.has(meta.name)) {
      console.log(`Warning: duplicate skill '${meta.name}' in source '${source.name}' skipped.`);
      continue;
    }
    seen.add(meta.name);
    skills.push({
      id: `${source.name}/${meta.name}`,
      name: meta.name,
      description: meta.description,
      source: source.name,
      installPath: skillRelPath === '.' ? source.name : join(source.name, skillRelPath),
    });
  }

  return skills;
}

export function syncSourceRegistry(source: SkillSource, registry: Registry, skillsDir: string): SkillEntry[] {
  const scanned = scanSourceSkills(source, skillsDir);
  const now = new Date().toISOString();
  const nextIds = new Set(scanned.map(skill => skill.id));
  const entries: SkillEntry[] = [];

  for (const skill of scanned) {
    const existing = registry.getExact(skill.id);
    const entry: SkillEntry = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      source: source.name,
      sourceUrl: source.url,
      installPath: skill.installPath,
      updatedAt: now,
      linkedProjects: existing?.linkedProjects ?? [],
    };
    registry.add(entry);
    entries.push(entry);
  }

  for (const entry of registry.listBySource(source.name)) {
    if (!nextIds.has(entry.id) && entry.linkedProjects.length === 0) {
      registry.remove(entry.id);
    }
  }

  return entries;
}
