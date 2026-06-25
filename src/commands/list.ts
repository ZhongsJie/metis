import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List installed skills')
    .option('--source <name>', 'Filter by source')
    .action(async (opts: { source?: string }) => {
      const registry = new Registry();
      let skills = registry.list();
      if (opts.source) {
        skills = skills.filter(s => s.source === opts.source);
      }
      if (skills.length === 0) {
        console.log(chalk.dim('No skills installed. Use "metis install <name>" to install one.'));
        return;
      }
      for (const s of skills) {
        const linked = s.linkedProjects.length > 0
          ? chalk.green(`linked (${s.linkedProjects.length} projects)`)
          : chalk.dim('not linked');
        console.log(`  ${chalk.bold(s.name)} ${chalk.dim(`(${s.source})`)} — ${linked}`);
        if (s.linkedProjects.length > 0) {
          for (const p of s.linkedProjects) {
            console.log(chalk.dim(`    → ${p}`));
          }
        }
      }
    });
}
