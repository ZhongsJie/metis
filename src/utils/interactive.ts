import { createInterface } from 'node:readline';
import chalk from 'chalk';

export interface SelectOption {
  name: string;
  description: string;
}

/**
 * Show a numbered list and let the user select one or more items.
 * Returns the selected option names.
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
    const num = chalk.bold(String(i + 1));
    const desc = options[i].description ? chalk.dim(` — ${options[i].description.slice(0, 60)}`) : '';
    console.log(`  ${num}. ${chalk.bold(options[i].name)}${desc}`);
  }
  console.log();

  const hint = allowMultiple
    ? `1-${options.length} (comma-separated for multiple, 'q' to quit)`
    : `1-${options.length} ('q' to quit)`;
  const answer = await ask(`${chalk.bold(prompt)} [${hint}]: `);

  if (!answer || answer.toLowerCase() === 'q') {
    return [];
  }

  const indices = answer
    .split(',')
    .map(s => parseInt(s.trim(), 10) - 1)
    .filter(i => i >= 0 && i < options.length);

  return indices.map(i => options[i]!.name);
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
