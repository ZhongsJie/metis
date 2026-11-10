import { Command } from 'commander';
import chalk from 'chalk';
import { Registry, type SkillEntry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { createSymlink, removeSymlink, readSymlinkTarget } from '../utils/symlink.js';
import { existsSync, lstatSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { filteredCheckboxSelect } from '../utils/interactive.js';
import { PLATFORMS, parsePlatform, resolveSkillsDir, selectPlatforms, type Platform } from '../platforms.js';

function isSkillLink(entry: SkillEntry, linkPath: string): boolean {
  const target = readSymlinkTarget(linkPath);
  return target !== null && resolve(dirname(linkPath), target) === resolve(getSkillsDir(), entry.installPath);
}

function isLinked(entry: SkillEntry, projectPath: string, platform: Platform): boolean {
  return isSkillLink(entry, join(resolveSkillsDir(projectPath, platform), entry.name));
}

// Existing Codex installations remain visible and removable without moving user files.
function linkedPaths(entry: SkillEntry, projectPath: string, platform: Platform): string[] {
  const paths = [join(resolveSkillsDir(projectPath, platform), entry.name)];
  if (platform === 'codex') paths.push(join(projectPath, '.codex', 'skills', entry.name));
  return paths.filter(path => isSkillLink(entry, path));
}

function hasProjectLink(entry: SkillEntry, projectPath: string): boolean {
  return PLATFORMS.some(platform => linkedPaths(entry, projectPath, platform.id).length > 0);
}

function findSkill(registry: Registry, name: string): SkillEntry | undefined {
  const entry = registry.get(name);
  if (entry) return entry;
  const matches = registry.findByName(name);
  if (matches.length > 1) {
    console.error(chalk.red(`Error: Skill '${name}' exists in multiple sources. Use a source-qualified ID:`));
    for (const match of matches) console.error(chalk.dim(`  ${match.id}`));
  } else {
    console.error(chalk.red(`Error: Skill '${name}' not found.`));
  }
  process.exitCode = 1;
  return undefined;
}

/** lstat also detects broken links, so an existing path is never overwritten. */
function pathExists(path: string): boolean {
  try { lstatSync(path); return true; } catch { return false; }
}

export function registerLinkCommand(program: Command): void {
  for (const operation of ['link', 'unlink'] as const) {
    const command = program
      .command(`${operation} [name]`)
      .description(`${operation === 'link' ? 'Link' : 'Unlink'} skills in detected project harnesses (use -i for skill selection)`)
      .option('-i, --interactive', 'Interactive skill selection mode')
      .option('-p, --platform <platform>', 'Target platform: codex or claude-code (otherwise detect interactively)', parsePlatform);
    if (operation === 'link') command.option('-t, --to <path>', 'Target project path (defaults to cwd)');
    else command.option('-f, --from <path>', 'Target project path (defaults to cwd)');

    command.action(async (name: string | undefined, opts: {
      interactive?: boolean; to?: string; from?: string; platform?: Platform;
    }) => {
      const projectPath = resolve(opts.to ?? opts.from ?? process.cwd());
      const registry = new Registry();
      const interactive = opts.interactive || !name;
      const allSkills = registry.list();
      if (interactive && !allSkills.length) {
        console.log(chalk.dim('No skills found. Use "metis source add <git-url>" first.'));
        return;
      }
      const entry = !interactive ? findSkill(registry, name!) : undefined;
      if (!interactive && !entry) return;
      const platforms = await selectPlatforms(projectPath, opts.platform, operation === 'link' ? 'install' : 'unlink');
      if (!platforms.length) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      const selected = interactive
        ? await filteredCheckboxSelect(allSkills.map(skill => {
          const linked = platforms.filter(platform => operation === 'link'
            ? isLinked(skill, projectPath, platform)
            : linkedPaths(skill, projectPath, platform).length > 0);
          return {
            name: skill.name,
            value: skill.id,
            description: skill.description,
            tab: skill.source,
            tag: linked.length ? `linked: ${linked.join(', ')}` : (operation === 'unlink' ? 'not linked' : undefined),
            tagStyle: linked.length ? chalk.green : chalk.dim,
          };
        }), `Select skills to ${operation}`)
        : [entry!.id];
      if (!selected.length) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      for (const id of selected) {
        const skill = registry.get(id)!;
        for (const platform of platforms) {
          const linkPath = join(resolveSkillsDir(projectPath, platform), skill.name);
          if (operation === 'link') {
            if (isLinked(skill, projectPath, platform)) {
              registry.addLinkedProject(id, projectPath);
              console.log(chalk.dim(`  ⏭ ${id} (${platform}, linked)`));
              continue;
            }
            if (pathExists(linkPath)) {
              console.error(chalk.yellow(`⚠ ${linkPath} already exists; skipped.`));
              process.exitCode = 1;
              continue;
            }
            createSymlink(resolve(getSkillsDir(), skill.installPath), linkPath);
            registry.addLinkedProject(id, projectPath);
            console.log(chalk.green(`✓ Linked '${id}' → ${linkPath}`));
          } else {
            const paths = linkedPaths(skill, projectPath, platform);
            if (paths.length) {
              for (const path of paths) {
                removeSymlink(path);
                console.log(chalk.green(`✓ Unlinked '${id}' from ${path}`));
              }
            } else {
              console.log(chalk.dim(`  ⏭ ${id} (${platform}, not linked)`));
              if (!interactive) process.exitCode = 1;
            }
            if (!hasProjectLink(skill, projectPath)) registry.removeLinkedProject(id, projectPath);
          }
        }
      }
    });
  }

  program
    .command('linked [name]')
    .description('Show which projects are linked to a skill, or all links')
    .option('--clean', 'Remove stale links (projects that no longer exist)')
    .option('-p, --platform <platform>', 'Filter by platform: codex or claude-code', parsePlatform)
    .action(async (name?: string, opts?: { clean?: boolean; platform?: Platform }) => {
      const registry = new Registry();
      const entry = name ? findSkill(registry, name) : undefined;
      if (name && !entry) return;
      const skills = entry ? [entry] : registry.list();
      let cleaned = 0;
      let shown = 0;
      for (const skill of skills) {
        for (const projectPath of skill.linkedProjects) {
          const linked = PLATFORMS.filter(platform => linkedPaths(skill, projectPath, platform.id).length > 0);
          const stale = !existsSync(projectPath) || !linked.length;
          if (!opts?.platform || linked.some(platform => platform.id === opts.platform) || stale) {
            const marker = stale ? chalk.red(' (stale)') : chalk.dim(` (${linked.map(platform => platform.id).join(', ')})`);
            console.log(`  ${chalk.bold(skill.id)} → ${projectPath}${marker}`);
            shown++;
          }
          // A platform filter must never delete another platform's valid project link.
          if (stale && opts?.clean) {
            registry.removeLinkedProject(skill.id, projectPath);
            cleaned++;
          }
        }
      }
      if (!shown) console.log(chalk.dim('No skills are linked to the selected projects/platforms.'));
      if (cleaned) console.log(chalk.green(`Cleaned ${cleaned} stale link(s).`));
    });
}
