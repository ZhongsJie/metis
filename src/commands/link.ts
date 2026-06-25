import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { createSymlink, removeSymlink, isSymlink } from '../utils/symlink.js';
import { ensureDir, writeJson } from '../utils/fs.js';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { checkboxSelect } from '../utils/interactive.js';

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

function doLink(name: string, projectPath: string, platform: Platform) {
  const registry = new Registry();
  const entry = registry.get(name);
  if (!entry) {
    console.error(chalk.red(`  ✗ '${name}' is not installed.`));
    return;
  }
  const skillsDir = ensureSkillsDir(projectPath, platform);
  const linkPath = join(skillsDir, name);
  if (existsSync(linkPath)) {
    console.log(chalk.yellow(`  ⚠ '${name}' already linked.`));
    return;
  }
  createSymlink(resolve(getSkillsDir(), entry.installPath), linkPath);
  registry.addLinkedProject(name, projectPath);
  console.log(chalk.green(`  ✓ Linked '${name}'`));
}

export function registerLinkCommand(program: Command): void {
  program
    .command('link [name]')
    .description('Link a skill into a project (use -i for interactive selection)')
    .option('-i, --interactive', 'Interactive selection mode')
    .option('-t, --to <path>', 'Target project path (defaults to cwd)')
    .option('-p, --platform <platform>', 'Target platform: claude-code (default) or codex', 'claude-code')
    .action(async (name: string | undefined, opts: { interactive?: boolean; to?: string; platform: string }) => {
      const platform = (opts.platform === 'codex' ? 'codex' : 'claude-code') as Platform;
      const projectPath = resolve(opts.to ?? process.cwd());

      // Interactive mode: show installed skills not yet linked
      if (opts.interactive || !name) {
        const registry = new Registry();
        const linkedHere = new Set<string>();
        for (const s of registry.list()) {
          if (s.linkedProjects.includes(projectPath)) {
            linkedHere.add(s.name);
          }
        }

        const allSkills = registry.list();
        if (allSkills.length === 0) {
          console.log(chalk.dim('No skills installed. Use "skill install <name>" first.'));
          return;
        }

        const options = allSkills.map(s => {
          const isLinked = linkedHere.has(s.name);
          const status = isLinked ? chalk.green(' (linked)') : '';
          return {
            name: `${s.name} ${chalk.dim(`(${s.source})`)}${status}`,
            value: s.name,
            description: s.description,
          };
        });

        const selected = await checkboxSelect(options, 'Select skills to link');

        if (selected.length === 0) {
          console.log(chalk.dim('Cancelled.'));
          return;
        }

        console.log(chalk.dim(`Linking to ${projectPath} (${platform})...`));
        let skipped = 0;
        for (const skillName of selected) {
          if (linkedHere.has(skillName)) {
            skipped++;
            console.log(chalk.dim(`  ⏭ ${skillName} (linked)`));
          } else {
            doLink(skillName, projectPath, platform);
          }
        }
        if (skipped > 0) {
          console.log(chalk.dim(`  Skipped ${skipped} already-linked skill(s).`));
        }
        return;
      }

      // Direct link
      const registry = new Registry();
      const entry = registry.get(name!);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }
      const skillsDir = ensureSkillsDir(projectPath, platform);
      const linkPath = join(skillsDir, name!);
      if (existsSync(linkPath)) {
        console.log(chalk.yellow(`⚠ ${linkPath} already exists.`));
        return;
      }
      createSymlink(resolve(getSkillsDir(), entry.installPath), linkPath);
      registry.addLinkedProject(name!, projectPath);
      console.log(chalk.green(`✓ Linked '${name}' → ${linkPath}`));
      console.log(chalk.dim(`  The skill is now available in this project (${platform}).`));
    });

  program
    .command('unlink [name]')
    .description('Unlink a skill from a project (use -i for interactive selection)')
    .option('-i, --interactive', 'Interactive selection mode')
    .option('-f, --from <path>', 'Target project path (defaults to cwd)')
    .option('-p, --platform <platform>', 'Target platform: claude-code (default) or codex', 'claude-code')
    .action(async (name: string | undefined, opts: { interactive?: boolean; from?: string; platform: string }) => {
      const platform = (opts.platform === 'codex' ? 'codex' : 'claude-code') as Platform;
      const projectPath = resolve(opts.from ?? process.cwd());
      const skillsDir = resolveSkillsDir(projectPath, platform);

      // Interactive mode: show skills linked to this project
      if (opts.interactive || !name) {
        const registry = new Registry();
        const linkedHere = new Set<string>();
        for (const s of registry.list()) {
          if (s.linkedProjects.includes(projectPath) || isSymlink(join(skillsDir, s.name))) {
            linkedHere.add(s.name);
          }
        }

        const allSkills = registry.list();
        if (allSkills.length === 0) {
          console.log(chalk.dim('No skills installed.'));
          return;
        }

        const options = allSkills.map(s => {
          const isLinked = linkedHere.has(s.name);
          const status = isLinked ? '' : chalk.gray(' (not linked)');
          return {
            name: `${s.name} ${chalk.dim(`(${s.source})`)}${status}`,
            value: s.name,
            description: s.description,
          };
        });

        const selected = await checkboxSelect(options, 'Select skills to unlink');

        if (selected.length === 0) {
          console.log(chalk.dim('Cancelled.'));
          return;
        }

        console.log(chalk.dim(`Unlinking from ${projectPath}...`));
        let skipped = 0;
        for (const skillName of selected) {
          if (!linkedHere.has(skillName)) {
            skipped++;
            console.log(chalk.dim(`  ⏭ ${skillName} (not linked)`));
          } else {
            const linkPath = join(skillsDir, skillName);
            if (isSymlink(linkPath)) {
              removeSymlink(linkPath);
              const r = new Registry();
              r.removeLinkedProject(skillName, projectPath);
              console.log(chalk.green(`  ✓ Unlinked '${skillName}'`));
            } else {
              console.log(chalk.yellow(`  ⚠ '${skillName}' symlink not found, registry cleaned.`));
              const r = new Registry();
              r.removeLinkedProject(skillName, projectPath);
            }
          }
        }
        if (skipped > 0) {
          console.log(chalk.dim(`  Skipped ${skipped} not-linked skill(s).`));
        }
        return;
      }

      // Direct unlink
      const linkPath = join(skillsDir, name!);
      if (!isSymlink(linkPath)) {
        console.error(chalk.red(`Error: '${name}' is not linked in ${projectPath} (${platform}).`));
        process.exit(1);
      }
      removeSymlink(linkPath);
      const registry = new Registry();
      registry.removeLinkedProject(name!, projectPath);
      console.log(chalk.green(`✓ Unlinked '${name}' from ${projectPath}`));
    });

  program
    .command('linked [name]')
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
