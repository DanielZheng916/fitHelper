import { app, BrowserWindow } from 'electron';
import path from 'path';
import windowStateKeeper from 'electron-window-state';
import { getDb } from './db/connection';
import { runMigrations } from './db/migrations';
import { seedData } from './db/seed';
import { registerConverterHandlers } from './ipc/converter';
import { registerCalorieHandlers } from './ipc/calorieLib';
import { registerDailyHandlers } from './ipc/dailyTracker';
import { registerTrainingHandlers } from './ipc/training';
import { registerSettingsHandlers } from './ipc/settings';

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

  const serveBuilt = app.isPackaged || process.env.ELECTRON_SERVE_BUILT === '1';
  if (serveBuilt) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const db = getDb();
  runMigrations(db);
  seedData(db);

  registerConverterHandlers(db);
  registerCalorieHandlers(db);
  registerDailyHandlers(db);
  registerTrainingHandlers(db);
  registerSettingsHandlers();
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
