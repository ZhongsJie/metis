import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { loadSources, getSourcesDir, getSkillsDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update [name]')
    .alias('up')
    .description('Update installed skills')
    .action(async (name?: string) => {
      const registry = new Registry();
      const sources = loadSources();

      if (name) {
        const entry = registry.get(name);
        if (!entry) {
          console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
          process.exit(1);
        }
        // For marketplace skills, update the source repo
        if (entry.sourceType === 'marketplace') {
          const source = sources[entry.source];
          if (source) {
            try {
              const handler = getHandler(source);
              await handler.update(source, getSourcesDir());
              entry.updatedAt = new Date().toISOString();
              registry.add(entry);
              console.log(chalk.green(`✓ Updated '${name}' (source: ${source.name}).`));
            } catch (err: any) {
              console.error(chalk.red(`Error updating source '${source.name}': ${err.message}`));
              process.exit(1);
            }
          }
        } else {
          // For git skills, pull directly
          try {
            const tempSource = { name: entry.name, type: 'git' as const, url: entry.sourceUrl ?? '', addedAt: '' };
            const handler = getHandler(tempSource);
            await handler.update(tempSource, getSourcesDir(), getSkillsDir());
            entry.updatedAt = new Date().toISOString();
            registry.add(entry);
            console.log(chalk.green(`✓ Updated '${name}'.`));
          } catch (err: any) {
            console.error(chalk.red(`Error updating '${name}': ${err.message}`));
            process.exit(1);
          }
        }
        return;
      }

      // Update all marketplace sources
      const sourceEntries = Object.values(sources);
      if (sourceEntries.length === 0) {
        console.log(chalk.dim('No sources configured.'));
        return;
      }

      for (const source of sourceEntries) {
        if (source.type === 'marketplace') {
          try {
            const handler = getHandler(source);
            await handler.update(source, getSourcesDir());
            console.log(chalk.green(`✓ Updated source '${source.name}'.`));
          } catch (err: any) {
            console.log(chalk.yellow(`⚠ Failed to update '${source.name}': ${err.message}`));
          }
        }
      }

      console.log(chalk.green('✓ All sources updated.'));
    });
}
