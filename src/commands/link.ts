import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { createSymlink, removeSymlink, isSymlink } from '../utils/symlink.js';
import { ensureDir, writeJson } from '../utils/fs.js';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

type Platform = 'claude-code' | 'codex';

const PLATFORM_DIRS: Record<Platform, string> = {
  'claude-code': '.claude',
  'codex': '.codex',
};

function resolveSkillsDir(projectPath: string, platform: Platform): string {
  return join(projectPath, PLATFORM_DIRS[platform], 'skills');
}

function ensureSkillsDir(projectPath: string, platform: Platform): string {
  const dir = resolveSkillsDir(projectPath, platform);
  if (!existsSync(dir)) {
    ensureDir(dir);
    writeJson(join(dir, '..', 'skills.json'), { skills: [] });
    console.log(chalk.dim(`  Created ${dir}`));
  }
  return dir;
}

export function registerLinkCommand(program: Command): void {
  program
    .command('link <name>')
    .alias('ln')
    .description('Link a skill into a project')
    .option('--to <path>', 'Target project path (defaults to cwd)')
    .option('--platform <platform>', 'Target platform: claude-code (default) or codex', 'claude-code')
    .action(async (name: string, opts: { to?: string; platform: string }) => {
      const platform = (opts.platform === 'codex' ? 'codex' : 'claude-code') as Platform;
      const registry = new Registry();
      const entry = registry.get(name);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }

      const projectPath = resolve(opts.to ?? process.cwd());
      const skillsDir = ensureSkillsDir(projectPath, platform);
      const skillSourceDir = resolve(getSkillsDir(), entry.installPath);
      const linkPath = join(skillsDir, name);

      if (existsSync(linkPath)) {
        console.log(chalk.yellow(`⚠ ${linkPath} already exists.`));
        return;
      }

      createSymlink(skillSourceDir, linkPath);
      registry.addLinkedProject(name, projectPath);
      console.log(chalk.green(`✓ Linked '${name}' → ${linkPath}`));
      console.log(chalk.dim(`  The skill is now available in this project (${platform}).`));
    });

  program
    .command('unlink <name>')
    .alias('ul')
    .description('Unlink a skill from a project')
    .option('--from <path>', 'Target project path (defaults to cwd)')
    .option('--platform <platform>', 'Target platform: claude-code (default) or codex', 'claude-code')
    .action(async (name: string, opts: { from?: string; platform: string }) => {
      const platform = (opts.platform === 'codex' ? 'codex' : 'claude-code') as Platform;
      const registry = new Registry();
      const projectPath = resolve(opts.from ?? process.cwd());
      const linkPath = join(resolveSkillsDir(projectPath, platform), name);

      if (!isSymlink(linkPath)) {
        console.error(chalk.red(`Error: '${name}' is not linked in ${projectPath} (${platform}).`));
        process.exit(1);
      }

      removeSymlink(linkPath);
      registry.removeLinkedProject(name, projectPath);
      console.log(chalk.green(`✓ Unlinked '${name}' from ${projectPath}`));
    });

  program
    .command('linked [name]')
    .alias('lk')
    .description('Show which projects are linked to a skill, or all links')
    .action(async (name?: string) => {
      const registry = new Registry();

      if (name) {
        const entry = registry.get(name);
        if (!entry) {
          console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
          process.exit(1);
        }
        if (entry.linkedProjects.length === 0) {
          console.log(chalk.dim(`'${name}' is not linked to any project.`));
        } else {
          for (const p of entry.linkedProjects) {
            console.log(`  ${chalk.bold(name)} → ${p}`);
          }
        }
        return;
      }

      const skills = registry.list();
      let hasLinks = false;
      for (const s of skills) {
        if (s.linkedProjects.length > 0) {
          hasLinks = true;
          for (const p of s.linkedProjects) {
            console.log(`  ${chalk.bold(s.name)} → ${p}`);
          }
        }
      }
      if (!hasLinks) {
        console.log(chalk.dim('No skills are linked to any project.'));
      }
    });
}
