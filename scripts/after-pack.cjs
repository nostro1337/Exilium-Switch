const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'win32') return;

  const appOutDir = context.appOutDir;
  const exePath = path.join(appOutDir, 'Exilium Switch.exe');
  const iconPath = path.resolve(__dirname, '../build/icon.ico');
  const version = context.packager?.appInfo?.version || '1.5.6';

  // Ensure app-update.yml exists in resources
  const updateYmlSource = path.resolve(__dirname, '../build/app-update.yml');
  const updateYmlDest = path.join(appOutDir, 'resources/app-update.yml');
  if (fs.existsSync(updateYmlSource)) {
    fs.copyFileSync(updateYmlSource, updateYmlDest);
    console.log(`[afterPack] Ensured app-update.yml in ${updateYmlDest}`);
  }

  // Ensure icon.ico and icon.png exist in resources for runtime
  const resDir = path.join(appOutDir, 'resources');
  if (!fs.existsSync(resDir)) fs.mkdirSync(resDir, { recursive: true });
  const iconIcoSrc = path.resolve(__dirname, '../build/icon.ico');
  const iconPngSrc = path.resolve(__dirname, '../build/icon.png');
  if (fs.existsSync(iconIcoSrc)) fs.copyFileSync(iconIcoSrc, path.join(resDir, 'icon.ico'));
  if (fs.existsSync(iconPngSrc)) fs.copyFileSync(iconPngSrc, path.join(resDir, 'icon.png'));

  // Find rcedit-x64.exe
  let rceditPath = null;
  const cacheBase = path.join(process.env.LOCALAPPDATA || '', 'electron-builder/Cache');
  function findRcedit(dir) {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findRcedit(full);
        if (found) return found;
      } else if (entry.name === 'rcedit-x64.exe') {
        return full;
      }
    }
    return null;
  }

  rceditPath = findRcedit(cacheBase);

  if (rceditPath && fs.existsSync(exePath)) {
    console.log(`[afterPack] Patching icon, manifest (requireAdministrator), and metadata on ${exePath}...`);
    try {
      execFileSync(rceditPath, [
        exePath,
        '--set-icon', iconPath,
        '--set-requested-execution-level', 'requireAdministrator',
        '--set-version-string', 'FileDescription', 'Exilium Switch',
        '--set-version-string', 'ProductName', 'Exilium Switch',
        '--set-version-string', 'CompanyName', 'Nostro',
        '--set-version-string', 'LegalCopyright', 'Copyright © 2026 Nostro',
        '--set-version-string', 'OriginalFilename', 'Exilium Switch.exe',
        '--set-version-string', 'InternalName', 'Exilium Switch',
        '--set-product-version', version,
        '--set-file-version', version
      ], { stdio: 'inherit' });
      console.log('[afterPack] Successfully patched Exilium Switch.exe!');
    } catch (err) {
      console.error('[afterPack] Error patching with rcedit:', err.message);
    }
  } else {
    console.warn(`[afterPack] rcedit (${rceditPath}) or exe (${exePath}) not found!`);
  }
};
