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
