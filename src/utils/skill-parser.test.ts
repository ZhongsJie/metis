import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSkillFile } from './skill-parser.js';

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
