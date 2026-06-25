# Skill Manager CLI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool (`skill`) that downloads, manages, and links Claude Code skills from Git repos and marketplaces.

**Architecture:** TypeScript CLI using Commander.js, with gray-matter for SKILL.md parsing and simple-git for Git operations. Skills stored in `skills/` directory, marketplace repos cached in `.sources/`. Project-level selection via `.claude/skills/` symlinks.

**Tech Stack:** TypeScript, Node.js (tsx runtime), Commander.js, gray-matter, simple-git, chalk

**Spec:** `docs/specs/2026-06-25-skill-manager-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | npm metadata, dependencies, bin entry |
| `tsconfig.json` | TypeScript config |
| `bin/skill` | Shell entry point (executes tsx) |
| `src/cli.ts` | Commander setup, register all commands |
| `src/registry.ts` | Read/write/validate `skills/.registry.json` |
| `src/sources/index.ts` | Source interface (`SkillSource`) and router |
| `src/sources/marketplace.ts` | Clone/update marketplace repo, discover skills |
| `src/sources/git.ts` | Clone/update single-skill git repos |
| `src/sources/config.ts` | Read/write `sources.json` |
| `src/commands/init.ts` | `skill init` — create `.claude/skills/` in project |
| `src/commands/source.ts` | `skill source add/list/remove/update` |
| `src/commands/install.ts` | `skill install` — install skill from source |
| `src/commands/list.ts` | `skill list` — list installed skills |
| `src/commands/search.ts` | `skill search` — search available skills |
| `src/commands/info.ts` | `skill info` — show skill metadata |
| `src/commands/remove.ts` | `skill remove` — remove installed skill |
| `src/commands/update.ts` | `skill update` — update skill(s) |
| `src/commands/link.ts` | `skill link/unlink/linked` — manage project symlinks |
| `src/utils/skill-parser.ts` | Parse SKILL.md YAML frontmatter |
| `src/utils/symlink.ts` | Cross-platform symlink helpers |
| `src/utils/fs.ts` | ensureDir, path helpers |

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/` directory structure
- Create: `bin/skill`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "skill-manager",
  "version": "0.1.0",
  "description": "CLI tool for managing Claude Code skills per-project",
  "private": true,
  "type": "module",
  "bin": {
    "skill": "./bin/skill"
  },
  "scripts": {
    "dev": "npx tsx src/cli.ts",
    "test": "node --import tsx --test src/**/*.test.ts",
    "typecheck": "npx tsc --noEmit"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.1.0",
    "gray-matter": "^4.0.3",
    "simple-git": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write .gitignore**

```
node_modules/
dist/
.sources/
skills/
!skills/.registry.json
```

- [ ] **Step 4: Write bin/skill**

```bash
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
exec npx tsx "$PROJECT_DIR/src/cli.ts" "$@"
```

- [ ] **Step 5: Make bin/skill executable and create directories**

```bash
chmod +x /Users/zhongsjie/Documents/Repository/skills/bin/skill
mkdir -p /Users/zhongsjie/Documents/Repository/skills/src/{commands,sources,utils}
mkdir -p /Users/zhongsjie/Documents/Repository/skills/skills
mkdir -p /Users/zhongsjie/Documents/Repository/skills/.sources
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && npm install
```
Expected: installs all deps without errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git init
git add package.json tsconfig.json .gitignore bin/skill
git commit -m "chore: initialize project with TypeScript + Commander.js"
```

---

### Task 2: Skill Parser Utility

**Files:**
- Create: `src/utils/skill-parser.ts`
- Create: `src/utils/skill-parser.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/utils/skill-parser.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSkillFile, parseSkillDir } from './skill-parser.js';

describe('parseSkillFile', () => {
  it('parses valid SKILL.md with frontmatter', () => {
    const content = `---
name: brainstorming
description: Use before any creative work
---

# Brainstorming

Some content here.`;

    const result = parseSkillFile(content);
    assert.equal(result.name, 'brainstorming');
    assert.equal(result.description, 'Use before any creative work');
    assert.ok(result.body.includes('# Brainstorming'));
  });

  it('returns null for file without frontmatter', () => {
    const content = '# Just a heading\n\nNo frontmatter here.';
    const result = parseSkillFile(content);
    assert.equal(result, null);
  });

  it('returns null for frontmatter missing name', () => {
    const content = `---
description: No name field
---
Body`;
    const result = parseSkillFile(content);
    assert.equal(result, null);
  });

  it('handles empty body', () => {
    const content = `---
name: minimal
description: Just frontmatter
---`;
    const result = parseSkillFile(content);
    assert.equal(result.name, 'minimal');
    assert.equal(result.body, '');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx --test src/utils/skill-parser.test.ts
```
Expected: FAIL — cannot find module './skill-parser.js'

- [ ] **Step 3: Write implementation**

```typescript
// src/utils/skill-parser.ts
import matter from 'gray-matter';

export interface SkillMeta {
  name: string;
  description: string;
  body: string;
}

export function parseSkillFile(content: string): SkillMeta | null {
  const { data, content: body } = matter(content);
  if (!data.name || !data.description) return null;
  return {
    name: data.name,
    description: data.description,
    body: body.trim(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx --test src/utils/skill-parser.test.ts
```
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/utils/skill-parser.ts src/utils/skill-parser.test.ts
git commit -m "feat: add SKILL.md frontmatter parser"
```

---

### Task 3: Filesystem & Symlink Utilities

**Files:**
- Create: `src/utils/fs.ts`
- Create: `src/utils/symlink.ts`

- [ ] **Step 1: Write fs.ts**

```typescript
// src/utils/fs.ts
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function readJson<T>(filepath: string, fallback: T): T {
  try {
    const raw = readFileSync(filepath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(filepath: string, data: unknown): void {
  ensureDir(dirname(filepath));
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function resolvePath(base: string, ...segments: string[]): string {
  return resolve(base, ...segments);
}
```

- [ ] **Step 2: Write symlink.ts**

```typescript
// src/utils/symlink.ts
import { symlinkSync, unlinkSync, existsSync, lstatSync, readlinkSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { ensureDir } from './fs.js';

/** Create a symlink at `linkPath` pointing to `target`. Always uses absolute paths. */
export function createSymlink(target: string, linkPath: string): void {
  const absTarget = resolve(target);
  ensureDir(dirname(linkPath));
  if (existsSync(linkPath)) {
    unlinkSync(linkPath);
  }
  symlinkSync(absTarget, linkPath, 'dir');
}

/** Remove a symlink. Returns true if removed, false if it wasn't a symlink. */
export function removeSymlink(linkPath: string): boolean {
  if (!existsSync(linkPath)) return false;
  const stat = lstatSync(linkPath);
  if (!stat.isSymbolicLink()) return false;
  unlinkSync(linkPath);
  return true;
}

/** Check if a path is a symlink and return its target, or null. */
export function readSymlinkTarget(linkPath: string): string | null {
  if (!existsSync(linkPath)) return null;
  const stat = lstatSync(linkPath);
  if (!stat.isSymbolicLink()) return null;
  return readlinkSync(linkPath);
}

/** Check if a path exists AND is a symlink. */
export function isSymlink(linkPath: string): boolean {
  if (!existsSync(linkPath)) return false;
  return lstatSync(linkPath).isSymbolicLink();
}
```

- [ ] **Step 3: Verify with a quick smoke test**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx -e "
import { ensureDir, writeJson, readJson } from './src/utils/fs.js';
import { createSymlink, readSymlinkTarget, removeSymlink } from './src/utils/symlink.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const dir = mkdtempSync(join(tmpdir(), 'skill-test-'));
ensureDir(join(dir, 'a/b'));
writeJson(join(dir, 'test.json'), { hello: 'world' });
const data = readJson(join(dir, 'test.json'), {});
console.assert(data.hello === 'world', 'readJson failed');

createSymlink(join(dir, 'a'), join(dir, 'link'));
console.assert(readSymlinkTarget(join(dir, 'link')) !== null, 'symlink failed');
removeSymlink(join(dir, 'link'));
console.assert(readSymlinkTarget(join(dir, 'link')) === null, 'removeSymlink failed');

rmSync(dir, { recursive: true });
console.log('All smoke tests passed');
"
```
Expected: "All smoke tests passed"

- [ ] **Step 4: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/utils/fs.ts src/utils/symlink.ts
git commit -m "feat: add filesystem and symlink utilities"
```

---

### Task 4: Registry Management

**Files:**
- Create: `src/registry.ts`
- Create: `src/registry.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/registry.test.ts
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx --test src/registry.test.ts
```
Expected: FAIL — cannot find module './registry.js'

- [ ] **Step 3: Write implementation**

```typescript
// src/registry.ts
import { readJson, writeJson } from './utils/fs.js';
import { resolve } from 'node:path';

export interface SkillEntry {
  name: string;
  description: string;
  source: string;
  sourceType: 'marketplace' | 'git';
  sourceUrl?: string;
  sourceRef?: string;
  installPath: string;
  version: string;
  installedAt: string;
  updatedAt: string;
  linkedProjects: string[];
}

interface RegistryData {
  version: 1;
  skills: Record<string, SkillEntry>;
}

const SKILLS_DIR = resolve(import.meta.dirname, '..', 'skills');

export class Registry {
  private file: string;
  private data: RegistryData;

  constructor(file?: string) {
    this.file = file ?? resolve(SKILLS_DIR, '.registry.json');
    this.data = readJson<RegistryData>(this.file, { version: 1, skills: {} });
  }

  get(name: string): SkillEntry | undefined {
    return this.data.skills[name];
  }

  list(): SkillEntry[] {
    return Object.values(this.data.skills);
  }

  add(entry: SkillEntry): void {
    this.data.skills[entry.name] = entry;
    this.save();
  }

  remove(name: string): boolean {
    if (!this.data.skills[name]) return false;
    delete this.data.skills[name];
    this.save();
    return true;
  }

  addLinkedProject(name: string, projectPath: string): void {
    const entry = this.data.skills[name];
    if (!entry) return;
    if (!entry.linkedProjects.includes(projectPath)) {
      entry.linkedProjects.push(projectPath);
      this.save();
    }
  }

  removeLinkedProject(name: string, projectPath: string): void {
    const entry = this.data.skills[name];
    if (!entry) return;
    entry.linkedProjects = entry.linkedProjects.filter(p => p !== projectPath);
    this.save();
  }

  private save(): void {
    writeJson(this.file, this.data);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx --test src/registry.test.ts
```
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/registry.ts src/registry.test.ts
git commit -m "feat: add skill registry with JSON persistence"
```

---

### Task 5: Source Configuration & Interface

**Files:**
- Create: `src/sources/index.ts`
- Create: `src/sources/config.ts`

- [ ] **Step 1: Write source interface and config management**

```typescript
// src/sources/index.ts
export interface SkillSource {
  /** Source name (e.g. "superpowers") */
  name: string;
  /** Source type */
  type: 'marketplace' | 'git';
  /** Git URL */
  url: string;
  /** When the source was added */
  addedAt: string;
  /** Last time source was updated */
  updatedAt?: string;
}

export interface AvailableSkill {
  name: string;
  description: string;
  source: string;
  sourceType: 'marketplace' | 'git';
}

/** Interface that every source handler must implement */
export interface SourceHandler {
  /** List all skills available from this source */
  listSkills(source: SkillSource, sourcesDir: string): Promise<AvailableSkill[]>;
  /** Download/install a specific skill from this source */
  download(source: SkillSource, skillName: string, sourcesDir: string, skillsDir: string): Promise<string>;
  /** Update the source (pull latest) */
  update(source: SkillSource, sourcesDir: string): Promise<void>;
}
```

```typescript
// src/sources/config.ts
import { readJson, writeJson } from '../utils/fs.js';
import { resolve } from 'node:path';
import { SkillSource } from './index.js';

interface SourcesData {
  version: 1;
  sources: Record<string, SkillSource>;
}

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const SOURCES_FILE = resolve(PROJECT_ROOT, 'sources.json');

export function loadSources(): Record<string, SkillSource> {
  const data = readJson<SourcesData>(SOURCES_FILE, { version: 1, sources: {} });
  return data.sources;
}

export function saveSources(sources: Record<string, SkillSource>): void {
  writeJson(SOURCES_FILE, { version: 1, sources });
}

export function addSource(sources: Record<string, SkillSource>, source: SkillSource): void {
  sources[source.name] = source;
  saveSources(sources);
}

export function removeSource(sources: Record<string, SkillSource>, name: string): boolean {
  if (!sources[name]) return false;
  delete sources[name];
  saveSources(sources);
  return true;
}

export function getSourcesDir(): string {
  return resolve(PROJECT_ROOT, '.sources');
}

export function getSkillsDir(): string {
  return resolve(PROJECT_ROOT, 'skills');
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/sources/index.ts src/sources/config.ts
git commit -m "feat: add source interface and config management"
```

---

### Task 6: Marketplace Source Handler

**Files:**
- Create: `src/sources/marketplace.ts`

- [ ] **Step 1: Write marketplace handler**

```typescript
// src/sources/marketplace.ts
import { SourceHandler, AvailableSkill, SkillSource } from './index.js';
import { ensureDir, resolvePath } from '../utils/fs.js';
import { createSymlink, isSymlink } from '../utils/symlink.js';
import { parseSkillFile } from '../utils/skill-parser.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { simpleGit } from 'simple-git';

export const marketplaceHandler: SourceHandler = {
  async listSkills(source: SkillSource, sourcesDir: string): Promise<AvailableSkill[]> {
    const repoPath = resolve(sourcesDir, source.name);
    if (!existsSync(join(repoPath, 'skills'))) {
      return [];
    }
    const skills: AvailableSkill[] = [];
    const skillsDir = join(repoPath, 'skills');
    for (const dir of readdirSync(skillsDir)) {
      const skillMd = join(skillsDir, dir, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const content = readFileSync(skillMd, 'utf-8');
      const meta = parseSkillFile(content);
      if (meta) {
        skills.push({
          name: meta.name,
          description: meta.description,
          source: source.name,
          sourceType: 'marketplace',
        });
      }
    }
    return skills;
  },

  async download(source: SkillSource, skillName: string, sourcesDir: string, skillsDir: string): Promise<string> {
    const repoPath = resolve(sourcesDir, source.name);
    // Ensure the repo is cloned
    if (!existsSync(repoPath)) {
      ensureDir(sourcesDir);
      const git = simpleGit();
      await git.clone(source.url, repoPath, ['--depth', '1']);
    }
    // Find the skill in the repo
    const srcSkillsDir = join(repoPath, 'skills');
    if (!existsSync(srcSkillsDir)) {
      throw new Error(`Marketplace '${source.name}' has no skills/ directory`);
    }
    // Find matching skill directory
    let foundDir: string | null = null;
    for (const dir of readdirSync(srcSkillsDir)) {
      const skillMd = join(srcSkillsDir, dir, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const meta = parseSkillFile(readFileSync(skillMd, 'utf-8'));
      if (meta && meta.name === skillName) {
        foundDir = dir;
        break;
      }
    }
    if (!foundDir) {
      throw new Error(`Skill '${skillName}' not found in marketplace '${source.name}'`);
    }
    // Create symlink: skills/<source>/<skillName> -> .sources/<source>/skills/<foundDir>
    const targetDir = resolve(skillsDir, source.name);
    ensureDir(targetDir);
    const linkPath = join(targetDir, skillName);
    const realPath = join(srcSkillsDir, foundDir);
    createSymlink(realPath, linkPath);
    return join(source.name, skillName);
  },

  async update(source: SkillSource, sourcesDir: string): Promise<void> {
    const repoPath = resolve(sourcesDir, source.name);
    if (!existsSync(join(repoPath, '.git'))) {
      throw new Error(`Source '${source.name}' is not a git repository. Run install first.`);
    }
    const git = simpleGit(repoPath);
    await git.pull();
  },
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/sources/marketplace.ts
git commit -m "feat: add marketplace source handler"
```

---

### Task 7: Git Source Handler

**Files:**
- Create: `src/sources/git.ts`
- Create: `src/sources/router.ts`

- [ ] **Step 1: Write git source handler**

```typescript
// src/sources/git.ts
import { SourceHandler, AvailableSkill, SkillSource } from './index.js';
import { ensureDir } from '../utils/fs.js';
import { parseSkillFile } from '../utils/skill-parser.js';
import { existsSync, readdirSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { simpleGit } from 'simple-git';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export const gitHandler: SourceHandler = {
  async listSkills(source: SkillSource, _sourcesDir: string): Promise<AvailableSkill[]> {
    // For git sources, we need to clone to discover
    // This is done during install, not listing
    return [];
  },

  async download(source: SkillSource, skillName: string, _sourcesDir: string, skillsDir: string): Promise<string> {
    const destDir = resolve(skillsDir, skillName);
    if (existsSync(destDir)) {
      throw new Error(`Skill '${skillName}' is already installed. Use --force to overwrite.`);
    }
    // Clone to temp directory first
    const tempDir = join(tmpdir(), `skill-clone-${randomUUID()}`);
    try {
      const git = simpleGit();
      await git.clone(source.url, tempDir, ['--depth', '1']);
      // Verify it has a SKILL.md
      const skillMd = join(tempDir, 'SKILL.md');
      if (!existsSync(skillMd)) {
        throw new Error(`Repository does not contain SKILL.md at root.`);
      }
      const meta = parseSkillFile(readFileSync(skillMd, 'utf-8'));
      if (!meta) {
        throw new Error(`SKILL.md has invalid frontmatter.`);
      }
      // Copy to skills dir
      ensureDir(skillsDir);
      cpSync(tempDir, destDir, { recursive: true });
      return skillName;
    } finally {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    }
  },

  async update(source: SkillSource, _sourcesDir: string, skillsDir?: string): Promise<void> {
    const destDir = resolve(skillsDir ?? '', source.name);
    if (!existsSync(join(destDir, '.git'))) {
      throw new Error(`Skill '${source.name}' is not a git repository.`);
    }
    const git = simpleGit(destDir);
    await git.pull();
  },
};
```

- [ ] **Step 2: Write source router**

```typescript
// src/sources/router.ts
import { SkillSource, SourceHandler } from './index.js';
import { marketplaceHandler } from './marketplace.js';
import { gitHandler } from './git.js';

export function getHandler(source: SkillSource): SourceHandler {
  switch (source.type) {
    case 'marketplace':
      return marketplaceHandler;
    case 'git':
      return gitHandler;
    default:
      throw new Error(`Unknown source type: ${(source as any).type}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/sources/git.ts src/sources/router.ts
git commit -m "feat: add git source handler and source router"
```

---

### Task 8: CLI Framework Setup

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Write CLI entry point**

```typescript
// src/cli.ts
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { registerInitCommand } from './commands/init.js';
import { registerSourceCommand } from './commands/source.js';
import { registerInstallCommand } from './commands/install.js';
import { registerListCommand } from './commands/list.js';
import { registerSearchCommand } from './commands/search.js';
import { registerInfoCommand } from './commands/info.js';
import { registerRemoveCommand } from './commands/remove.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerLinkCommand } from './commands/link.js';

const program = new Command();

program
  .name('skill')
  .description('Manage Claude Code skills per-project')
  .version('0.1.0')
  .addHelpText('after', `
${chalk.dim('Examples:')}
  $ skill source add superpowers https://github.com/obra/superpowers.git
  $ skill install brainstorming
  $ skill link brainstorming --to ~/my-project
  $ skill list`);

registerInitCommand(program);
registerSourceCommand(program);
registerInstallCommand(program);
registerListCommand(program);
registerSearchCommand(program);
registerInfoCommand(program);
registerRemoveCommand(program);
registerUpdateCommand(program);
registerLinkCommand(program);

program.parse();
```

- [ ] **Step 2: Verify CLI loads without errors**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx src/cli.ts --help
```
Expected: Usage info with all commands listed.

- [ ] **Step 3: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/cli.ts
git commit -m "feat: add CLI framework with Commander.js"
```

At this point, all commands will fail because their registration functions don't exist yet. We'll add them one by one.

---

### Task 9: Init Command

**Files:**
- Create: `src/commands/init.ts`

- [ ] **Step 1: Write init command**

```typescript
// src/commands/init.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { ensureDir, writeJson } from '../utils/fs.js';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function registerInitCommand(program: Command): void {
  program
    .command('init [project-path]')
    .description('Initialize .claude/skills/ directory in a project')
    .action(async (projectPath?: string) => {
      const target = resolve(projectPath ?? process.cwd());
      const claudeDir = join(target, '.claude');
      const skillsDir = join(claudeDir, 'skills');

      if (existsSync(skillsDir)) {
        console.log(chalk.yellow(`⚠ ${skillsDir} already exists.`));
        return;
      }

      ensureDir(skillsDir);

      // Create skills.json to track selected skills
      writeJson(join(claudeDir, 'skills.json'), { skills: [] });

      console.log(chalk.green(`✓ Initialized ${skillsDir}`));
      console.log(chalk.dim(`  Run 'skill link <name> --to ${target}' to add skills.`));
    });
}
```

- [ ] **Step 2: Smoke test**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
TMP=$(mktemp -d)
node --import tsx src/cli.ts init "$TMP"
ls -la "$TMP/.claude/skills/"
cat "$TMP/.claude/skills.json"
rm -rf "$TMP"
```
Expected: `.claude/skills/` directory created with `skills.json` containing `{"skills": []}`.

- [ ] **Step 3: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/commands/init.ts
git commit -m "feat: add skill init command"
```

---

### Task 10: Source Commands

**Files:**
- Create: `src/commands/source.ts`

- [ ] **Step 1: Write source command**

```typescript
// src/commands/source.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { loadSources, addSource, removeSource, saveSources, getSourcesDir } from '../sources/config.js';
import { SkillSource } from '../sources/index.js';
import { getHandler } from '../sources/router.js';

export function registerSourceCommand(program: Command): void {
  const sourceCmd = program
    .command('source')
    .description('Manage skill sources');

  sourceCmd
    .command('add <name> <url>')
    .description('Add a skill source (marketplace or git repo)')
    .option('--type <type>', 'Source type (marketplace or git)', 'marketplace')
    .action(async (name: string, url: string, opts: { type: string }) => {
      if (opts.type !== 'marketplace' && opts.type !== 'git') {
        console.error(chalk.red('Error: --type must be "marketplace" or "git"'));
        process.exit(1);
      }
      const sources = loadSources();
      if (sources[name]) {
        console.log(chalk.yellow(`⚠ Source '${name}' already exists.`));
        return;
      }
      addSource(sources, {
        name,
        type: opts.type as 'marketplace' | 'git',
        url,
        addedAt: new Date().toISOString(),
      });
      console.log(chalk.green(`✓ Added source '${name}' (${opts.type}): ${url}`));
    });

  sourceCmd
    .command('list')
    .description('List configured sources')
    .action(() => {
      const sources = loadSources();
      const entries = Object.values(sources);
      if (entries.length === 0) {
        console.log(chalk.dim('No sources configured. Use "skill source add <name> <url>" to add one.'));
        return;
      }
      for (const s of entries) {
        console.log(`  ${chalk.bold(s.name)} (${s.type}) → ${s.url}`);
      }
    });

  sourceCmd
    .command('remove <name>')
    .description('Remove a skill source')
    .action(async (name: string) => {
      const sources = loadSources();
      if (removeSource(sources, name)) {
        console.log(chalk.green(`✓ Removed source '${name}'.`));
      } else {
        console.error(chalk.red(`Error: Source '${name}' not found.`));
        process.exit(1);
      }
    });

  sourceCmd
    .command('update <name>')
    .description('Update a marketplace source (git pull)')
    .action(async (name: string) => {
      const sources = loadSources();
      const source = sources[name];
      if (!source) {
        console.error(chalk.red(`Error: Source '${name}' not found.`));
        process.exit(1);
      }
      try {
        const handler = getHandler(source);
        await handler.update(source, getSourcesDir());
        source.updatedAt = new Date().toISOString();
        saveSources(sources);
        console.log(chalk.green(`✓ Updated source '${name}'.`));
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
```

- [ ] **Step 2: Smoke test**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
node --import tsx src/cli.ts source add test-source https://example.com/repo.git
node --import tsx src/cli.ts source list
node --import tsx src/cli.ts source remove test-source
```
Expected: Source added, listed, then removed successfully.

- [ ] **Step 3: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/commands/source.ts
git commit -m "feat: add source add/list/remove/update commands"
```

---

### Task 11: Install Command

**Files:**
- Create: `src/commands/install.ts`

- [ ] **Step 1: Write install command**

```typescript
// src/commands/install.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { loadSources, getSourcesDir, getSkillsDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';
import { Registry, SkillEntry } from '../registry.js';
import { simpleGit } from 'simple-git';

export function registerInstallCommand(program: Command): void {
  program
    .command('install <name>')
    .description('Install a skill from configured sources')
    .option('--from <url>', 'Install directly from a Git URL')
    .option('--force', 'Force reinstall if already installed')
    .action(async (name: string, opts: { from?: string; force?: boolean }) => {
      const registry = new Registry();
      
      if (!opts.force && registry.get(name)) {
        console.log(chalk.yellow(`⚠ Skill '${name}' is already installed. Use --force to reinstall.`));
        return;
      }

      // If --from is given, install directly from that URL (git type)
      if (opts.from) {
        console.log(chalk.dim(`Installing from ${opts.from}...`));
        const tempSource = { name: '__direct__', type: 'git' as const, url: opts.from, addedAt: '' };
        const handler = getHandler(tempSource);
        try {
          const relPath = await handler.download(tempSource, name, getSourcesDir(), getSkillsDir());
          // Read the installed SKILL.md to get metadata
          const { parseSkillFile } = await import('../utils/skill-parser.js');
          const { readFileSync } = await import('node:fs');
          const { join, resolve } = await import('node:path');
          const skillMdPath = resolve(getSkillsDir(), relPath, 'SKILL.md');
          const meta = parseSkillFile(readFileSync(skillMdPath, 'utf-8'));
          if (!meta) throw new Error('Installed skill has invalid SKILL.md');
          registry.add({
            name: meta.name,
            description: meta.description,
            source: '__direct__',
            sourceType: 'git',
            sourceUrl: opts.from,
            installPath: `skills/${relPath}`,
            version: 'latest',
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            linkedProjects: [],
          });
          console.log(chalk.green(`✓ Installed '${meta.name}' from ${opts.from}`));
        } catch (err: any) {
          console.error(chalk.red(`Error: ${err.message}`));
          process.exit(1);
        }
        return;
      }

      // Search configured sources
      const sources = loadSources();
      const sourceEntries = Object.values(sources);
      if (sourceEntries.length === 0) {
        console.error(chalk.red('Error: No sources configured. Use "skill source add" first.'));
        process.exit(1);
      }

      for (const source of sourceEntries) {
        const handler = getHandler(source);
        try {
          const skills = await handler.listSkills(source, getSourcesDir());
          const match = skills.find(s => s.name === name);
          if (match) {
            console.log(chalk.dim(`Found '${name}' in source '${source.name}'. Installing...`));
            const relPath = await handler.download(source, name, getSourcesDir(), getSkillsDir());

            // Get version from git
            let version = 'unknown';
            try {
              const git = simpleGit(getSourcesDir() + '/' + source.name);
              const log = await git.log({ maxCount: 1 });
              version = log.latest?.hash?.slice(0, 7) ?? 'unknown';
            } catch {}

            const entry: SkillEntry = {
              name: match.name,
              description: match.description,
              source: source.name,
              sourceType: 'marketplace',
              installPath: `skills/${relPath}`,
              version,
              installedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              linkedProjects: [],
            };
            registry.add(entry);
            console.log(chalk.green(`✓ Installed '${name}' from ${source.name}`));
            return;
          }
        } catch (err: any) {
          console.log(chalk.dim(`  Skipping source '${source.name}': ${err.message}`));
        }
      }

      console.error(chalk.red(`Error: Skill '${name}' not found in any configured source.`));
      console.error(chalk.dim('  Use "skill search <query>" to find skills, or "skill source add" to add more sources.'));
      process.exit(1);
    });
}
```

- [ ] **Step 2: Smoke test — install superpowers source and a skill**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
node --import tsx src/cli.ts source add superpowers https://github.com/obra/superpowers.git
node --import tsx src/cli.ts install brainstorming
```
Expected: Clones superpowers repo to `.sources/`, creates symlink in `skills/superpowers/brainstorming/`.

- [ ] **Step 3: Verify the installed skill**

```bash
ls -la /Users/zhongsjie/Documents/Repository/skills/skills/superpowers/brainstorming/SKILL.md
cat /Users/zhongsjie/Documents/Repository/skills/skills/.registry.json | head -20
```
Expected: SKILL.md is readable, registry.json contains brainstorming entry.

- [ ] **Step 4: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/commands/install.ts
git commit -m "feat: add skill install command"
```

---

### Task 12: List, Search & Info Commands

**Files:**
- Create: `src/commands/list.ts`
- Create: `src/commands/search.ts`
- Create: `src/commands/info.ts`

- [ ] **Step 1: Write list command**

```typescript
// src/commands/list.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List installed skills')
    .option('--source <name>', 'Filter by source')
    .action(async (opts: { source?: string }) => {
      const registry = new Registry();
      let skills = registry.list();
      if (opts.source) {
        skills = skills.filter(s => s.source === opts.source);
      }
      if (skills.length === 0) {
        console.log(chalk.dim('No skills installed. Use "skill install <name>" to install one.'));
        return;
      }
      for (const s of skills) {
        const linked = s.linkedProjects.length > 0
          ? chalk.green(`linked (${s.linkedProjects.length} projects)`)
          : chalk.dim('not linked');
        console.log(`  ${chalk.bold(s.name)} ${chalk.dim(`(${s.source})`)} — ${linked}`);
        if (s.linkedProjects.length > 0) {
          for (const p of s.linkedProjects) {
            console.log(chalk.dim(`    → ${p}`));
          }
        }
      }
    });
}
```

- [ ] **Step 2: Write search command**

```typescript
// src/commands/search.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { loadSources, getSourcesDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <query>')
    .description('Search available skills across all sources')
    .action(async (query: string) => {
      const registry = new Registry();
      const installed = new Set(registry.list().map(s => s.name));
      const sources = loadSources();
      const q = query.toLowerCase();
      let found = 0;

      for (const source of Object.values(sources)) {
        try {
          const handler = getHandler(source);
          const skills = await handler.listSkills(source, getSourcesDir());
          const matches = skills.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q)
          );
          for (const s of matches) {
            found++;
            const status = installed.has(s.name) ? chalk.dim('[installed]') : chalk.green('[available]');
            console.log(`  ${chalk.bold(s.name)} ${status}`);
            console.log(chalk.dim(`    ${s.description}`));
            console.log(chalk.dim(`    source: ${s.source}`));
          }
        } catch (err: any) {
          // Source not available — skip silently
        }
      }

      if (found === 0) {
        console.log(chalk.dim(`No skills found matching "${query}".`));
      }
    });
}
```

- [ ] **Step 3: Write info command**

```typescript
// src/commands/info.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseSkillFile } from '../utils/skill-parser.js';
import { getSkillsDir } from '../sources/config.js';

export function registerInfoCommand(program: Command): void {
  program
    .command('info <name>')
    .description('Show skill details')
    .action(async (name: string) => {
      const registry = new Registry();
      const entry = registry.get(name);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }

      console.log(chalk.bold(`\n${entry.name}`));
      console.log(chalk.dim(`  Description: ${entry.description}`));
      console.log(chalk.dim(`  Source:      ${entry.source} (${entry.sourceType})`));
      console.log(chalk.dim(`  Version:     ${entry.version}`));
      console.log(chalk.dim(`  Installed:   ${entry.installedAt}`));
      console.log(chalk.dim(`  Updated:     ${entry.updatedAt}`));
      
      if (entry.sourceUrl) {
        console.log(chalk.dim(`  URL:         ${entry.sourceUrl}`));
      }

      if (entry.linkedProjects.length > 0) {
        console.log(chalk.green(`  Linked to:`));
        for (const p of entry.linkedProjects) {
          console.log(chalk.dim(`    → ${p}`));
        }
      } else {
        console.log(chalk.dim(`  Linked to:   (none)`));
      }

      // Show full SKILL.md content
      const skillPath = resolve(getSkillsDir(), entry.installPath, 'SKILL.md');
      if (existsSync(skillPath)) {
        console.log(chalk.dim(`\n  ── SKILL.md ──`));
        const meta = parseSkillFile(readFileSync(skillPath, 'utf-8'));
        if (meta && meta.body) {
          // Print first 20 lines of body
          const lines = meta.body.split('\n').slice(0, 20);
          for (const line of lines) {
            console.log(chalk.dim(`  ${line}`));
          }
          if (meta.body.split('\n').length > 20) {
            console.log(chalk.dim(`  ... (truncated)`));
          }
        }
      }
      console.log(); // trailing newline
    });
}
```

- [ ] **Step 4: Smoke test**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
node --import tsx src/cli.ts list
node --import tsx src/cli.ts search brain
node --import tsx src/cli.ts info brainstorming
```
Expected: list shows brainstorming, search shows brainstorming, info shows full metadata.

- [ ] **Step 5: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/commands/list.ts src/commands/search.ts src/commands/info.ts
git commit -m "feat: add list, search, and info commands"
```

---

### Task 13: Link & Unlink Commands

**Files:**
- Create: `src/commands/link.ts`

- [ ] **Step 1: Write link/unlink/linked commands**

```typescript
// src/commands/link.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { createSymlink, removeSymlink, isSymlink, readSymlinkTarget } from '../utils/symlink.js';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

export function registerLinkCommand(program: Command): void {
  program
    .command('link <name>')
    .description('Link a skill into a project')
    .option('--to <path>', 'Target project path (defaults to cwd)')
    .action(async (name: string, opts: { to?: string }) => {
      const registry = new Registry();
      const entry = registry.get(name);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }

      const projectPath = resolve(opts.to ?? process.cwd());
      const claudeSkillsDir = join(projectPath, '.claude', 'skills');

      if (!existsSync(claudeSkillsDir)) {
        console.log(chalk.yellow(`⚠ ${claudeSkillsDir} does not exist.`));
        console.log(chalk.dim(`  Run 'skill init ${projectPath}' first.`));
        return;
      }

      const skillSourceDir = resolve(getSkillsDir(), entry.installPath);
      const linkPath = join(claudeSkillsDir, name);

      if (existsSync(linkPath)) {
        console.log(chalk.yellow(`⚠ ${linkPath} already exists. Use --force to overwrite.`));
        return;
      }

      createSymlink(skillSourceDir, linkPath);
      registry.addLinkedProject(name, projectPath);
      console.log(chalk.green(`✓ Linked '${name}' → ${linkPath}`));
      console.log(chalk.dim(`  The skill is now available in this project.`));
    });

  program
    .command('unlink <name>')
    .description('Unlink a skill from a project')
    .option('--from <path>', 'Target project path (defaults to cwd)')
    .action(async (name: string, opts: { from?: string }) => {
      const registry = new Registry();
      const projectPath = resolve(opts.from ?? process.cwd());
      const linkPath = join(projectPath, '.claude', 'skills', name);

      if (!isSymlink(linkPath)) {
        console.error(chalk.red(`Error: '${name}' is not linked in ${projectPath}.`));
        process.exit(1);
      }

      removeSymlink(linkPath);
      registry.removeLinkedProject(name, projectPath);
      console.log(chalk.green(`✓ Unlinked '${name}' from ${projectPath}`));
    });

  program
    .command('linked [name]')
    .description('Show which projects are linked to a skill, or all links')
    .action(async (name?: string) => {
      const registry = new Registry();

      if (name) {
        const entry = registry.get(name);
        if (!entry) {
          console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
          process.exit(1);
        }
        if (entry.linkedProjects.length === 0) {
          console.log(chalk.dim(`'${name}' is not linked to any project.`));
        } else {
          for (const p of entry.linkedProjects) {
            console.log(`  ${chalk.bold(name)} → ${p}`);
          }
        }
        return;
      }

      const skills = registry.list();
      let hasLinks = false;
      for (const s of skills) {
        if (s.linkedProjects.length > 0) {
          hasLinks = true;
          for (const p of s.linkedProjects) {
            console.log(`  ${chalk.bold(s.name)} → ${p}`);
          }
        }
      }
      if (!hasLinks) {
        console.log(chalk.dim('No skills are linked to any project.'));
      }
    });
}
```

- [ ] **Step 2: Smoke test — link and unlink**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
TMP=$(mktemp -d)
node --import tsx src/cli.ts init "$TMP"
node --import tsx src/cli.ts link brainstorming --to "$TMP"
ls -la "$TMP/.claude/skills/"
node --import tsx src/cli.ts linked brainstorming
node --import tsx src/cli.ts unlink brainstorming --from "$TMP"
node --import tsx src/cli.ts linked
rm -rf "$TMP"
```
Expected: link creates symlink, linked shows the link, unlink removes it.

- [ ] **Step 3: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/commands/link.ts
git commit -m "feat: add link, unlink, and linked commands"
```

---

### Task 14: Remove & Update Commands

**Files:**
- Create: `src/commands/remove.ts`
- Create: `src/commands/update.ts`

- [ ] **Step 1: Write remove command**

```typescript
// src/commands/remove.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { getSkillsDir } from '../sources/config.js';
import { existsSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function registerRemoveCommand(program: Command): void {
  program
    .command('remove <name>')
    .description('Remove an installed skill')
    .option('--force', 'Force removal even if linked')
    .action(async (name: string, opts: { force?: boolean }) => {
      const registry = new Registry();
      const entry = registry.get(name);
      if (!entry) {
        console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
        process.exit(1);
      }

      if (entry.linkedProjects.length > 0 && !opts.force) {
        console.error(chalk.red(`Error: '${name}' is linked to ${entry.linkedProjects.length} project(s):`));
        for (const p of entry.linkedProjects) {
          console.error(chalk.dim(`  → ${p}`));
        }
        console.error(chalk.dim('  Unlink them first: skill unlink <name> --from <path>'));
        console.error(chalk.dim('  Or use --force to remove anyway.'));
        process.exit(1);
      }

      // Remove the skill directory or symlink
      const skillPath = resolve(getSkillsDir(), entry.installPath);
      if (existsSync(skillPath)) {
        rmSync(skillPath, { recursive: true, force: true });
      }

      // Remove empty parent directory for marketplace skills
      if (entry.sourceType === 'marketplace') {
        const parentDir = resolve(getSkillsDir(), entry.source);
        try {
          const remaining = readdirSync(parentDir).filter(f => f !== '.registry.json' && !f.startsWith('.'));
          if (remaining.length === 0) {
            rmSync(parentDir, { recursive: true, force: true });
          }
        } catch {}
      }

      registry.remove(name);
      console.log(chalk.green(`✓ Removed '${name}'.`));
    });
}
```

- [ ] **Step 2: Write update command**

```typescript
// src/commands/update.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Registry } from '../registry.js';
import { loadSources, getSourcesDir } from '../sources/config.js';
import { getHandler } from '../sources/router.js';

export function registerUpdateCommand(program: Command): void {
  program
    .command('update [name]')
    .description('Update installed skills')
    .action(async (name?: string) => {
      const registry = new Registry();
      const sources = loadSources();

      if (name) {
        const entry = registry.get(name);
        if (!entry) {
          console.error(chalk.red(`Error: Skill '${name}' is not installed.`));
          process.exit(1);
        }
        // For marketplace skills, update the source repo
        if (entry.sourceType === 'marketplace') {
          const source = sources[entry.source];
          if (source) {
            try {
              const handler = getHandler(source);
              await handler.update(source, getSourcesDir());
              entry.updatedAt = new Date().toISOString();
              registry.add(entry);
              console.log(chalk.green(`✓ Updated '${name}' (source: ${source.name}).`));
            } catch (err: any) {
              console.error(chalk.red(`Error updating source '${source.name}': ${err.message}`));
              process.exit(1);
            }
          }
        } else {
          // For git skills, pull directly
          try {
            const tempSource = { name: entry.name, type: 'git' as const, url: entry.sourceUrl ?? '', addedAt: '' };
            const handler = getHandler(tempSource);
            await handler.update(tempSource, getSourcesDir(), getSkillsDir());
            entry.updatedAt = new Date().toISOString();
            registry.add(entry);
            console.log(chalk.green(`✓ Updated '${name}'.`));
          } catch (err: any) {
            console.error(chalk.red(`Error updating '${name}': ${err.message}`));
            process.exit(1);
          }
        }
        return;
      }

      // Update all marketplace sources
      const sourceEntries = Object.values(sources);
      if (sourceEntries.length === 0) {
        console.log(chalk.dim('No sources configured.'));
        return;
      }

      for (const source of sourceEntries) {
        if (source.type === 'marketplace') {
          try {
            const handler = getHandler(source);
            await handler.update(source, getSourcesDir());
            console.log(chalk.green(`✓ Updated source '${source.name}'.`));
          } catch (err: any) {
            console.log(chalk.yellow(`⚠ Failed to update '${source.name}': ${err.message}`));
          }
        }
      }

      console.log(chalk.green('✓ All sources updated.'));
    });
}
```

- [ ] **Step 3: Smoke test**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
# Test update
node --import tsx src/cli.ts update brainstorming
# Test that remove checks for links first
node --import tsx src/cli.ts remove brainstorming
```
Expected: update works, remove warns about active links (because we haven't unlinked).

- [ ] **Step 4: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add src/commands/remove.ts src/commands/update.ts
git commit -m "feat: add remove and update commands"
```

---

### Task 15: End-to-End Integration Test

**Files:**
- Create: `test/integration.test.ts`

- [ ] **Step 1: Write integration test script**

```typescript
// test/integration.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = (cmd: string) => {
  try {
    return execSync(`node --import tsx ${resolve(import.meta.dirname, '..', 'src/cli.ts')} ${cmd}`, {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: any) {
    return err.stdout + err.stderr;
  }
};

describe('Integration: full lifecycle', () => {
  it('init → source add → install → link → list → info → unlink → remove', () => {
    const tmpProject = mkdtempSync(join(tmpdir(), 'skill-test-project-'));

    // 1. Init
    const initOut = CLI(`init ${tmpProject}`);
    assert.ok(existsSync(join(tmpProject, '.claude', 'skills')), '.claude/skills should exist');

    // 2. Source add
    CLI('source add superpowers https://github.com/obra/superpowers.git');
    const sourceListOut = CLI('source list');
    assert.ok(sourceListOut.includes('superpowers'), 'source list should include superpowers');

    // 3. Install (a small/fast skill — using-superpowers)
    const installOut = CLI('install using-superpowers');
    assert.ok(installOut.includes('Installed') || installOut.includes('already installed'),
      'install should succeed');

    // 4. List
    const listOut = CLI('list');
    assert.ok(listOut.includes('using-superpowers'), 'list should show installed skill');

    // 5. Info
    const infoOut = CLI('info using-superpowers');
    assert.ok(infoOut.includes('using-superpowers'), 'info should show skill name');

    // 6. Link
    const linkOut = CLI(`link using-superpowers --to ${tmpProject}`);
    const linkPath = join(tmpProject, '.claude', 'skills', 'using-superpowers');
    assert.ok(existsSync(linkPath), 'symlink should exist after link');

    // 7. Linked
    const linkedOut = CLI('linked using-superpowers');
    assert.ok(linkedOut.includes(tmpProject), 'linked should show project path');

    // 8. Unlink
    const unlinkOut = CLI(`unlink using-superpowers --from ${tmpProject}`);
    assert.ok(!existsSync(linkPath), 'symlink should be gone after unlink');

    // 9. Remove
    const removeOut = CLI('remove using-superpowers');
    assert.ok(removeOut.includes('Removed'), 'remove should succeed');

    // Cleanup
    rmSync(tmpProject, { recursive: true });
    console.log('✓ Full lifecycle test passed');
  });
});
```

- [ ] **Step 2: Run the integration test**

```bash
cd /Users/zhongsjie/Documents/Repository/skills && node --import tsx --test test/integration.test.ts
```
Expected: integration test passes (note: requires network for git clone).

- [ ] **Step 3: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add test/integration.test.ts
git commit -m "test: add end-to-end integration test"
```

---

### Task 16: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# Skill Manager

Manage Claude Code skills per-project instead of globally.

## Setup

```bash
# Clone this repo
git clone <this-repo> ~/skills
cd ~/skills
npm install

# Add to PATH (add this to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/skills/bin:$PATH"
```

## Quick Start

```bash
# Add the superpowers skill collection
skill source add superpowers https://github.com/obra/superpowers.git

# Search for available skills
skill search brainstorming

# Install a skill
skill install brainstorming

# Initialize a project for skill linking
skill init ~/my-project

# Link the skill to your project
skill link brainstorming --to ~/my-project

# See what's linked
skill linked
```

## Commands

| Command | Description |
|---------|-------------|
| `skill init [path]` | Create `.claude/skills/` in project |
| `skill source add <name> <url>` | Add a skill source |
| `skill source list` | List configured sources |
| `skill source remove <name>` | Remove a source |
| `skill source update <name>` | Update source repository |
| `skill search <query>` | Search available skills |
| `skill install <name>` | Install a skill |
| `skill install <name> --from <url>` | Install from Git URL |
| `skill list` | List installed skills |
| `skill info <name>` | Show skill details |
| `skill update [name]` | Update skill(s) |
| `skill remove <name>` | Remove a skill |
| `skill link <name> --to <path>` | Link skill to project |
| `skill unlink <name> --from <path>` | Unlink skill from project |
| `skill linked [name]` | Show link status |

## How It Works

Skills are stored in `skills/` and managed via `.registry.json`. Marketplace sources (like superpowers) are cloned to `.sources/` and individual skills are symlinked into `skills/<source>/<name>/`.

When you run `skill link`, it creates a symlink in `<project>/.claude/skills/<name>/` pointing to the actual skill directory. Claude Code can then discover and use the skill in that project.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/zhongsjie/Documents/Repository/skills
git add README.md
git commit -m "docs: add README"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `skill --help` prints all commands
- [ ] `skill source add superpowers https://github.com/obra/superpowers.git` works
- [ ] `skill search brainstorming` finds the skill
- [ ] `skill install brainstorming` installs successfully
- [ ] `skill list` shows brainstorming as installed
- [ ] `skill info brainstorming` shows metadata
- [ ] `skill init /tmp/test-project` creates `.claude/skills/`
- [ ] `skill link brainstorming --to /tmp/test-project` creates correct symlink
- [ ] `skill linked brainstorming` shows the link
- [ ] `skill unlink brainstorming --from /tmp/test-project` removes symlink
- [ ] `skill remove brainstorming` removes the skill
- [ ] `npm test` passes all tests
