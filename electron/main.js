const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let mainWindow;
let backendProcess;

function startBackend() {
  const backendScript = isDev
    ? path.resolve(__dirname, '../backend/dist/index.js')
    : path.resolve(process.resourcesPath, 'backend/dist/index.js');

  const dbPath = path.join(app.getPath('userData'), 'bodytrack.db');
  const uploadsPath = path.join(app.getPath('userData'), 'uploads');

  backendProcess = spawn(process.execPath, [backendScript], {
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      UPLOAD_DIR: uploadsPath,
      PORT: '3001',
      JWT_SECRET: process.env.JWT_SECRET || 'bodytrack-local-secret',
    },
    stdio: 'inherit',
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (!isDev) {
      app.quit();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.resolve(__dirname, '../web/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (!isDev) {
    startBackend();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
