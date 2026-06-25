#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init.js';
import { registerSourceCommand } from './commands/source.js';
import { registerInstallCommand } from './commands/install.js';
import { registerListCommand } from './commands/list.js';
import { registerSearchCommand } from './commands/search.js';
import { registerInfoCommand } from './commands/info.js';
import { registerRemoveCommand } from './commands/remove.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerLinkCommand } from './commands/link.js';

const program = new Command();

program
  .name('metis')
  .description('Per-project skill manager for Claude Code — install, organize, and link')
  .version('0.1.0')
  .addHelpText('after', `
${chalk.dim('Examples:')}
  $ metis source add superpowers https://github.com/obra/superpowers.git
  $ metis install brainstorming
  $ metis link -i -t ~/my-project
  $ metis ls`);

registerInitCommand(program);
registerSourceCommand(program);
registerInstallCommand(program);
registerListCommand(program);
registerSearchCommand(program);
registerInfoCommand(program);
registerRemoveCommand(program);
registerUpdateCommand(program);
registerLinkCommand(program);

program.parse();
