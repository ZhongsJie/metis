import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { createSymlink, removeSymlink, isSymlink } from '../utils/symlink.js';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { filteredCheckboxSelect } from '../utils/interactive.js';

type Platform = 'claude-code' | 'codex';

const PLATFORM_DIRS: Record<Platform, string> = {
  'claude-code': '.claude',
  'codex': '.codex',
};

function resolveSkillsDir(projectPath: string, platform: Platform): string {
  return join(projectPath, PLATFORM_DIRS[platform], 'skills');
}

function getInitializedSkillsDir(projectPath: string, platform: Platform): string | null {
  const dir = resolveSkillsDir(projectPath, platform);
  return existsSync(dir) ? dir : null;
}

function printInitRequired(projectPath: string, platform: Platform): void {
  console.error(chalk.red(`Error: Project is not initialized for ${platform}.`));
  console.error(chalk.dim(`  Run: metis init ${projectPath} -p ${platform}`));
}

function doLink(name: string, projectPath: string, platform: Platform) {
  const registry = new Registry();
  const entry = registry.get(name);
  if (!entry) {
    const matches = registry.findByName(name);
    if (matches.length > 1) {
      console.error(chalk.red(`  ✗ '${name}' exists in multiple sources.`));
      for (const match of matches) {
        console.error(chalk.dim(`    Use: metis link ${match.id} -t ${projectPath} -p ${platform}`));
      }
    } else {
      console.error(chalk.red(`  ✗ '${name}' not found.`));
    }
    return;
  }
  const skillsDir = getInitializedSkillsDir(projectPath, platform);
  if (!skillsDir) {
    printInitRequired(projectPath, platform);
    return;
  }
  const linkPath = join(skillsDir, entry.name);
  if (existsSync(linkPath)) {
    console.log(chalk.yellow(`  ⚠ '${entry.name}' already linked.`));
    return;
  }
  createSymlink(resolve(getSkillsDir(), entry.installPath), linkPath);
  registry.addLinkedProject(entry.id, projectPath);
  console.log(chalk.green(`  ✓ Linked '${entry.id}'`));
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
            linkedHere.add(s.id);
          }
        }

        const allSkills = registry.list();
        if (allSkills.length === 0) {
          console.log(chalk.dim('No skills found. Use "metis source add <git-url>" first.'));
          return;
        }

        const options = allSkills.map(s => {
          const isLinked = linkedHere.has(s.id);
          const status = isLinked ? chalk.green(' (linked)') : '';
          return {
            name: `${s.name} ${chalk.dim(`(${s.id})`)}${status}`,
            value: s.id,
            description: s.description,
          };
        });

        const selected = await filteredCheckboxSelect(options, 'Select skills to link');

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
        const matches = registry.findByName(name!);
        if (matches.length > 1) {
          console.error(chalk.red(`Error: Skill '${name}' exists in multiple sources.`));
          for (const match of matches) {
            console.error(chalk.dim(`  Use: metis link ${match.id} -t ${projectPath} -p ${platform}`));
          }
        } else {
          console.error(chalk.red(`Error: Skill '${name}' not found.`));
        }
        process.exit(1);
      }
      const skillsDir = getInitializedSkillsDir(projectPath, platform);
      if (!skillsDir) {
        printInitRequired(projectPath, platform);
        process.exit(1);
      }
      const linkPath = join(skillsDir, entry.name);
      if (existsSync(linkPath)) {
        console.log(chalk.yellow(`⚠ ${linkPath} already exists.`));
        return;
      }
      createSymlink(resolve(getSkillsDir(), entry.installPath), linkPath);
      registry.addLinkedProject(entry.id, projectPath);
      console.log(chalk.green(`✓ Linked '${entry.id}' → ${linkPath}`));
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
            linkedHere.add(s.id);
          }
        }

        const allSkills = registry.list();
        if (allSkills.length === 0) {
        console.log(chalk.dim('No skills found.'));
          return;
        }

        const options = allSkills.map(s => {
          const isLinked = linkedHere.has(s.id);
          const status = isLinked ? '' : chalk.gray(' (not linked)');
          return {
            name: `${s.name} ${chalk.dim(`(${s.id})`)}${status}`,
            value: s.id,
            description: s.description,
          };
        });

        const selected = await filteredCheckboxSelect(options, 'Select skills to unlink');

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
            const entry = new Registry().get(skillName);
            const linkPath = join(skillsDir, entry?.name ?? skillName);
            if (isSymlink(linkPath)) {
              removeSymlink(linkPath);
              const r = new Registry();
              r.removeLinkedProject(entry?.id ?? skillName, projectPath);
              console.log(chalk.green(`  ✓ Unlinked '${skillName}'`));
            } else {
              console.log(chalk.yellow(`  ⚠ '${skillName}' symlink not found, registry cleaned.`));
              const r = new Registry();
              r.removeLinkedProject(entry?.id ?? skillName, projectPath);
            }
          }
        }
        if (skipped > 0) {
          console.log(chalk.dim(`  Skipped ${skipped} not-linked skill(s).`));
        }
        return;
      }

      // Direct unlink
      const entry = new Registry().get(name!);
      if (!entry) {
        const matches = new Registry().findByName(name!);
        if (matches.length > 1) {
          console.error(chalk.red(`Error: Skill '${name}' exists in multiple sources.`));
          for (const match of matches) {
            console.error(chalk.dim(`  Use: metis unlink ${match.id} -f ${projectPath} -p ${platform}`));
          }
        } else {
          console.error(chalk.red(`Error: Skill '${name}' not found.`));
        }
        process.exit(1);
      }
      const skillName = entry?.name ?? name!;
      const linkPath = join(skillsDir, skillName);
      if (!isSymlink(linkPath)) {
        console.error(chalk.red(`Error: '${name}' is not linked in ${projectPath} (${platform}).`));
        process.exit(1);
      }
      removeSymlink(linkPath);
      const registry = new Registry();
      registry.removeLinkedProject(entry.id, projectPath);
      console.log(chalk.green(`✓ Unlinked '${name}' from ${projectPath}`));
    });

  program
    .command('linked [name]')
    .description('Show which projects are linked to a skill, or all links')
    .option('--clean', 'Remove stale links (projects that no longer exist)')
    .option('-p, --platform <platform>', 'Target platform: claude-code (default) or codex', 'claude-code')
    .action(async (name?: string, opts?: { clean?: boolean; platform?: string }) => {
      const registry = new Registry();
      let cleaned = 0;
      const platform = (opts?.platform === 'codex' ? 'codex' : 'claude-code') as Platform;

      const showLinks = (entry: { id: string; name: string }, projects: string[]) => {
        for (const p of projects) {
          const stale = !existsSync(p) || !existsSync(join(resolveSkillsDir(p, platform), entry.name));
          const marker = stale ? chalk.red(' (stale)') : '';
          console.log(`  ${chalk.bold(entry.id)} → ${p}${marker}`);
          if (stale && opts?.clean) {
            registry.removeLinkedProject(entry.id, p);
            cleaned++;
          }
        }
      };

      if (name) {
        const entry = registry.get(name);
        if (!entry) {
          console.error(chalk.red(`Error: Skill '${name}' not found.`));
          process.exit(1);
        }
        if (entry.linkedProjects.length === 0) {
          console.log(chalk.dim(`'${name}' is not linked to any project.`));
        } else {
          showLinks(entry, entry.linkedProjects);
        }
        if (cleaned > 0) console.log(chalk.green(`Cleaned ${cleaned} stale link(s).`));
        return;
      }

      const skills = registry.list();
      let hasLinks = false;
      for (const s of skills) {
        if (s.linkedProjects.length > 0) {
          hasLinks = true;
          showLinks(s, s.linkedProjects);
        }
      }
      if (!hasLinks) {
        console.log(chalk.dim('No skills are linked to any project.'));
      }
      if (cleaned > 0) console.log(chalk.green(`\nCleaned ${cleaned} stale link(s).`));
    });
}
