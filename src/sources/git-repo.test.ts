import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
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

  it('detects categorised skills nested under skills/<category>/<name>', () => {
    const repo = join(tmpDir, 'categorised');
    mkdirSync(join(repo, 'skills', 'engineering', 'alpha'), { recursive: true });
    mkdirSync(join(repo, 'skills', 'productivity', 'beta'), { recursive: true });
    writeFileSync(join(repo, 'skills', 'engineering', 'alpha', 'SKILL.md'), skillMarkdown('alpha'));
    writeFileSync(join(repo, 'skills', 'productivity', 'beta', 'SKILL.md'), skillMarkdown('beta'));

    const skills = scanSourceSkills(source('categorised'), tmpDir);

    assert.deepEqual(skills.map(skill => skill.id).sort(), ['categorised/alpha', 'categorised/beta']);
    assert.deepEqual(skills.map(skill => skill.installPath).sort(), [
      'categorised/skills/engineering/alpha',
      'categorised/skills/productivity/beta',
    ]);
  });

  it('finds skills anywhere in the repository, not only known layouts', () => {
    const repo = join(tmpDir, 'loose');
    mkdirSync(join(repo, 'plugins', 'demo', 'skills', 'gamma'), { recursive: true });
    writeFileSync(join(repo, 'plugins', 'demo', 'skills', 'gamma', 'SKILL.md'), skillMarkdown('gamma'));

    const skills = scanSourceSkills(source('loose'), tmpDir);

    assert.equal(skills.length, 1);
    assert.equal(skills[0]!.id, 'loose/gamma');
    assert.equal(skills[0]!.installPath, 'loose/plugins/demo/skills/gamma');
  });

  it('does not treat files inside a skill as separate skills', () => {
    const repo = join(tmpDir, 'bounded');
    mkdirSync(join(repo, 'skills', 'outer', 'examples', 'inner'), { recursive: true });
    writeFileSync(join(repo, 'skills', 'outer', 'SKILL.md'), skillMarkdown('outer'));
    writeFileSync(join(repo, 'skills', 'outer', 'examples', 'inner', 'SKILL.md'), skillMarkdown('inner'));

    const skills = scanSourceSkills(source('bounded'), tmpDir);

    assert.deepEqual(skills.map(skill => skill.id), ['bounded/outer']);
  });

  it('keeps a root skill when the repository also has a skills/ collection', () => {
    const repo = join(tmpDir, 'root-and-collection');
    mkdirSync(join(repo, 'skills', 'extra'), { recursive: true });
    writeFileSync(join(repo, 'SKILL.md'), skillMarkdown('root-skill'));
    writeFileSync(join(repo, 'skills', 'extra', 'SKILL.md'), skillMarkdown('extra-skill'));

    const skills = scanSourceSkills(source('root-and-collection'), tmpDir);

    assert.deepEqual(skills.map(skill => skill.id).sort(), ['root-and-collection/extra-skill', 'root-and-collection/root-skill']);
    assert.equal(skills.find(skill => skill.name === 'root-skill')!.installPath, 'root-and-collection');
  });

  it('ignores vendored copies and test fixtures', () => {
    const repo = join(tmpDir, 'noisy');
    const ignored = ['node_modules/pkg', 'dist/bundle', 'e2e/testdata', 'skills/x/fixtures'];
    for (const dir of ignored) {
      mkdirSync(join(repo, dir), { recursive: true });
      writeFileSync(join(repo, dir, 'SKILL.md'), skillMarkdown(`noise-${dir.replace(/\W+/g, '-')}`));
    }
    mkdirSync(join(repo, 'skills', 'real'), { recursive: true });
    writeFileSync(join(repo, 'skills', 'real', 'SKILL.md'), skillMarkdown('real'));

    const skills = scanSourceSkills(source('noisy'), tmpDir);

    assert.deepEqual(skills.map(skill => skill.id), ['noisy/real']);
  });

  it('follows symlinked skill directories without scanning them twice', () => {
    const repo = join(tmpDir, 'linked');
    mkdirSync(join(repo, 'real-skill'), { recursive: true });
    writeFileSync(join(repo, 'real-skill', 'SKILL.md'), skillMarkdown('symlinked'));
    symlinkSync(join(repo, 'real-skill'), join(repo, 'alias-skill'), 'dir');

    const skills = scanSourceSkills(source('linked'), tmpDir);

    assert.equal(skills.length, 1);
    assert.equal(skills[0]!.id, 'linked/symlinked');
  });

  it('reuses an existing cloned repository at the standard source path', async () => {
    const repo = join(tmpDir, 'existing');
    mkdirSync(join(repo, '.git'), { recursive: true });

    const state = await ensureSourceRepo(source('existing'), tmpDir);

    assert.equal(state, 'existing');
  });
});
