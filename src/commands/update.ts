import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { loadSources, getSkillsDir, saveSources } from '../sources/config.js';
import { syncSourceRegistry, updateSource } from '../sources/git-repo.js';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update [name]')
    .description('Update git source(s) and rescan skills')
    .action(async (name?: string) => {
      const registry = new Registry();
      const sources = loadSources();

      if (name) {
        const source = sources[name];
        if (!source) {
          console.error(chalk.red(`Error: Source '${name}' not found.`));
          process.exit(1);
        }
        try {
          await updateSource(source, getSkillsDir());
          source.updatedAt = new Date().toISOString();
          saveSources(sources);
          const entries = syncSourceRegistry(source, registry, getSkillsDir());
          console.log(chalk.green(`✓ Updated source '${source.name}'.`));
          console.log(chalk.dim(`  Discovered ${entries.length} skill(s).`));
        } catch (err: any) {
          console.error(chalk.red(`Error updating source '${source.name}': ${err.message}`));
          process.exit(1);
        }
        return;
      }

      const sourceEntries = Object.values(sources);
      if (sourceEntries.length === 0) {
        console.log(chalk.dim('No sources configured.'));
        return;
      }

      let succeeded = 0;
      let failed = 0;
      for (const source of sourceEntries) {
        try {
          await updateSource(source, getSkillsDir());
          source.updatedAt = new Date().toISOString();
          const entries = syncSourceRegistry(source, registry, getSkillsDir());
          console.log(chalk.green(`✓ Updated source '${source.name}' (${entries.length} skill${entries.length === 1 ? '' : 's'}).`));
          succeeded++;
        } catch (err: any) {
          console.log(chalk.yellow(`⚠ Failed to update '${source.name}': ${err.message}`));
          failed++;
        }
      }
      if (succeeded > 0) {
        saveSources(sources);
      }

      if (failed > 0) {
        console.error(chalk.red(`Update completed with ${failed} failure(s), ${succeeded} succeeded.`));
        process.exit(1);
      }

      console.log(chalk.green(`✓ All sources updated (${succeeded}).`));
    });
}
