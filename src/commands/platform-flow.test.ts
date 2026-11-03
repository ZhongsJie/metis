import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, renameSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

const cliPath = fileURLToPath(new URL('../cli.ts', import.meta.url));
function fixture(run: (home: string, project: string, cli: (...args: string[]) => SpawnSyncReturns<string>) => void) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'metis-flow-')));
  const project = join(home, 'project');
  mkdirSync(project);
  const skill = join(home, '.metis', 'skills', 'source', 'example');
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), '# Example');
  writeFileSync(join(home, '.metis', 'registry.json'), JSON.stringify({ version: 1, skills: {
    'source/example': { id: 'source/example', name: 'example', description: 'Example', source: 'source',
      sourceUrl: '', installPath: 'source/example', updatedAt: '', linkedProjects: [] },
  } }));
  const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), cliPath, ...args], {
    cwd: project, env: { ...process.env, HOME: home }, encoding: 'utf-8',
  });
  try { run(home, project, cli); } finally { rmSync(home, { recursive: true, force: true }); }
}

describe('platform CLI flows', () => {
  it('auto-detects .agents and links without an explicit platform', () => fixture((home, project, cli) => {
    mkdirSync(join(project, '.agents'));
    const result = cli('link', 'example');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readlinkSync(join(project, '.agents', 'skills', 'example')), join(home, '.metis', 'skills', 'source', 'example'));
    assert.equal(existsSync(join(project, '.claude')), false);
  }));

  it('requires a platform for ambiguous/non-detected targets without a terminal', () => fixture((_home, project, cli) => {
    let result = cli('init');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Specify --platform/);
    mkdirSync(join(project, '.agents'));
    mkdirSync(join(project, '.claude'));
    result = cli('link', 'example');
    assert.equal(result.status, 1);
    assert.equal(existsSync(join(project, '.agents', 'skills')), false);
    assert.equal(existsSync(join(project, '.claude', 'skills')), false);
  }));

  it('initializes Codex and preserves an existing manifest', () => fixture((_home, project, cli) => {
    mkdirSync(join(project, '.agents'));
    const manifest = join(project, '.agents', 'skills.json');
    writeFileSync(manifest, '{"skills":["keep"]}');
    const result = cli('init', project, '-p', 'codex');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(project, '.agents', 'skills')), true);
    assert.equal(readFileSync(manifest, 'utf8'), '{"skills":["keep"]}');
    assert.equal(existsSync(join(project, '.codex')), false);
  }));

  it('links to both platforms and preserves the project record until the final unlink', () => fixture((home, project, cli) => {
    for (const platform of ['codex', 'claude-code']) {
      const result = cli('link', 'example', '-p', platform);
      assert.equal(result.status, 0, result.stderr);
    }
    const registry = () => JSON.parse(readFileSync(join(home, '.metis', 'registry.json'), 'utf8')).skills['source/example'].linkedProjects;
    assert.deepEqual(registry(), [project]);
    let result = cli('unlink', 'example', '-p', 'codex');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(registry(), [project]);
    result = cli('linked', '--clean', '-p', 'codex');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(registry(), [project]);
    assert.equal(existsSync(join(project, '.claude', 'skills', 'example')), true);
    result = cli('link', 'example', '-p', 'codex');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(join(project, '.agents', 'skills', 'example')), true);
    cli('unlink', 'example', '-p', 'codex');
    result = cli('unlink', 'example', '-p', 'claude-code');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(registry(), []);
  }));

  it('keeps legacy Codex links visible and removable', () => fixture((_home, project, cli) => {
    const result = cli('link', 'example', '-p', 'codex');
    assert.equal(result.status, 0, result.stderr);
    mkdirSync(join(project, '.codex', 'skills'), { recursive: true });
    const legacyLink = join(project, '.codex', 'skills', 'example');
    renameSync(join(project, '.agents', 'skills', 'example'), legacyLink);
    const status = cli('linked', '--clean', '-p', 'codex');
    assert.equal(status.status, 0, status.stderr);
    assert.match(status.stdout, /codex/);
    assert.doesNotMatch(status.stdout, /stale/);
    const unlinked = cli('unlink', 'example', '-p', 'codex');
    assert.equal(unlinked.status, 0, unlinked.stderr);
    assert.equal(existsSync(legacyLink), false);
  }));

  it('rejects invalid platforms and leaves existing directories intact', () => fixture((_home, project, cli) => {
    let result = cli('init', '-p', 'codxe');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Expected codex or claude-code/);
    const path = join(project, '.agents', 'skills', 'example');
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, 'keep'), 'data');
    result = cli('link', 'example', '-p', 'codex');
    assert.equal(result.status, 1);
    assert.equal(readFileSync(join(path, 'keep'), 'utf8'), 'data');
  }));
});
