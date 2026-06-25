import { Command } from 'commander';
import chalk from 'chalk';

export function registerInstallCommand(program: Command): void {
  program
    .command('install [name]')
    .description('Deprecated: add git repositories with source add instead')
    .action(async () => {
      console.log(chalk.yellow('metis install is no longer needed.'));
      console.log(chalk.dim('  Add a git source instead: metis source add <git-url>'));
      console.log(chalk.dim('  Then use: metis list, metis init, metis link'));
    });
}
