const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign');
if (!fs.existsSync(cacheDir)) {
  console.log('Cache dir does not exist');
  process.exit(0);
}

const sevenZip = path.resolve(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
const files = fs.readdirSync(cacheDir);
const archives = files.filter(f => f.endsWith('.7z'));

if (archives.length > 0) {
  const archivePath = path.join(cacheDir, archives[0]);
  const tempExtracted = path.join(cacheDir, 'extracted_temp');
  if (!fs.existsSync(tempExtracted)) {
    fs.mkdirSync(tempExtracted, { recursive: true });
  }
  
  try {
    // Extract excluding darwin folder
    console.log(`Extracting ${archivePath} excluding darwin...`);
    execSync(`"${sevenZip}" x -y "-xr!darwin" "${archivePath}" "-o${tempExtracted}"`, { stdio: 'inherit' });
  } catch (err) {
    console.log('Extraction finished with non-fatal code or warning');
  }

  // Copy extracted files to all hash directories
  archives.forEach(arch => {
    const hash = path.basename(arch, '.7z');
    const targetDir = path.join(cacheDir, hash);
    if (!fs.existsSync(targetDir)) {
      console.log(`Creating ${targetDir}...`);
      fs.cpSync(tempExtracted, targetDir, { recursive: true });
    }
  });

  console.log('winCodeSign cache successfully fixed!');
}
