import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { clearApiKeyCache, loadApiKey } from '../src/main/services/openai';

const TMP_DIR = path.join(os.tmpdir(), `fithelper-test-settings-${process.pid}`);
const KEYS_DIR = path.join(TMP_DIR, 'keys');

describe('loadApiKey', () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    clearApiKeyCache();
    fs.mkdirSync(KEYS_DIR, { recursive: true });
    process.chdir(TMP_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('returns null when no key files exist and safeStorage unavailable', () => {
    const key = loadApiKey();
    expect(key).toBeNull();
  });

  it('reads key from cwd/keys fallback', () => {
    fs.writeFileSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'), '  sk-test-key-123  \n');
    const key = loadApiKey();
    expect(key).toBe('sk-test-key-123');
  });

  it('ignores empty key file', () => {
    fs.writeFileSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'), '   \n');
    const key = loadApiKey();
    expect(key).toBeNull();
  });

  it('caches loaded key and returns same value on subsequent calls', () => {
    fs.writeFileSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'), 'sk-cached');
    const key1 = loadApiKey();
    fs.unlinkSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'));
    const key2 = loadApiKey();
    expect(key1).toBe('sk-cached');
    expect(key2).toBe('sk-cached');
  });

  it('clearApiKeyCache forces re-read', () => {
    fs.writeFileSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'), 'sk-old');
    expect(loadApiKey()).toBe('sk-old');

    clearApiKeyCache();
    fs.writeFileSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'), 'sk-new');
    expect(loadApiKey()).toBe('sk-new');
  });

  it('clearApiKeyCache allows null after key file removed', () => {
    fs.writeFileSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'), 'sk-temp');
    expect(loadApiKey()).toBe('sk-temp');

    clearApiKeyCache();
    fs.unlinkSync(path.join(KEYS_DIR, 'open-ai-api-key.txt'));
    expect(loadApiKey()).toBeNull();
  });
});

describe('getEncryptedKeyPath', () => {
  it('uses FITHELPER_DB_DIR env when set', async () => {
    const origEnv = process.env.FITHELPER_DB_DIR;
    process.env.FITHELPER_DB_DIR = TMP_DIR;
    fs.mkdirSync(TMP_DIR, { recursive: true });

    try {
      const { getEncryptedKeyPath } = await import('../src/main/ipc/settings');
      const keyPath = getEncryptedKeyPath();
      expect(keyPath).toBe(path.join(TMP_DIR, 'api-key.enc'));
    } finally {
      if (origEnv === undefined) {
        delete process.env.FITHELPER_DB_DIR;
      } else {
        process.env.FITHELPER_DB_DIR = origEnv;
      }
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    }
  });
});
