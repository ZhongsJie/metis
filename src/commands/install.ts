import { Command } from 'commander';
import chalk from 'chalk';
import { loadSources, getSourcesDir, getSkillsDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';
import { Registry, SkillEntry } from '../registry.js';
import { simpleGit } from 'simple-git';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSkillFile } from '../utils/skill-parser.js';
import { selectFromList } from '../utils/interactive.js';

async function doInstall(name: string, fromUrl?: string, sourceName?: string) {
  const registry = new Registry();

  if (registry.get(name)) {
    console.log(chalk.yellow(`⚠ Skill '${name}' is already installed. Use --force to reinstall.`));
    return;
  }

  if (fromUrl) {
    console.log(chalk.dim(`Installing from ${fromUrl}...`));
    const tempSource = { name: '__direct__', type: 'git' as const, url: fromUrl, addedAt: '' };
    const handler = getHandler(tempSource);
    const relPath = await handler.download(tempSource, name, getSourcesDir(), getSkillsDir());
    const skillMdPath = resolve(getSkillsDir(), relPath, 'SKILL.md');
    const meta = parseSkillFile(readFileSync(skillMdPath, 'utf-8'));
    if (!meta) throw new Error('Installed skill has invalid SKILL.md');
    registry.add({
      name: meta.name, description: meta.description,
      source: '__direct__', sourceType: 'git', sourceUrl: fromUrl,
      installPath: relPath, version: 'latest',
      installedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      linkedProjects: [],
    });
    console.log(chalk.green(`✓ Installed '${meta.name}' from ${fromUrl}`));
    return;
  }

  const sources = loadSources();
  let sourceEntries = Object.values(sources);
  if (sourceName) {
    sourceEntries = sourceEntries.filter(s => s.name === sourceName);
  }
  if (sourceEntries.length === 0) {
    console.error(chalk.red('Error: No sources configured. Use "skill source add" first.'));
    process.exit(1);
  }

  for (const source of sourceEntries) {
    const handler = getHandler(source);
    try {
      const skills = await handler.listSkills(source, getSourcesDir());
      const match = skills.find(s => s.name === name);

      if (match || source.type === 'marketplace') {
        console.log(chalk.dim(`Installing '${name}' from ${source.name}...`));
        const relPath = await handler.download(source, name, getSourcesDir(), getSkillsDir());
        const skillMdPath = resolve(getSkillsDir(), relPath, 'SKILL.md');
        const meta = parseSkillFile(readFileSync(skillMdPath, 'utf-8'));
        if (!meta) throw new Error('Installed skill has invalid SKILL.md');

        let version = 'unknown';
        try {
          const git = simpleGit(getSourcesDir() + '/' + source.name);
          const log = await git.log({ maxCount: 1 });
          version = log.latest?.hash?.slice(0, 7) ?? 'unknown';
        } catch {}

        const entry: SkillEntry = {
          name: meta.name, description: meta.description,
          source: source.name, sourceType: 'marketplace',
          installPath: relPath, version,
          installedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          linkedProjects: [],
        };
        registry.add(entry);
        console.log(chalk.green(`✓ Installed '${meta.name}' from ${source.name}`));
        return;
      }
    } catch (err: any) {
      console.log(chalk.dim(`  Skipping source '${source.name}': ${err.message}`));
    }
  }

  console.error(chalk.red(`Error: Skill '${name}' not found in any configured source.`));
  console.error(chalk.dim('  Use "skill search <query>" to find skills, or "skill source add" to add more sources.'));
  process.exit(1);
}

export function registerInstallCommand(program: Command): void {
  program
    .command('install [name]')
    .description('Install a skill from configured sources (use -i for interactive selection)')
    .option('-i, --interactive', 'Interactive selection mode')
    .option('-s, --from <url>', 'Install directly from a Git URL')
    .option('-f, --force', 'Force reinstall if already installed')
    .action(async (name: string | undefined, opts: { interactive?: boolean; from?: string; force?: boolean }) => {
      // Interactive mode: show available skills and let user pick
      if (opts.interactive || !name) {
        const registry = new Registry();
        const installed = new Set(registry.list().map(s => s.name));
        const sources = loadSources();
        const allSkills: { name: string; description: string; source: string; }[] = [];

        for (const source of Object.values(sources)) {
          try {
            const handler = getHandler(source);
            const skills = await handler.listSkills(source, getSourcesDir());
            for (const s of skills) {
              if (!installed.has(s.name)) {
                allSkills.push(s);
              }
            }
          } catch {}
        }

        if (allSkills.length === 0) {
          console.log(chalk.dim('No available skills found. All skills are already installed, or add more sources.'));
          return;
        }

        const selected = await selectFromList(allSkills, {
          prompt: 'Select skill(s) to install',
          allowMultiple: true,
        });

        if (selected.length === 0) {
          console.log(chalk.dim('Cancelled.'));
          return;
        }

        // Map selected names back to their source for direct install
        for (const skillName of selected) {
          const info = allSkills.find(s => s.name === skillName);
          try {
            await doInstall(skillName, undefined, info?.source);
          } catch (err: any) {
            console.error(chalk.red(`  ✗ ${skillName}: ${err.message}`));
          }
        }
        return;
      }

      // Direct install
      if (opts.force && name) {
        // Remove existing entry if --force
        const registry = new Registry();
        registry.remove(name);
      }
      await doInstall(name!, opts.from);
    });
}
