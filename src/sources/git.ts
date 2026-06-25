import { SourceHandler, AvailableSkill, SkillSource } from './index.js';
import { ensureDir } from '../utils/fs.js';
import { parseSkillFile } from '../utils/skill-parser.js';
import { existsSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { simpleGit } from 'simple-git';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export const gitHandler: SourceHandler = {
  async listSkills(_source: SkillSource, _sourcesDir: string): Promise<AvailableSkill[]> {
    // For git sources, discovery requires cloning — done during install
    return [];
  },

  async download(source: SkillSource, skillName: string, _sourcesDir: string, skillsDir: string): Promise<string> {
    const destDir = resolve(skillsDir, skillName);
    if (existsSync(destDir)) {
      throw new Error(`Skill '${skillName}' is already installed. Use --force to overwrite.`);
    }
    // Clone to temp directory first
    const tempDir = join(tmpdir(), `skill-clone-${randomUUID()}`);
    try {
      const git = simpleGit();
      await git.clone(source.url, tempDir, ['--depth', '1']);
      // Verify it has a SKILL.md
      const skillMd = join(tempDir, 'SKILL.md');
      if (!existsSync(skillMd)) {
        throw new Error(`Repository does not contain SKILL.md at root.`);
      }
      const meta = parseSkillFile(readFileSync(skillMd, 'utf-8'));
      if (!meta) {
        throw new Error(`SKILL.md has invalid frontmatter.`);
      }
      // Copy to skills dir
      ensureDir(skillsDir);
      cpSync(tempDir, destDir, { recursive: true });
      return skillName;
    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    }
  },

  async update(source: SkillSource, _sourcesDir: string, skillsDir?: string): Promise<void> {
    const destDir = resolve(skillsDir ?? '', source.name);
    if (!existsSync(join(destDir, '.git'))) {
      throw new Error(`Skill '${source.name}' is not a git repository.`);
    }
    const git = simpleGit(destDir);
    await git.pull();
  },
};
