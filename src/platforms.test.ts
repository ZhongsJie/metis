import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectPlatforms, parsePlatform, resolveSkillsDir } from './platforms.js';

describe('project platforms', () => {
  it('prefers project structure over globally configured assistants', () => {
    const root = mkdtempSync(join(tmpdir(), 'metis-platforms-'));
    try {
      const home = join(root, 'home');
      const project = join(root, 'project');
      mkdirSync(join(home, '.claude'), { recursive: true });
      mkdirSync(join(project, '.agents'), { recursive: true });
      assert.deepEqual(detectPlatforms(project, home).map(item => item.id), ['codex']);
      assert.equal(detectPlatforms(project, home)[0]?.detectedAt, join(project, '.agents'));
      mkdirSync(join(project, '.codex'));
      assert.equal(detectPlatforms(project, home).length, 1);
      mkdirSync(join(project, '.claude'));
      assert.deepEqual(detectPlatforms(project, home).map(item => item.id), ['codex', 'claude-code']);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('falls back to user configuration and recognizes legacy Codex markers', () => {
    const root = mkdtempSync(join(tmpdir(), 'metis-platforms-'));
    try {
      const home = join(root, 'home');
      const project = join(root, 'project');
      assert.deepEqual(detectPlatforms(project, home), []);
      mkdirSync(join(home, '.codex'), { recursive: true });
      assert.deepEqual(detectPlatforms(project, home).map(item => item.id), ['codex']);
      assert.equal(resolveSkillsDir(project, 'codex'), join(project, '.agents', 'skills'));
      // A plain file is not a harness configuration directory.
      mkdirSync(project);
      writeFileSync(join(project, '.claude'), 'text');
      assert.deepEqual(detectPlatforms(project, home).map(item => item.id), ['codex']);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects misspelled platform names', () => {
    assert.equal(parsePlatform('codex'), 'codex');
    assert.throws(() => parsePlatform('codxe'), /Expected codex or claude-code/);
  });
});
