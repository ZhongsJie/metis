import { Command } from 'commander';
import chalk from 'chalk';
import { ensureDir, writeJson } from '../utils/fs.js';
import { resolve, join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { parsePlatform, resolveSkillsDir, selectPlatforms, type Platform } from '../platforms.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init [project-path]')
    .description('Detect coding assistants and initialize project skills directories')
    .option('-p, --platform <platform>', 'Target platform: codex or claude-code (otherwise detect interactively)', parsePlatform)
    .action(async (projectPath?: string, opts?: { platform?: Platform }) => {
      const target = resolve(projectPath ?? process.cwd());
      const platforms = await selectPlatforms(target, opts?.platform);
      if (!platforms.length) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      for (const platform of platforms) {
        const skillsDir = resolveSkillsDir(target, platform);
        if (existsSync(skillsDir)) {
          console.log(chalk.yellow(`⚠ ${skillsDir} already exists.`));
          continue;
        }
        ensureDir(skillsDir);
        const manifest = join(dirname(skillsDir), 'skills.json');
        if (!existsSync(manifest)) writeJson(manifest, { skills: [] });
        console.log(chalk.green(`✓ Initialized ${skillsDir} (${platform})`));
        console.log(chalk.dim(`  Run 'metis link -i -t "${target}" -p ${platform}' to add skills.`));
      }
    });
}
