import { statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { checkbox, select } from '@inquirer/prompts';
import { InvalidArgumentError } from 'commander';
import chalk from 'chalk';

export const PLATFORMS = [
  { id: 'codex', name: 'Codex CLI', directory: '.agents', markers: ['.agents', '.codex'] },
  { id: 'claude-code', name: 'Claude Code', directory: '.claude', markers: ['.claude'] },
] as const;
export type Platform = typeof PLATFORMS[number]['id'];

export function parsePlatform(value: string): Platform {
  if (PLATFORMS.some(platform => platform.id === value)) return value as Platform;
  throw new InvalidArgumentError('Expected codex or claude-code.');
}

export function resolveSkillsDir(projectPath: string, platform: Platform): string {
  return join(projectPath, PLATFORMS.find(item => item.id === platform)!.directory, 'skills');
}

function isDirectory(path: string): boolean {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

/** Prefer the project's structure; use user-level configuration only for new projects. */
export function detectPlatforms(projectPath: string, home = homedir()) {
  const detect = (base: string) => PLATFORMS.flatMap(platform => {
    const marker = platform.markers.find(directory => isDirectory(join(base, directory)));
    return marker ? [{ ...platform, detectedAt: join(base, marker) }] : [];
  });
  const local = detect(projectPath);
  return local.length ? local : detect(home);
}

export async function selectPlatforms(
  projectPath: string,
  explicit?: Platform,
  operation: 'install' | 'unlink' = 'install',
): Promise<Platform[]> {
  if (explicit) return [explicit];
  const detected = detectPlatforms(projectPath);
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (detected.length === 1) return [detected[0]!.id];
    throw new Error('Specify --platform codex or --platform claude-code when no single platform is detected outside an interactive terminal.');
  }

  console.log(chalk.cyan('\n◇ Detected harnesses'));
  if (!detected.length) console.log(chalk.dim('  No supported harnesses detected. Choose installation targets below.'));
  for (const platform of detected) {
    console.log(`  ${platform.name.padEnd(16)} ${chalk.dim(platform.detectedAt)}`);
  }
  console.log(chalk.dim(`  Project: ${projectPath}`));
  for (const platform of PLATFORMS) {
    console.log(chalk.dim(`  ${platform.name} → ${resolveSkillsDir(projectPath, platform.id)}`));
  }
  console.log();
  if (detected.length) {
    const mode = await select({
      message: `${operation === 'install' ? 'Install' : 'Unlink'} for detected harnesses only, or customize?`,
      choices: [
        { name: `Detected only (${detected.map(item => item.id).join(', ')})`, value: 'detected' },
        { name: 'Customize…', value: 'custom' },
      ],
    });
    if (mode === 'detected') return detected.map(item => item.id);
    console.log();
  }
  return checkbox<Platform>({
    message: operation === 'install' ? 'Select harnesses to install skills for' : 'Select harnesses to unlink skills from',
    choices: PLATFORMS.map(platform => ({
      name: `${platform.name} (${resolveSkillsDir(projectPath, platform.id)})`,
      value: platform.id,
      checked: detected.some(item => item.id === platform.id),
    })),
  });
}
