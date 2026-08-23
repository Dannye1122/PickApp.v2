import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const versionTsPath = path.join(rootDir, 'src', 'constants', 'version.ts');
const appStatusPath = path.join(rootDir, 'public', 'app_status.json');

const args = process.argv.slice(2);
const bumpType = args[0] || 'patch'; // 'patch', 'minor', 'major', or specific version '1.7.1'

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version || '1.7.0';

function incrementVersion(version, type) {
  const parts = version.split('.').map(num => parseInt(num, 10) || 0);
  while (parts.length < 3) parts.push(0);

  if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else if (type === 'patch') {
    parts[2] += 1;
  } else if (/^\d+\.\d+(\.\d+)?$/.test(type)) {
    return type;
  } else {
    console.error(`Unknown bump type or invalid version format: "${type}". Use 'patch', 'minor', 'major', or a version string like '1.7.1'.`);
    process.exit(1);
  }

  return parts.slice(0, 3).join('.');
}

const newVersion = incrementVersion(currentVersion, bumpType);
console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);

// 1. Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Updated ${packageJsonPath}`);

// 2. Update src/constants/version.ts
const versionTsContent = `export const APP_VERSION = '${newVersion}';\n`;
fs.writeFileSync(versionTsPath, versionTsContent);
console.log(`Updated ${versionTsPath}`);

// 3. Update public/app_status.json if it exists
if (fs.existsSync(appStatusPath)) {
  try {
    const appStatus = JSON.parse(fs.readFileSync(appStatusPath, 'utf8'));
    appStatus.latest_version = newVersion;
    appStatus.app_version = newVersion;
    appStatus.updated_at = new Date().toISOString();
    fs.writeFileSync(appStatusPath, JSON.stringify(appStatus, null, 2) + '\n');
    console.log(`Updated ${appStatusPath}`);
  } catch (err) {
    console.warn(`Could not update ${appStatusPath}:`, err.message);
  }
}

console.log(`\nVersion ${newVersion} ready! You can now commit and push to GitHub with:`);
console.log(`  git add .`);
console.log(`  git commit -m "chore(release): v${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin main --tags`);
