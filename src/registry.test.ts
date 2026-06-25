import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Registry, SkillEntry } from './registry.js';

let tmpDir: string;

before(() => { tmpDir = mkdtempSync(join(tmpdir(), 'registry-test-')); });
after(() => { rmSync(tmpDir, { recursive: true }); });

describe('Registry', () => {
  it('creates empty registry when file does not exist', () => {
    const reg = new Registry(join(tmpDir, 'nonexistent.json'));
    assert.deepEqual(reg.list(), []);
  });

  it('adds and retrieves a skill entry', () => {
    const file = join(tmpDir, 'test-registry.json');
    const reg = new Registry(file);
    const entry: SkillEntry = {
      id: 'superpowers/test-skill',
      name: 'test-skill',
      description: 'A test skill',
      source: 'superpowers',
      sourceUrl: 'https://example.com/superpowers.git',
      installPath: 'skills/superpowers/test-skill',
      updatedAt: new Date().toISOString(),
      linkedProjects: [],
    };
    reg.add(entry);
    const found = reg.get('test-skill');
    assert.ok(found);
    assert.equal(found!.name, 'test-skill');
    assert.equal(found!.sourceUrl, 'https://example.com/superpowers.git');
    assert.deepEqual(found!.linkedProjects, []);
  });

  it('lists all skills', () => {
    const file = join(tmpDir, 'test-registry2.json');
    const reg = new Registry(file);
    reg.add({ id: 'x/a', name: 'a', description: '', source: 'x', sourceUrl: 'url', installPath: 'p', updatedAt: '', linkedProjects: [] });
    reg.add({ id: 'x/b', name: 'b', description: '', source: 'x', sourceUrl: 'url', installPath: 'p', updatedAt: '', linkedProjects: [] });
    assert.equal(reg.list().length, 2);
  });

  it('removes a skill', () => {
    const file = join(tmpDir, 'test-registry3.json');
    const reg = new Registry(file);
    reg.add({ id: 'x/to-remove', name: 'to-remove', description: '', source: 'x', sourceUrl: 'url', installPath: 'p', updatedAt: '', linkedProjects: [] });
    reg.remove('to-remove');
    assert.equal(reg.get('to-remove'), undefined);
  });

  it('addLinkedProject and removeLinkedProject', () => {
    const file = join(tmpDir, 'test-registry4.json');
    const reg = new Registry(file);
    reg.add({ id: 'x/linked-skill', name: 'linked-skill', description: '', source: 'x', sourceUrl: 'url', installPath: 'p', updatedAt: '', linkedProjects: [] });
    reg.addLinkedProject('linked-skill', '/projects/myapp');
    const entry = reg.get('linked-skill');
    assert.deepEqual(entry!.linkedProjects, ['/projects/myapp']);
    reg.removeLinkedProject('linked-skill', '/projects/myapp');
    assert.deepEqual(reg.get('linked-skill')!.linkedProjects, []);
  });

  it('persists to disk', () => {
    const file = join(tmpDir, 'test-registry5.json');
    const reg1 = new Registry(file);
    reg1.add({ id: 'x/persist', name: 'persist', description: '', source: 'x', sourceUrl: 'url', installPath: 'p', updatedAt: '', linkedProjects: [] });
    const reg2 = new Registry(file);
    assert.ok(reg2.get('persist'));
  });

  it('renames a source and rewrites skill ids and install paths', () => {
    const file = join(tmpDir, 'test-registry6.json');
    const reg = new Registry(file);
    reg.add({
      id: 'old/alpha',
      name: 'alpha',
      description: '',
      source: 'old',
      sourceUrl: 'url',
      installPath: 'old/skills/alpha',
      updatedAt: '',
      linkedProjects: ['/project'],
    });

    const renamed = reg.renameSource('old', 'new');

    assert.equal(renamed.length, 1);
    assert.equal(reg.getExact('old/alpha'), undefined);
    assert.equal(reg.getExact('new/alpha')!.source, 'new');
    assert.equal(reg.getExact('new/alpha')!.installPath, 'new/skills/alpha');
    assert.deepEqual(reg.getExact('new/alpha')!.linkedProjects, ['/project']);
  });
});
