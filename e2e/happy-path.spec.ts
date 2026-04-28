import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import os from 'os';
import fs from 'fs';
import path from 'path';

let app: ElectronApplication;
let page: Page;
let tmpDir: string;

test.beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fithelper-e2e-'));
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    ELECTRON_SERVE_BUILT: '1',
    FITHELPER_DB_DIR: tmpDir,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    args: ['.'],
    env,
  });
  page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Dismiss the welcome wizard if it appears (first launch).
  const wizardOverlay = page.locator('[style*="z-index: 10000"]');
  if (await wizardOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Step 1 → click Get Started
    await page.getByRole('button', { name: /get started/i }).click();
    // Step 2 → click the last button (Next →)
    const btns = page.locator('[style*="z-index: 10000"] button');
    await btns.last().click();
    // Step 3 → click Skip for now
    await page.getByText(/skip for now/i).click();
    // Step 4 → click Start Using FitHelper
    await page.getByRole('button', { name: /start using fithelper/i }).click();
    // Wait for wizard to disappear
    await wizardOverlay.waitFor({ state: 'detached', timeout: 3000 });
  }
});

test.afterAll(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function clickSidebarItem(index: number) {
  const buttons = page.locator('aside nav button');
  await buttons.nth(index).click();
}

test.describe.serial('Welcome Wizard', () => {
  test('wizard sets onboarding-done flag and does not reappear', async () => {
    // By this point beforeAll already dismissed the wizard; confirm it's gone.
    await expect(page.locator('[style*="z-index: 10000"]')).toHaveCount(0);

    // Verify the localStorage flag was set via evaluating in the renderer.
    const flag = await page.evaluate(() => localStorage.getItem('fithelper-onboarding-done'));
    expect(flag).toBe('true');
  });
});

test.describe.serial('Sidebar navigation', () => {
  test('renders all 5 sidebar items and navigates', async () => {
    const sidebarButtons = page.locator('aside nav button');
    await expect(sidebarButtons).toHaveCount(5);

    for (let i = 0; i < 5; i++) {
      await sidebarButtons.nth(i).click();
      const heading = page.locator('main h1');
      await expect(heading).toBeVisible();
    }
  });
});

test.describe.serial('Pace Converter: 5.2 mph -> min/km', () => {
  test('converts 5.2 mph and displays result with history', async () => {
    await clickSidebarItem(0);

    const input = page.locator('input[placeholder="5.2"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('5.2');
    await input.press('Enter');

    await expect(page.getByText('7:10 min/km', { exact: true })).toBeVisible({ timeout: 5000 });

    const historyEntries = page.getByText(/5\.2 mph.*7:10 min\/km/);
    expect(await historyEntries.count()).toBeGreaterThan(0);
  });
});

test.describe.serial('Calorie Library: add item and verify', () => {
  test('preset items are loaded (not empty)', async () => {
    await clickSidebarItem(1);

    const kcalItems = page.locator('text=kcal');
    await expect(kcalItems.first()).toBeVisible({ timeout: 5000 });
    expect(await kcalItems.count()).toBeGreaterThan(0);
  });

  test('adds a new item and it appears in the list', async () => {
    const addButton = page.locator('main button', { hasText: /^\+\s*(Add|添加)/ });
    await addButton.click();

    const inputs = page.locator('main input');
    const nameInput = inputs.nth(1);
    const caloriesInput = inputs.nth(2);

    await nameInput.fill('E2E测试食品');
    await caloriesInput.fill('777');

    const categorySelect = page.locator('main select');
    await categorySelect.selectOption('小食');

    const okButton = page.locator('main button', { hasText: /^(OK|确定)$/ });
    await okButton.click();

    await expect(page.locator('text=E2E测试食品')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=777 kcal')).toBeVisible();
  });
});
