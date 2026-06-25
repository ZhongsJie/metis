import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { selectFromList } from '../utils/interactive.js';

async function doRemove(name: string, force?: boolean) {
  const registry = new Registry();
  const entry = registry.get(name);
  if (!entry) {
    const matches = registry.findByName(name);
    if (matches.length > 1) {
      console.error(chalk.red(`Error: Skill '${name}' exists in multiple sources.`));
      for (const match of matches) {
        console.error(chalk.dim(`  Use: metis remove ${match.id}`));
      }
    } else {
      console.error(chalk.red(`Error: Skill '${name}' not found.`));
    }
    return;
  }

  if (entry.linkedProjects.length > 0 && !force) {
    console.error(chalk.red(`Error: '${name}' is linked to ${entry.linkedProjects.length} project(s):`));
    for (const p of entry.linkedProjects) {
      console.error(chalk.dim(`  → ${p}`));
    }
    console.error(chalk.dim('  Unlink them first: metis unlink <name> -f <path>'));
    console.error(chalk.dim('  Or use --force to remove anyway.'));
    return;
  }

  registry.remove(entry.id);
  console.log(chalk.green(`✓ Removed '${entry.id}' from registry.`));
  console.log(chalk.dim(`  Source files remain in ~/.metis/skills/${entry.source}. Use "metis source remove ${entry.source}" to remove the repository.`));
}

export function registerRemoveCommand(program: Command): void {
  program
    .command('remove [name]')
    .description('Remove a discovered skill from the registry (use source remove to delete repositories)')
    .option('-i, --interactive', 'Interactive selection mode')
    .option('-f, --force', 'Force removal even if linked')
    .action(async (name: string | undefined, opts: { interactive?: boolean; force?: boolean }) => {
      // Interactive mode: show installed skills and let user pick
      if (opts.interactive || !name) {
        const registry = new Registry();
        const skills = registry.list();

        if (skills.length === 0) {
          console.log(chalk.dim('No skills found.'));
          return;
        }

        const options = skills.map(s => ({
          name: `${s.name} ${chalk.dim(`(${s.id})`)}${s.linkedProjects.length > 0 ? chalk.green(` · linked to ${s.linkedProjects.length} project(s)`) : ''}`,
          value: s.id,
          description: s.description,
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
