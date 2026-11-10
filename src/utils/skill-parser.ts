import matter from 'gray-matter';

export interface SkillMeta {
  name: string;
  description: string;
  body: string;
}

export function parseSkillFile(content: string): SkillMeta | null {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    // Repos scanned wholesale may contain malformed frontmatter; treat it the
    // same as a non-skill file rather than aborting the whole scan.
    return null;
  }
  const { data, content: body } = parsed;
  if (!data.name || !data.description) return null;
  return {
    name: data.name,
    description: data.description,
    body: body.trim(),
  };
}
