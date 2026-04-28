import { ipcMain, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { clearApiKeyCache } from '../services/openai';

const ENC_FILENAME = 'api-key.enc';

export function getEncryptedKeyPath(): string {
  const dir = process.env.FITHELPER_DB_DIR || path.join(os.homedir(), '.fithelper');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, ENC_FILENAME);
}

export function readEncryptedKey(): string | null {
  const filePath = getEncryptedKeyPath();
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length === 0) return null;
    return safeStorage.decryptString(buf);
  } catch {
    return null;
  }
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getApiKeyStatus', () => {
    const key = readEncryptedKey();
    return { configured: !!key };
  });

  ipcMain.handle('settings:setApiKey', (_event, args: { key: string }) => {
    const trimmed = args.key.trim();
    if (!trimmed) throw new Error('API key cannot be empty');

    const encrypted = safeStorage.encryptString(trimmed);
    fs.writeFileSync(getEncryptedKeyPath(), encrypted);
    clearApiKeyCache();
  });

  ipcMain.handle('settings:clearApiKey', () => {
    const filePath = getEncryptedKeyPath();
    try {
      fs.unlinkSync(filePath);
    } catch {
      // file may not exist
    }
    clearApiKeyCache();
  });
}
