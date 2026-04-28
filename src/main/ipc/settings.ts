import { ipcMain, safeStorage, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';
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

  ipcMain.handle('settings:testApiKey', async (_event, args: { key: string }) => {
    try {
      const client = new OpenAI({ apiKey: args.key });
      await client.models.list();
      return { valid: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { valid: false, error: msg };
    }
  });

  ipcMain.handle('settings:testSavedKey', async () => {
    const key = readEncryptedKey();
    if (!key) {
      return { valid: false, error: 'No API key configured. Add your key in Settings first.' };
    }
    try {
      const client = new OpenAI({ apiKey: key });
      await client.models.list();
      return { valid: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { valid: false, error: msg };
    }
  });

  ipcMain.handle('settings:openKeyManagement', () => {
    shell.openExternal('https://platform.openai.com/api-keys');
  });
}
