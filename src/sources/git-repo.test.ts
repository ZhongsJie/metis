import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureSourceRepo, inferSourceName, parseGitProgressLines, scanSourceSkills } from './git-repo.js';
import { SkillSource } from './index.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'metis-source-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function source(name: string): SkillSource {
  return { name, type: 'git', url: `https://example.com/${name}.git`, addedAt: '' };
}

function skillMarkdown(name: string): string {
  return `---
name: ${name}
description: ${name} description
---

# ${name}
`;
}

describe('git source scanning', () => {
  it('infers source name from common git urls', () => {
    assert.equal(inferSourceName('https://github.com/acme/tools.git'), 'tools');
    assert.equal(inferSourceName('git@github.com:acme/skills.git'), 'skills');
    assert.equal(inferSourceName('https://github.com/acme/metis/'), 'metis');
  });

  it('parses git progress chunks split by carriage returns and newlines', () => {
    assert.deepEqual(parseGitProgressLines('Cloning into x...\rReceiving objects: 10%\r\nResolving deltas: 100%\n'), [
      'Cloning into x...',
      'Receiving objects: 10%',
      'Resolving deltas: 100%',
    ]);
  });

  it('detects a single-skill repository at the root', () => {
    const repo = join(tmpDir, 'single');
    mkdirSync(repo);
    writeFileSync(join(repo, 'SKILL.md'), skillMarkdown('root-skill'));

    const skills = scanSourceSkills(source('single'), tmpDir);

    assert.equal(skills.length, 1);
    assert.equal(skills[0]!.id, 'single/root-skill');
    assert.equal(skills[0]!.installPath, 'single');
  });

  it('detects multiple skills under skills/*', () => {
    const repo = join(tmpDir, 'multi');
    mkdirSync(join(repo, 'skills', 'a'), { recursive: true });
    mkdirSync(join(repo, 'skills', 'b'), { recursive: true });
    writeFileSync(join(repo, 'skills', 'a', 'SKILL.md'), skillMarkdown('alpha'));
    writeFileSync(join(repo, 'skills', 'b', 'SKILL.md'), skillMarkdown('beta'));

    const skills = scanSourceSkills(source('multi'), tmpDir);

    assert.deepEqual(skills.map(skill => skill.id).sort(), ['multi/alpha', 'multi/beta']);
    assert.deepEqual(skills.map(skill => skill.installPath).sort(), ['multi/skills/a', 'multi/skills/b']);
  });

  it('detects skills under .claude/skills/* (Claude Code plugin layout)', () => {
    const repo = join(tmpDir, 'claude-plugin');
    mkdirSync(join(repo, '.claude', 'skills', 'x'), { recursive: true });
    mkdirSync(join(repo, '.claude', 'skills', 'y'), { recursive: true });
    writeFileSync(join(repo, '.claude', 'skills', 'x', 'SKILL.md'), skillMarkdown('plugin-a'));
    writeFileSync(join(repo, '.claude', 'skills', 'y', 'SKILL.md'), skillMarkdown('plugin-b'));

    const skills = scanSourceSkills(source('claude-plugin'), tmpDir);

    assert.deepEqual(skills.map(skill => skill.id).sort(), ['claude-plugin/plugin-a', 'claude-plugin/plugin-b']);
    assert.deepEqual(skills.map(skill => skill.installPath).sort(), ['claude-plugin/.claude/skills/x', 'claude-plugin/.claude/skills/y']);
  });

  it('reuses an existing cloned repository at the standard source path', async () => {
    const repo = join(tmpDir, 'existing');
    mkdirSync(join(repo, '.git'), { recursive: true });

    const state = await ensureSourceRepo(source('existing'), tmpDir);

    assert.equal(state, 'existing');
  });
});
