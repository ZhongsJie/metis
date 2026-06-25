import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { loadSources, getSourcesDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .alias('s')
    .description('Search available skills across all sources')
    .action(async (query: string) => {
      const registry = new Registry();
      const installed = new Set(registry.list().map(s => s.name));
      const sources = loadSources();
      const q = query.toLowerCase();
      let found = 0;

      for (const source of Object.values(sources)) {
        try {
          const handler = getHandler(source);
          const skills = await handler.listSkills(source, getSourcesDir());
          const matches = skills.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q)
          );
          for (const s of matches) {
            found++;
            const status = installed.has(s.name) ? chalk.dim('[installed]') : chalk.green('[available]');
            console.log(`  ${chalk.bold(s.name)} ${status}`);
            console.log(chalk.dim(`    ${s.description}`));
            console.log(chalk.dim(`    source: ${s.source}`));
          }
        } catch {
          // Source not available — skip silently
        }
      }

      if (found === 0) {
        console.log(chalk.dim(`No skills found matching "${query}".`));
      }
    });
}
