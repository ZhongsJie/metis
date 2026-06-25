import { Command } from 'commander';
import chalk from 'chalk';
import { loadSources, addSource, removeSource, saveSources, getSourcesDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';

export function registerSourceCommand(program: Command): void {
  const sourceCmd = program
    .command('source')
    .description('Manage skill sources');

  sourceCmd
    .command('add <name> <url>')
    .description('Add a skill source (marketplace or git repo)')
    .option('--type <type>', 'Source type (marketplace or git)', 'marketplace')
    .action(async (name: string, url: string, opts: { type: string }) => {
      if (opts.type !== 'marketplace' && opts.type !== 'git') {
        console.error(chalk.red('Error: --type must be "marketplace" or "git"'));
        process.exit(1);
      }
      const sources = loadSources();
      if (sources[name]) {
        console.log(chalk.yellow(`⚠ Source '${name}' already exists.`));
        return;
      }
      addSource(sources, {
        name,
        type: opts.type as 'marketplace' | 'git',
        url,
        addedAt: new Date().toISOString(),
      });
      console.log(chalk.green(`✓ Added source '${name}' (${opts.type}): ${url}`));
    });

  sourceCmd
    .command('list')
    .description('List configured sources')
    .action(() => {
      const sources = loadSources();
      const entries = Object.values(sources);
      if (entries.length === 0) {
        console.log(chalk.dim('No sources configured. Use "skill source add <name> <url>" to add one.'));
        return;
      }
      for (const s of entries) {
        console.log(`  ${chalk.bold(s.name)} (${s.type}) → ${s.url}`);
      }
    });

  sourceCmd
    .command('remove <name>')
    .description('Remove a skill source')
    .action(async (name: string) => {
      const sources = loadSources();
      if (removeSource(sources, name)) {
        console.log(chalk.green(`✓ Removed source '${name}'.`));
      } else {
        console.error(chalk.red(`Error: Source '${name}' not found.`));
        process.exit(1);
      }
    });

  sourceCmd
    .command('update <name>')
    .description('Update a marketplace source (git pull)')
    .action(async (name: string) => {
      const sources = loadSources();
      const source = sources[name];
      if (!source) {
        console.error(chalk.red(`Error: Source '${name}' not found.`));
        process.exit(1);
      }
      try {
        const handler = getHandler(source);
        await handler.update(source, getSourcesDir());
        source.updatedAt = new Date().toISOString();
        saveSources(sources);
        console.log(chalk.green(`✓ Updated source '${name}'.`));
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
