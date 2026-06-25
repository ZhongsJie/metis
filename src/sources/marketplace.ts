import { SourceHandler, AvailableSkill, SkillSource } from './index.js';
import { ensureDir } from '../utils/fs.js';
import { createSymlink } from '../utils/symlink.js';
import { parseSkillFile } from '../utils/skill-parser.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { simpleGit } from 'simple-git';

export const marketplaceHandler: SourceHandler = {
  async listSkills(source: SkillSource, sourcesDir: string): Promise<AvailableSkill[]> {
    const repoPath = resolve(sourcesDir, source.name);
    if (!existsSync(join(repoPath, 'skills'))) {
      return [];
    }
    const skills: AvailableSkill[] = [];
    const skillsDir = join(repoPath, 'skills');
    for (const dir of readdirSync(skillsDir)) {
      const skillMd = join(skillsDir, dir, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, 'utf-8');
      const meta = parseSkillFile(content);
      if (meta) {
        skills.push({
          name: meta.name,
          description: meta.description,
          source: source.name,
          sourceType: 'marketplace',
        });
      }
    }
    return skills;
  },

  async download(source: SkillSource, skillName: string, sourcesDir: string, skillsDir: string): Promise<string> {
    const repoPath = resolve(sourcesDir, source.name);
    // Ensure the repo is cloned
    if (!existsSync(repoPath)) {
      ensureDir(sourcesDir);
      const git = simpleGit();
      await git.clone(source.url, repoPath, ['--depth', '1']);
    }
    // Find the skill in the repo
    const srcSkillsDir = join(repoPath, 'skills');
    if (!existsSync(srcSkillsDir)) {
      throw new Error(`Marketplace '${source.name}' has no skills/ directory`);
    }
    // Find matching skill directory
    let foundDir: string | null = null;
    for (const dir of readdirSync(srcSkillsDir)) {
      const skillMd = join(srcSkillsDir, dir, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const meta = parseSkillFile(readFileSync(skillMd, 'utf-8'));
      if (meta && meta.name === skillName) {
        foundDir = dir;
        break;
      }
    }
    if (!foundDir) {
      throw new Error(`Skill '${skillName}' not found in marketplace '${source.name}'`);
    }
    // Create symlink: skills/<source>/<skillName> -> .sources/<source>/skills/<foundDir>
    const targetDir = resolve(skillsDir, source.name);
    ensureDir(targetDir);
    const linkPath = join(targetDir, skillName);
    const realPath = join(srcSkillsDir, foundDir);
    createSymlink(realPath, linkPath);
    return join(source.name, skillName);
  },

  async update(source: SkillSource, sourcesDir: string): Promise<void> {
    const repoPath = resolve(sourcesDir, source.name);
    if (!existsSync(join(repoPath, '.git'))) {
      throw new Error(`Source '${source.name}' is not a git repository. Run install first.`);
    }
    const git = simpleGit(repoPath);
    await git.pull();
  },
};
