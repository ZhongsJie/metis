import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { existsSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectFromList } from '../utils/interactive.js';

async function doRemove(name: string, force?: boolean) {
  const registry = new Registry();
  const entry = registry.get(name);
  if (!entry) {
    console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
    return;
  }

  if (entry.linkedProjects.length > 0 && !force) {
    console.error(chalk.red(`Error: '${name}' is linked to ${entry.linkedProjects.length} project(s):`));
    for (const p of entry.linkedProjects) {
      console.error(chalk.dim(`  → ${p}`));
    }
    console.error(chalk.dim('  Unlink them first: skill unlink <name> --from <path>'));
    console.error(chalk.dim('  Or use --force to remove anyway.'));
    return;
  }

  const skillPath = resolve(getSkillsDir(), entry.installPath);
  if (existsSync(skillPath)) {
    rmSync(skillPath, { recursive: true, force: true });
  }

  if (entry.sourceType === 'marketplace') {
    const parentDir = resolve(getSkillsDir(), entry.source);
    try {
      const remaining = readdirSync(parentDir).filter(f => f !== '.registry.json' && !f.startsWith('.'));
      if (remaining.length === 0) {
        rmSync(parentDir, { recursive: true, force: true });
      }
    } catch {}
  }

  registry.remove(name);
  console.log(chalk.green(`✓ Removed '${name}'.`));
}

export function registerRemoveCommand(program: Command): void {
  program
    .command('remove [name]')
    .description('Remove an installed skill (use -i for interactive selection)')
    .option('-i, --interactive', 'Interactive selection mode')
    .option('-f, --force', 'Force removal even if linked')
    .action(async (name: string | undefined, opts: { interactive?: boolean; force?: boolean }) => {
      // Interactive mode: show installed skills and let user pick
      if (opts.interactive || !name) {
        const registry = new Registry();
        const skills = registry.list();

        if (skills.length === 0) {
          console.log(chalk.dim('No skills installed.'));
          return;
        }

        const options = skills.map(s => ({
          name: s.name,
          description: `${s.source} · ${s.linkedProjects.length > 0 ? `linked to ${s.linkedProjects.length} projects` : 'not linked'}`,
        }));

        const selected = await selectFromList(options, {
          prompt: 'Select skill(s) to remove',
          allowMultiple: true,
        });

        if (selected.length === 0) {
          console.log(chalk.dim('Cancelled.'));
          return;
        }

        for (const skillName of selected) {
          await doRemove(skillName, opts.force);
        }
        return;
      }

      // Direct remove
      await doRemove(name!, opts.force);
    });
}
