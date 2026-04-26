import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import windowStateKeeper from 'electron-window-state';
import { getDb } from './db/connection';
import { runMigrations } from './db/migrations';
import { seedData } from './db/seed';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800,
  });

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindowState.manage(mainWindow);

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerStubHandlers(): void {
  ipcMain.handle('converter:convert', async () => ({ result: '', toUnit: 'min_km' }));
  ipcMain.handle('converter:getHistory', async () => []);
  ipcMain.handle('calorie:getAll', async () => []);
  ipcMain.handle('calorie:create', async () => ({}));
  ipcMain.handle('calorie:update', async () => ({}));
  ipcMain.handle('calorie:delete', async () => undefined);
  ipcMain.handle('daily:getTarget', async () => null);
  ipcMain.handle('daily:setTarget', async () => undefined);
  ipcMain.handle('daily:getItems', async () => []);
  ipcMain.handle('daily:addItem', async () => ({}));
  ipcMain.handle('daily:updateItem', async () => undefined);
  ipcMain.handle('daily:deleteItem', async () => undefined);
  ipcMain.handle('daily:reorder', async () => undefined);
  ipcMain.handle('daily:suggest', async () => null);
  ipcMain.handle('training:getRecords', async () => '');
  ipcMain.handle('training:saveRecords', async () => undefined);
  ipcMain.handle('training:getPlan', async () => '');
  ipcMain.handle('training:savePlan', async () => undefined);
  ipcMain.handle('training:getCoachSuggestion', async () => '');
}

app.whenReady().then(() => {
  const db = getDb();
  runMigrations(db);
  seedData(db);

  registerStubHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
