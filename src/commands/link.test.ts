import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cliPath = fileURLToPath(new URL('../cli.ts', import.meta.url));

describe('link command', () => {
  it('links into an uninitialized Codex project', () => {
    const home = mkdtempSync(join(tmpdir(), 'metis-link-test-'));

    try {
      const skillPath = join(home, '.metis', 'skills', 'test-source', 'daily-briefing');
      const projectPath = join(home, 'daily-reports');
      const registryPath = join(home, '.metis', 'registry.json');
      mkdirSync(skillPath, { recursive: true });
      mkdirSync(projectPath);
      mkdirSync(dirname(registryPath), { recursive: true });
      writeFileSync(join(skillPath, 'SKILL.md'), '# Daily briefing\n');
      writeFileSync(registryPath, JSON.stringify({
        version: 1,
        skills: {
          'test-source/daily-briefing': {
            id: 'test-source/daily-briefing',
            name: 'daily-briefing',
            description: 'Daily briefing',
            source: 'test-source',
            sourceUrl: 'https://example.com/test-source.git',
            installPath: 'test-source/daily-briefing',
            updatedAt: '',
            linkedProjects: [],
          },
        },
      }));

      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', cliPath, 'link', 'daily-briefing', '-t', projectPath, '-p', 'codex'],
        {
          cwd: resolve(dirname(cliPath), '..'),
          env: { ...process.env, HOME: home },
          encoding: 'utf-8',
        },
      );

      assert.equal(result.status, 0, result.stderr);
      const linkPath = join(projectPath, '.agents', 'skills', 'daily-briefing');
      assert.equal(readlinkSync(linkPath), skillPath);

      const registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as {
        skills: Record<string, { linkedProjects: string[] }>;
      };
      assert.deepEqual(registry.skills['test-source/daily-briefing']?.linkedProjects, [projectPath]);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
