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
