import { Command } from 'commander';
import chalk from 'chalk';
import { ensureDir, writeJson } from '../utils/fs.js';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';

export function registerInitCommand(program: Command): void {
  program
    .command('init [project-path]')
    .description('Initialize .claude/skills/ directory in a project')
    .action(async (projectPath?: string) => {
      const target = resolve(projectPath ?? process.cwd());
      const claudeDir = join(target, '.claude');
      const skillsDir = join(claudeDir, 'skills');

      if (existsSync(skillsDir)) {
        console.log(chalk.yellow(`⚠ ${skillsDir} already exists.`));
        return;
      }

      ensureDir(skillsDir);

      // Create skills.json to track selected skills
      writeJson(join(claudeDir, 'skills.json'), { skills: [] });

      console.log(chalk.green(`✓ Initialized ${skillsDir}`));
      console.log(chalk.dim(`  Run 'skill link <name> --to ${target}' to add skills.`));
    });
}
