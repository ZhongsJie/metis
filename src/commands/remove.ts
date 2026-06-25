import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { existsSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function registerRemoveCommand(program: Command): void {
  program
    .command('remove <name>')
    .alias('rm')
    .description('Remove an installed skill')
    .option('--force', 'Force removal even if linked')
    .action(async (name: string, opts: { force?: boolean }) => {
      const registry = new Registry();
      const entry = registry.get(name);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }

      if (entry.linkedProjects.length > 0 && !opts.force) {
        console.error(chalk.red(`Error: '${name}' is linked to ${entry.linkedProjects.length} project(s):`));
        for (const p of entry.linkedProjects) {
          console.error(chalk.dim(`  → ${p}`));
        }
        console.error(chalk.dim('  Unlink them first: skill unlink <name> --from <path>'));
        console.error(chalk.dim('  Or use --force to remove anyway.'));
        process.exit(1);
      }

      // Remove the skill directory or symlink
      const skillPath = resolve(getSkillsDir(), entry.installPath);
      if (existsSync(skillPath)) {
        rmSync(skillPath, { recursive: true, force: true });
      }

      // Remove empty parent directory for marketplace skills
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
    });
}
