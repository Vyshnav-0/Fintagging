/**
 * Builds the React app, merges backend + static build into one flat folder (no backend/ or frontend/),
 * then creates fintagging-deploy.zip at the project root.
 *
 * Usage: node scripts/make-deploy-zip.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const BUILD = path.join(FRONTEND, 'build');
const OUT = path.join(ROOT, 'fintagging-deploy-flat');
const ZIP = path.join(ROOT, 'fintagging-deploy.zip');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function shouldCopy(srcPath) {
  const n = srcPath.replace(/\\/g, '/');
  if (n.includes('/node_modules') || n.endsWith('node_modules')) return false;
  if (n.includes('/.git/') || n.endsWith('/.git')) return false;
  if (n.endsWith('/.env')) return false;
  return true;
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (!shouldCopy(from)) continue;
    if (e.isDirectory()) {
      copyTree(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function copyBuildInto(dest) {
  if (!fs.existsSync(BUILD)) {
    throw new Error(`Missing ${BUILD}. Run: cd frontend && npm run build`);
  }
  const entries = fs.readdirSync(BUILD, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(BUILD, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyTree(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function writeReadme(dest) {
  const text = `FinTagging — flat deployment package
=====================================

Contents: API (Express) + production React build at the same root (no backend/ or frontend/ folders).

Setup on server
---------------
1. Unzip this archive into your app directory (e.g. site root).
2. Install dependencies:
   npm ci --omit=dev
   (or: npm install --omit=dev)
3. Copy .env.example to .env and set GEMINI_API_KEY, OPENROUTER_API_KEY, PORT, etc.
4. Start:
   node server.js
   (or: npm start  if your package.json "start" runs node server.js)

Static UI is served from this folder; API routes are under /api/*.

Generated: ${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(dest, 'README-DEPLOY.txt'), text, 'utf8');
}

function main() {
  console.log('Building frontend (production)...');
  execSync('npm run build', { cwd: FRONTEND, stdio: 'inherit' });

  console.log('Preparing flat output folder...');
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  console.log('Copying backend (excluding node_modules, .env)...');
  copyTree(BACKEND, OUT);

  console.log('Merging frontend build into root...');
  copyBuildInto(OUT);

  writeReadme(OUT);

  rmrf(ZIP);
  console.log('Creating zip...');
  const isWin = process.platform === 'win32';
  if (isWin) {
    const outWin = OUT.replace(/'/g, "''");
    const zipWin = ZIP.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${outWin}\\*' -DestinationPath '${zipWin}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`cd "${OUT}" && zip -r "${ZIP}" .`, { stdio: 'inherit' });
  }

  console.log(`Done: ${ZIP}`);
  console.log(`Flat folder (unzipped preview): ${OUT}`);
}

main();
