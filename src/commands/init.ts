import { Command } from 'commander';
import chalk from 'chalk';
import { ensureDir, writeJson } from '../utils/fs.js';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';

type Platform = 'claude-code' | 'codex';

const PLATFORM_DIRS: Record<Platform, string> = {
  'claude-code': '.claude',
  'codex': '.codex',
};

export function registerInitCommand(program: Command): void {
  program
    .command('init [project-path]')
    .description('Initialize skills directory in a project')
    .option('-p, --platform <platform>', 'Target platform: claude-code (default) or codex', 'claude-code')
    .action(async (projectPath?: string, opts?: { platform: string }) => {
      const platform = (opts?.platform === 'codex' ? 'codex' : 'claude-code') as Platform;
      const target = resolve(projectPath ?? process.cwd());
      const platformDir = join(target, PLATFORM_DIRS[platform]);
      const skillsDir = join(platformDir, 'skills');

      if (existsSync(skillsDir)) {
        console.log(chalk.yellow(`⚠ ${skillsDir} already exists.`));
        return;
      }

      ensureDir(skillsDir);
      writeJson(join(platformDir, 'skills.json'), { skills: [] });

      console.log(chalk.green(`✓ Initialized ${skillsDir} (${platform})`));
      console.log(chalk.dim(`  Run 'metis link <name> -t ${target} -p ${platform}' to add skills.`));
    });
}
