import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');

mkdirSync(publicDir, { recursive: true });

copyFileSync(
  join(root, 'SKILL.md'),
  join(publicDir, 'skill.md')
);

console.log('Synced SKILL.md → public/skill.md');
