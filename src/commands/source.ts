import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, renameSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { clearLine, cursorTo } from 'node:readline';
import { Registry } from '../registry.js';
import { loadSources, addSource, removeSource, saveSources, getSkillsDir } from '../sources/config.js';
import { ensureSourceRepo, getSourceRepoPath, inferSourceName, syncSourceRegistry, updateSource } from '../sources/git-repo.js';
import { createSymlink, isSymlink } from '../utils/symlink.js';

function createProgressRenderer(): { update: (line: string) => void; finish: () => void } {
  let lastProgress = '';
  let rendered = false;
  const isTty = process.stdout.isTTY;

  return {
    update(line: string) {
      if (line === lastProgress) return;
      lastProgress = line;
      if (!isTty) return;
      clearLine(process.stdout, 0);
      cursorTo(process.stdout, 0);
      process.stdout.write(chalk.dim(`   ${line}`));
      rendered = true;
    },
    finish() {
      if (rendered) {
        clearLine(process.stdout, 0);
        cursorTo(process.stdout, 0);
      }
    },
  };
}

function validateSourceName(name: string): void {
  if (!name || name.includes('/') || name.includes('\\')) {
    throw new Error('Source name must be non-empty and cannot contain path separators.');
  }
}

function refreshLinkedProjectSymlinks(entries: ReturnType<Registry['renameSource']>): number {
  const platformDirs = ['.claude', '.codex'];
  let updated = 0;

  for (const entry of entries) {
    const target = resolve(getSkillsDir(), entry.installPath);
    for (const projectPath of entry.linkedProjects) {
      for (const platformDir of platformDirs) {
        const linkPath = join(projectPath, platformDir, 'skills', entry.name);
        if (!isSymlink(linkPath)) continue;
        createSymlink(target, linkPath);
        updated++;
      }
    }
  }

  return updated;
}

export function registerSourceCommand(program: Command): void {
  const sourceCmd = program
    .command('source')
    .description('Manage skill sources');

  sourceCmd
    .command('add <url>')
    .description('Clone a git repository as a skill source')
    .option('-n, --name <name>', 'Source name (defaults to repository name)')
    .action(async (url: string, opts: { name?: string }) => {
      const name = opts.name ?? inferSourceName(url);
      const sources = loadSources();
      const existing = sources[name];
      if (existing && existing.url !== url) {
        console.error(chalk.red(`Error: Source '${name}' already exists with a different URL.`));
        console.error(chalk.dim(`  Existing: ${existing.url}`));
        console.error(chalk.dim(`  New:      ${url}`));
        console.error(chalk.dim('  Use --name <name> or remove the existing source first.'));
        process.exit(1);
      }
      const source = existing ?? {
        name,
        type: 'git' as const,
        url,
        addedAt: new Date().toISOString(),
      };

      try {
        const repoPath = getSourceRepoPath(getSkillsDir(), name);
        const repoExists = existsSync(join(repoPath, '.git'));
        console.log(chalk.cyan(repoExists
          ? `♻️  Source '${name}' already exists, refreshing registry...`
          : `📦 Cloning source '${name}' from ${url}`));
        const progress = createProgressRenderer();
        const repoState = await ensureSourceRepo(source, getSkillsDir(), line => {
          progress.update(line);
        });
        progress.finish();
        if (repoState === 'existing') {
          console.log(chalk.green('✅ Repository ready'));
        } else {
          console.log(chalk.green('✅ Clone complete'));
        }
        if (!existing) {
          addSource(sources, source);
        }
        console.log(chalk.cyan('🔎 Scanning skills...'));
        const entries = syncSourceRegistry(source, new Registry(), getSkillsDir());
        console.log(chalk.green(existing ? `✅ Source '${name}' is ready.` : `✅ Added source '${name}'`));
        console.log(chalk.dim(`  Cloned to ${getSourceRepoPath(getSkillsDir(), name)}`));
        console.log(chalk.dim(`  ✨ Discovered ${entries.length} skill(s).`));
      } catch (err: any) {
        console.error(chalk.red(`❌ Error: ${err.message}`));
        process.exit(1);
      }
    });

  sourceCmd
    .command('list')
    .description('List configured sources')
    .action(() => {
      const sources = loadSources();
      const entries = Object.values(sources);
      if (entries.length === 0) {
        console.log(chalk.dim('No sources configured. Use "metis source add <git-url>" to add one.'));
        return;
      }
      for (const s of entries) {
        const count = new Registry().listBySource(s.name).length;
        console.log(`  ${chalk.bold(s.name)} (${count} skill${count === 1 ? '' : 's'}) → ${s.url}`);
      }
    });

  sourceCmd
    .command('rename <old-name> <new-name>')
    .description('Rename a skill source')
    .action(async (oldName: string, newName: string) => {
      try {
        validateSourceName(newName);
      } catch (err: any) {
        console.error(chalk.red(`❌ Error: ${err.message}`));
        process.exit(1);
      }

      const sources = loadSources();
      const source = sources[oldName];
      if (!source) {
        console.error(chalk.red(`❌ Error: Source '${oldName}' not found.`));
        process.exit(1);
      }
      if (sources[newName]) {
        console.error(chalk.red(`❌ Error: Source '${newName}' already exists.`));
        process.exit(1);
      }

      const oldPath = getSourceRepoPath(getSkillsDir(), oldName);
      const newPath = getSourceRepoPath(getSkillsDir(), newName);
      if (existsSync(newPath)) {
        console.error(chalk.red(`❌ Error: Target path already exists at ${newPath}`));
        process.exit(1);
      }

      try {
        if (existsSync(oldPath)) {
          renameSync(oldPath, newPath);
        }

        const renamedSource = {
          ...source,
          name: newName,
          updatedAt: new Date().toISOString(),
        };
        delete sources[oldName];
        sources[newName] = renamedSource;
        saveSources(sources);

        const registry = new Registry();
        const entries = registry.renameSource(oldName, newName);
        const updatedLinks = refreshLinkedProjectSymlinks(entries);

        console.log(chalk.green(`✅ Renamed source '${oldName}' to '${newName}'.`));
        if (existsSync(newPath)) {
          console.log(chalk.dim(`  Repository moved to ${newPath}`));
        }
        console.log(chalk.dim(`  ✨ Updated ${entries.length} skill(s).`));
        if (updatedLinks > 0) {
          console.log(chalk.dim(`  🔗 Refreshed ${updatedLinks} linked symlink(s).`));
        }
      } catch (err: any) {
        console.error(chalk.red(`❌ Error: ${err.message}`));
        process.exit(1);
      }
    });

  sourceCmd
    .command('remove <name>')
    .description('Remove a skill source')
    .option('-f, --force', 'Remove even if source skills are linked')
    .action(async (name: string, opts: { force?: boolean }) => {
      const sources = loadSources();
      const registry = new Registry();
      const entries = registry.listBySource(name);
      const linked = entries.filter(entry => entry.linkedProjects.length > 0);
      if (!sources[name]) {
        console.error(chalk.red(`Error: Source '${name}' not found.`));
        process.exit(1);
      }
      if (linked.length > 0 && !opts.force) {
        console.error(chalk.red(`Error: Source '${name}' has ${linked.length} linked skill(s).`));
        console.error(chalk.dim('  Unlink them first or use --force.'));
        process.exit(1);
      }
      removeSource(sources, name);
      for (const entry of entries) {
        registry.remove(entry.id);
      }
      rmSync(resolve(getSkillsDir(), name), { recursive: true, force: true });
      console.log(chalk.green(`✓ Removed source '${name}'.`));
    });

  sourceCmd
    .command('update <name>')
    .description('Update a git source and rescan skills')
    .action(async (name: string) => {
      const sources = loadSources();
      const source = sources[name];
      if (!source) {
        console.error(chalk.red(`Error: Source '${name}' not found.`));
        process.exit(1);
      }
      try {
        await updateSource(source, getSkillsDir());
        source.updatedAt = new Date().toISOString();
        saveSources(sources);
        const entries = syncSourceRegistry(source, new Registry(), getSkillsDir());
        console.log(chalk.green(`✓ Updated source '${name}'.`));
        console.log(chalk.dim(`  Discovered ${entries.length} skill(s).`));
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
