import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// Ensure output directory exists
mkdirSync(outputDir, { recursive: true });

// Base bot directory (handles execution from arbitrary working directory)
const botDir = process.env.MAKEFUN_BOT_DIR ?? resolve(import.meta.dirname ?? '.');

// Copy game/ and screenshots/ directories
const srcGame = resolve(botDir, 'game');
const srcScreenshots = resolve(botDir, 'screenshots');

const destGame = resolve(outputDir, 'game');
const destScreenshots = resolve(outputDir, 'screenshots');

if (existsSync(srcGame)) {
  mkdirSync(destGame, { recursive: true });
  cpSync(srcGame, destGame, { recursive: true });
}

if (existsSync(srcScreenshots)) {
  mkdirSync(destScreenshots, { recursive: true });
  cpSync(srcScreenshots, destScreenshots, { recursive: true });
}

// Generate dossier.json using makefun-game library
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

const dossierPath = resolve(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossierBytes);

console.log(`[Cyber Strike] Dossier generated successfully at ${dossierPath}`);
console.log(`[Cyber Strike] Dossier size: ${dossierBytes.length} bytes`);
console.log('[Cyber Strike] Build complete and verified.');
