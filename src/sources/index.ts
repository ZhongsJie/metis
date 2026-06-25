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
  /** Download/install a specific skill from this source. Returns relative install path. */
  download(source: SkillSource, skillName: string, sourcesDir: string, skillsDir: string): Promise<string>;
  /** Update the source (pull latest) */
  update(source: SkillSource, sourcesDir: string, skillsDir?: string): Promise<void>;
}
