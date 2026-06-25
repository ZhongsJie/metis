import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSkillFile } from '../utils/skill-parser.js';
import { getSkillsDir } from '../sources/config.js';

export function registerInfoCommand(program: Command): void {
  program
    .command('info <name>')
    .alias('in')
    .description('Show skill details')
    .action(async (name: string) => {
      const registry = new Registry();
      const entry = registry.get(name);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }

      console.log(chalk.bold(`\n${entry.name}`));
      console.log(chalk.dim(`  Description: ${entry.description}`));
      console.log(chalk.dim(`  Source:      ${entry.source} (${entry.sourceType})`));
      console.log(chalk.dim(`  Version:     ${entry.version}`));
      console.log(chalk.dim(`  Installed:   ${entry.installedAt}`));
      console.log(chalk.dim(`  Updated:     ${entry.updatedAt}`));

      if (entry.sourceUrl) {
        console.log(chalk.dim(`  URL:         ${entry.sourceUrl}`));
      }

      if (entry.linkedProjects.length > 0) {
        console.log(chalk.green(`  Linked to:`));
        for (const p of entry.linkedProjects) {
          console.log(chalk.dim(`    → ${p}`));
        }
      } else {
        console.log(chalk.dim(`  Linked to:   (none)`));
      }

      // Show SKILL.md content preview
      const skillPath = resolve(getSkillsDir(), entry.installPath, 'SKILL.md');
      if (existsSync(skillPath)) {
        console.log(chalk.dim(`\n  ── SKILL.md ──`));
        const meta = parseSkillFile(readFileSync(skillPath, 'utf-8'));
        if (meta && meta.body) {
          const lines = meta.body.split('\n').slice(0, 20);
          for (const line of lines) {
            console.log(chalk.dim(`  ${line}`));
          }
          if (meta.body.split('\n').length > 20) {
            console.log(chalk.dim(`  ... (truncated)`));
          }
        }
      }
      console.log();
    });
}
