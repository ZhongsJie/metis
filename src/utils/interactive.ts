import { checkbox, select } from '@inquirer/prompts';
import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useMemo,
  makeTheme,
  isUpKey,
  isDownKey,
  isSpaceKey,
  isEnterKey,
} from '@inquirer/core';
import type { Theme, Status } from '@inquirer/core';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { styleText } from 'node:util';

export interface SelectOption {
  name: string;
  description: string;
  value?: string;
  disabled?: boolean;
}

interface NormalizedChoice {
  value: string;
  name: string;
  description?: string;
  disabled: boolean;
  checked: boolean;
}

// ---------------------------------------------------------------------------
// Icons (kept outside theme to avoid type-merging issues)
// ---------------------------------------------------------------------------
const ICON_CHECKED = styleText('green', '◉');
const ICON_UNCHECKED = '◯';
const ICON_CURSOR = chalk.cyan('❯');

// ---------------------------------------------------------------------------
// Simple numbered-list selection (for remove).
// ---------------------------------------------------------------------------
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

  return indices.map(i => options[i]?.value ?? options[i]?.name).filter((n): n is string => !!n);
}

// ---------------------------------------------------------------------------
// Standard checkbox UI (no search).
// ---------------------------------------------------------------------------
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
    value: o.value ?? o.name,
    description: o.description,
    disabled: o.disabled || false,
  }));

  return checkbox({
    message,
    choices,
    pageSize: 15,
  });
}

// ---------------------------------------------------------------------------
// Dynamic search + checkbox prompt (built with @inquirer/core createPrompt)
// ---------------------------------------------------------------------------
interface SearchCheckboxConfig {
  options: SelectOption[];
  message: string;
}

function normalizeOptions(options: SelectOption[]): NormalizedChoice[] {
  return options.map(o => ({
    value: o.value ?? o.name,
    name: o.name,
    description: o.description,
    disabled: o.disabled ?? false,
    checked: false,
  }));
}

const searchCheckboxPrompt = createPrompt<NormalizedChoice[], SearchCheckboxConfig>(
  (config, done) => {
    const theme = makeTheme<Theme>({});
    const [status, setStatus] = useState<Status>('idle');
    const prefix = usePrefix({ status, theme });
    const [search, setSearch] = useState('');
    const [allItems, setAllItems] = useState(normalizeOptions(config.options));
    const [cursor, setCursor] = useState(0);

    // Filtered items derived from search term
    const filtered: NormalizedChoice[] = useMemo(() => {
      const term = search.toLowerCase().trim();
      if (!term) return allItems;
      return allItems.filter(
        item =>
          item.name.toLowerCase().includes(term) ||
          (item.description ?? '').toLowerCase().includes(term) ||
          item.value.toLowerCase().includes(term),
      );
    }, [search, allItems]);

    const safeCursor =
      filtered.length === 0 ? 0 : Math.min(cursor, filtered.length - 1);

    // ---- key handling ----
    useKeypress((key, rl) => {
      // Some terminal events (e.g. mouse) have no key name
      if (!key.name) return;
      // Enter → confirm
      if (isEnterKey(key)) {
        const selected = allItems.filter(i => i.checked && !i.disabled);
        setStatus('done');
        done(selected);
        return;
      }

      // Escape → cancel
      if (key.name === 'escape') {
        setStatus('done');
        done([]);
        return;
      }

      // Backspace → remove last char from search
      if (key.name === 'backspace') {
        // Readline's line tracks user input; sync our state to it minus 1
        rl.clearLine(0);
        const next = search.slice(0, -1);
        setSearch(next);
        if (next) rl.write(next);
        setCursor(0);
        return;
      }

      // Up
      if (isUpKey(key)) {
        rl.clearLine(0);
        if (search) rl.write(search);
        setCursor(Math.max(0, cursor - 1));
        return;
      }

      // Down
      if (isDownKey(key)) {
        rl.clearLine(0);
        if (search) rl.write(search);
        setCursor(Math.min(filtered.length - 1, cursor + 1));
        return;
      }

      // Space → toggle current item
      if (isSpaceKey(key)) {
        if (filtered.length > 0) {
          const target = filtered[safeCursor]!;
          if (!target.disabled) {
            // Readline added a space — remove it
            rl.clearLine(0);
            if (search) rl.write(search);
            setAllItems(
              allItems.map(item =>
                item.value === target.value
                  ? { ...item, checked: !item.checked }
                  : item,
              ),
            );
          }
        }
        return;
      }

      // Ctrl+A → toggle all visible
      if (key.name === 'a' && key.ctrl) {
        const allChecked = filtered
          .filter(i => !i.disabled)
          .every(i => {
            const orig = allItems.find(o => o.value === i.value);
            return orig?.checked;
          });
        const visibleValues = new Set(filtered.map(i => i.value));
        setAllItems(
          allItems.map(item =>
            visibleValues.has(item.value) && !item.disabled
              ? { ...item, checked: !allChecked }
              : item,
          ),
        );
        return;
      }

      // Printable character → sync from readline line buffer
      if (key.name.length === 1 && !key.ctrl) {
        // Readline adds chars to its line buffer; read it
        setSearch(rl.line);
        setCursor(0);
      }
    });

    // ---- render ----
    const message = theme.style.message(config.message, status);

    // Search bar
    let searchBar: string;
    if (search) {
      searchBar = `${chalk.cyan(search)}${chalk.inverse(' ')}`;
    } else {
      searchBar = `${chalk.inverse(' ')} ${chalk.dim('type to search')}`;
    }
    const countHint = search ? chalk.dim(` — ${filtered.length}/${allItems.length}`) : '';

    // Title line
    let out = `${prefix} ${message}  ${searchBar}${countHint}\n`;

    // Choices
    if (filtered.length === 0) {
      if (search) {
        out += chalk.dim('  No matches.\n');
      }
    } else {
      const page = usePagination({
        items: filtered,
        active: safeCursor,
        pageSize: 10,
        renderItem({ item, isActive }) {
          const pointer = isActive ? ICON_CURSOR : ' ';
          const mark = item.checked ? ICON_CHECKED : ICON_UNCHECKED;
          const label = item.disabled ? chalk.dim(chalk.strikethrough(item.name)) : item.name;
          const desc = item.description
            ? '  ' + chalk.dim(item.description.slice(0, 60))
            : '';
          return ` ${pointer} ${mark} ${label}${desc}`;
        },
      });
      out += page;
    }

    // Help footer
    const checkedCount = allItems.filter(i => i.checked).length;
    const summary = checkedCount > 0 ? `    ${chalk.green(`${checkedCount} selected`)}` : '';
    out += chalk.dim('\n  ↑↓ navigate  space toggle  type search  enter confirm  esc cancel');
    out += summary;

    return out;
  },
);

/**
 * Interactive checkbox with real-time search filtering.
 *
 * The user types to filter the list dynamically, uses arrow keys to
 * navigate, space to toggle, and enter to confirm.  Press Escape to
 * cancel (return empty).
 */
export async function filteredCheckboxSelect(
  options: SelectOption[],
  message: string,
): Promise<string[]> {
  if (options.length === 0) {
    console.log(chalk.dim('Nothing to select.'));
    return [];
  }
  const items = await searchCheckboxPrompt({ options, message });
  return items.map(i => i.value);
}

// ---------------------------------------------------------------------------
// Single-select
// ---------------------------------------------------------------------------

export async function selectOne(
  options: SelectOption[],
  message: string,
): Promise<string | undefined> {
  if (options.length === 0) {
    console.log(chalk.dim('Nothing to select.'));
    return undefined;
  }

  const choices = options.map(o => ({
    name: o.name,
    value: o.value ?? o.name,
    description: o.description,
    disabled: o.disabled || false,
  }));

  return select({
    message,
    choices,
    pageSize: 15,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
