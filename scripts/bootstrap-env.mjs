import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const envPath = '.env';
const templatePath = '.env.example';

if (!existsSync(templatePath)) {
  console.error('Missing .env.example.');
  process.exit(1);
}

if (!existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(templatePath, 'utf8'));
  console.log('Created .env from .env.example');
}

const content = readFileSync(envPath, 'utf8');
const lines = content.split(/\r?\n/);

let changed = false;
const port = process.env.PORT || '5000';

const isPlaceholder = (key, current) => {
  if (!current) return true;

  const normalized = current.trim().toLowerCase();
  if (normalized === 'changeme') return true;
  if (normalized.includes('replace-with')) return true;

  if (key === 'DISCORD_CLIENT_ID' || key === 'DISCORD_CLIENT_SECRET' || key === 'DATABASE_URL') {
    return false;
  }

  return false;
};

const setIfEmpty = (key, value) => {
  const idx = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (idx === -1) {
    lines.push(`${key}=${value}`);
    changed = true;
    return;
  }
  const current = lines[idx].slice(key.length + 1).trim();
  if (isPlaceholder(key, current)) {
    lines[idx] = `${key}=${value}`;
    changed = true;
  }
};

setIfEmpty('APP_URL', `http://localhost:${port}`);
setIfEmpty('SESSION_SECRET', randomBytes(32).toString('hex'));

if (changed) {
  writeFileSync(envPath, `${lines.join('\n').trimEnd()}\n`);
  console.log('Updated missing defaults in .env');
} else {
  console.log('.env already has required defaults.');
}

console.log('Next: set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DATABASE_URL in .env');
