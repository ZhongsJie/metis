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
      name: 'test-skill',
      description: 'A test skill',
      source: 'superpowers',
      sourceType: 'marketplace',
      installPath: 'skills/superpowers/test-skill',
      version: '1.0.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedProjects: [],
    };
    reg.add(entry);
    const found = reg.get('test-skill');
    assert.ok(found);
    assert.equal(found!.name, 'test-skill');
    assert.equal(found!.sourceType, 'marketplace');
    assert.deepEqual(found!.linkedProjects, []);
  });

  it('lists all skills', () => {
    const file = join(tmpDir, 'test-registry2.json');
    const reg = new Registry(file);
    reg.add({ name: 'a', description: '', source: 'x', sourceType: 'marketplace', installPath: 'p', version: '1', installedAt: '', updatedAt: '', linkedProjects: [] });
    reg.add({ name: 'b', description: '', source: 'x', sourceType: 'marketplace', installPath: 'p', version: '1', installedAt: '', updatedAt: '', linkedProjects: [] });
    assert.equal(reg.list().length, 2);
  });

  it('removes a skill', () => {
    const file = join(tmpDir, 'test-registry3.json');
    const reg = new Registry(file);
    reg.add({ name: 'to-remove', description: '', source: 'x', sourceType: 'marketplace', installPath: 'p', version: '1', installedAt: '', updatedAt: '', linkedProjects: [] });
    reg.remove('to-remove');
    assert.equal(reg.get('to-remove'), undefined);
  });

  it('addLinkedProject and removeLinkedProject', () => {
    const file = join(tmpDir, 'test-registry4.json');
    const reg = new Registry(file);
    reg.add({ name: 'linked-skill', description: '', source: 'x', sourceType: 'marketplace', installPath: 'p', version: '1', installedAt: '', updatedAt: '', linkedProjects: [] });
    reg.addLinkedProject('linked-skill', '/projects/myapp');
    const entry = reg.get('linked-skill');
    assert.deepEqual(entry!.linkedProjects, ['/projects/myapp']);
    reg.removeLinkedProject('linked-skill', '/projects/myapp');
    assert.deepEqual(reg.get('linked-skill')!.linkedProjects, []);
  });

  it('persists to disk', () => {
    const file = join(tmpDir, 'test-registry5.json');
    const reg1 = new Registry(file);
    reg1.add({ name: 'persist', description: '', source: 'x', sourceType: 'marketplace', installPath: 'p', version: '1', installedAt: '', updatedAt: '', linkedProjects: [] });
    const reg2 = new Registry(file);
    assert.ok(reg2.get('persist'));
  });
});
