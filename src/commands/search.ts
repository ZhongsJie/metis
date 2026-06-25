import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search available skills across all sources')
    .action(async (query: string) => {
      const registry = new Registry();
      const q = query.toLowerCase();
      const matches = registry.list().filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q)
      );

      for (const s of matches) {
        console.log(`  ${chalk.bold(s.name)} ${chalk.green('[available]')} ${chalk.dim(`(${s.id})`)}`);
        console.log(chalk.dim(`    ${s.description}`));
        console.log(chalk.dim(`    source: ${s.source}`));
      }

      if (matches.length === 0) {
        console.log(chalk.dim(`No skills found matching "${query}".`));
      }
    });
}
