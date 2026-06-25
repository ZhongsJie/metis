import { checkbox } from '@inquirer/prompts';
import { createInterface } from 'node:readline';
import chalk from 'chalk';

export interface SelectOption {
  name: string;
  description: string;
  disabled?: boolean;
}

/**
 * Simple numbered-list selection (for remove).
 */
export async function selectFromList(
  options: SelectOption[],
  { prompt = 'Select', allowMultiple = false }: { prompt?: string; allowMultiple?: boolean } = {},
): Promise<string[]> {
  if (options.length === 0) {
    console.log(chalk.dim('Nothing to select.'));
    return [];
  }

  console.log();
  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const num = chalk.bold(String(i + 1));
    const desc = opt.description ? chalk.dim(` — ${opt.description.slice(0, 60)}`) : '';
    console.log(`  ${num}. ${chalk.bold(opt.name)}${desc}`);
  }
  console.log();

  const hint = allowMultiple
    ? `1-${options.length} (comma-separated, 'q' to quit)`
    : `1-${options.length} ('q' to quit)`;
  const answer = await ask(`${chalk.bold(prompt)} [${hint}]: `);

  if (!answer || answer.toLowerCase() === 'q') {
    return [];
  }

  const indices = answer
    .split(',')
    .map(s => parseInt(s.trim(), 10) - 1)
    .filter(i => i >= 0 && i < options.length);

  return indices.map(i => options[i]?.name).filter((n): n is string => !!n);
}

/**
 * Interactive checkbox UI with arrow keys + space to toggle.
 * Returns selected option names.
 */
export async function checkboxSelect(
  options: SelectOption[],
  message: string,
): Promise<string[]> {
  if (options.length === 0) {
    console.log(chalk.dim('Nothing to select.'));
    return [];
  }

  const choices = options.map(o => ({
    name: o.name,
    value: o.name,
    description: o.description,
    disabled: o.disabled || false,
  }));

  return checkbox({
    message,
    choices,
    pageSize: 15,
  });
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
