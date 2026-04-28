import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── IPC handler registry ──────────────────────────────────────────────────────
const handlers = new Map<string, Function>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: Function) => handlers.set(channel, fn),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((s: string) => Buffer.from(s)),
    decryptString: vi.fn((b: Buffer) => b.toString()),
  },
  shell: { openExternal: vi.fn() },
}));

// ── OpenAI mock — use vi.hoisted so the variable is available in the factory ──
const mockModelsList = vi.hoisted(() => vi.fn());

vi.mock('openai', () => ({
  default: vi.fn(function (this: unknown) {
    (this as { models: { list: typeof mockModelsList } }).models = { list: mockModelsList };
  }),
}));

async function invoke(channel: string, args?: unknown) {
  const fn = handlers.get(channel);
  if (!fn) throw new Error(`No handler registered for ${channel}`);
  return fn({}, args);
}

// ── Test temp dir ─────────────────────────────────────────────────────────────
const TMP_DIR = path.join(os.tmpdir(), `fithelper-test-testapi-${process.pid}`);
const KEY_FILE = path.join(TMP_DIR, 'api-key.enc');

describe('settings:testApiKey handler', () => {
  beforeEach(async () => {
    handlers.clear();
    mockModelsList.mockReset();
    vi.resetModules();
    process.env.FITHELPER_DB_DIR = TMP_DIR;
    fs.mkdirSync(TMP_DIR, { recursive: true });

    const { registerSettingsHandlers } = await import('../src/main/ipc/settings');
    registerSettingsHandlers();
  });

  it('returns { valid: true } when OpenAI call succeeds', async () => {
    mockModelsList.mockResolvedValueOnce({ data: [] });

    const result = await invoke('settings:testApiKey', { key: 'sk-valid-key' });

    expect(result).toEqual({ valid: true });
    expect(mockModelsList).toHaveBeenCalledOnce();
  });

  it('returns { valid: false, error } when OpenAI throws', async () => {
    mockModelsList.mockRejectedValueOnce(new Error('Invalid API key'));

    const result = await invoke('settings:testApiKey', { key: 'sk-bad-key' });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid API key');
  });

  it('returns { valid: false } for non-Error throws', async () => {
    mockModelsList.mockRejectedValueOnce('string error');

    const result = await invoke('settings:testApiKey', { key: 'sk-bad-key' });

    expect(result.valid).toBe(false);
    expect(typeof result.error).toBe('string');
  });
});

describe('settings:testSavedKey handler', () => {
  beforeEach(async () => {
    handlers.clear();
    mockModelsList.mockReset();
    vi.resetModules();
    process.env.FITHELPER_DB_DIR = TMP_DIR;
    fs.mkdirSync(TMP_DIR, { recursive: true });

    const { registerSettingsHandlers } = await import('../src/main/ipc/settings');
    registerSettingsHandlers();
  });

  it('returns { valid: false, error } when no key is configured', async () => {
    try { fs.unlinkSync(KEY_FILE); } catch { /* file may not exist */ }

    const result = await invoke('settings:testSavedKey');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/no api key/i);
  });

  it('returns { valid: true } when saved key passes OpenAI check', async () => {
    fs.writeFileSync(KEY_FILE, Buffer.from('sk-saved-valid'));
    mockModelsList.mockResolvedValueOnce({ data: [] });

    const result = await invoke('settings:testSavedKey');

    expect(result).toEqual({ valid: true });
  });

  it('returns { valid: false, error } when saved key fails OpenAI check', async () => {
    fs.writeFileSync(KEY_FILE, Buffer.from('sk-saved-bad'));
    mockModelsList.mockRejectedValueOnce(new Error('Unauthorized'));

    const result = await invoke('settings:testSavedKey');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });
});
