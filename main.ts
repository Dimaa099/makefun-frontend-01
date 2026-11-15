// Ledgerline — the handover program for the makefun-frontend-01 entry
// (Node 22, standard library only; Node runs this TypeScript as written).
//
// The frontend itself is the static app in app/ beside this file: index.html
// plus ES modules and one stylesheet, no build step, reading make.fun's public
// API in the browser. This program hands it in: it copies app/ and
// screenshots/ into the output directory and writes dossier.json there with
// buildDossier from vendor/makefun-frontend.ts — the kit's library, kept byte
// for byte, because the gate rebuilds the dossier with its own copy and
// compares the two.
//
// In the grader the output directory is /output; anywhere else,
// MAKEFUN_OUTPUT_DIR stands in for it:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// To look at the app while developing: `node serve.ts`, then
// http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, passed to the library so a dossier that would be
// refused is never written: at most 993 files and directories and 16 MiB in
// app/, at most 3 screenshots of at most 256 KiB each, and the dossier text
// capped at 160 KiB.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

mkdirSync(outputDir, { recursive: true });
// Start the two copied trees from empty: the grader's /output is fresh, but a
// repeated local run into the same directory must not let a file deleted from
// the repo linger in the output and leak into the dossier.
rmSync(join(outputDir, 'app'), { recursive: true, force: true });
rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outputDir, GATE);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// A short handover report on stderr (stdout stays clean): what was copied and
// how large the dossier came out, so a local run can be eyeballed against the
// gate's caps without opening the JSON.
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}
const appFiles = [...walk(join(outputDir, 'app'))];
const appBytes = appFiles.reduce((sum, file) => sum + statSync(file).size, 0);
console.error(
  `Ledgerline handed in: ${appFiles.length} app files, ${(appBytes / 1024).toFixed(1)} KiB of app, ` +
  `${(Buffer.byteLength(dossier) / 1024).toFixed(1)} KiB dossier -> ${outputDir}`,
);
