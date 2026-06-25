export interface SkillSource {
  /** Source name (e.g. "superpowers") */
  name: string;
  /** Source type */
  type: 'git';
  /** Git URL */
  url: string;
  /** When the source was added */
  addedAt: string;
  /** Last time source was updated */
  updatedAt?: string;
}

export interface AvailableSkill {
  id: string;
  name: string;
  description: string;
  source: string;
  installPath: string;
}
