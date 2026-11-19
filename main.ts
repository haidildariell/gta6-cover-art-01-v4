// main.ts — Sunset Palms Cover Press entrypoint (Node 22, stdlib only).
//
// Hands the built app in: copies app/ and screenshots/ from this repository
// into the output directory and writes dossier.json with the kit library's
// buildDossier. Runs twice must produce byte-identical output, so there are
// no timestamps, no random values and directory entries are copied in a
// fixed sorted order.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const DOSSIER_CAPS = {
  // These caps are the gate's own limits from the competition rules: the
  // dossier text cap, the screenshot count/size caps, and the app caps.
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
} as const;

// The directory this file lives in is the repository root.
function repositoryRoot(): string {
  return dirname(fileURLToPath(import.meta.url));
}

// Where the entry goes: MAKEFUN_OUTPUT_DIR outside the grader, /output in it.
function outputDirectory(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv && fromEnv.length > 0) return resolve(fromEnv);
  return '/output';
}

function copyTreeInto(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, dereference: false });
}

function buildEntry(): void {
  const root = repositoryRoot();
  const outDir = outputDirectory();

  // Start from an empty output directory so stale files can never leak in.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const appDir = join(root, 'app');
  copyTreeInto(appDir, join(outDir, 'app'));

  const shotsDir = join(root, 'screenshots');
  if (existsSync(shotsDir)) {
    copyTreeInto(shotsDir, join(outDir, 'screenshots'));
  }

  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

buildEntry();
