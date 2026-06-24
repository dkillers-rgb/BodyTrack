const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const isBackendChild = process.env.BODYTRACK_BACKEND === '1' || (
  process.env.ELECTRON_RUN_AS_NODE === '1' &&
  process.argv[1] && /backend[\\/]dist[\\/]index\.js$/.test(process.argv[1])
);

if (isBackendChild) {
  const backendScript = path.resolve(process.argv[1]);
  fs.appendFileSync(path.join(app.getPath('userData'), 'electron-debug.log'), `[${new Date().toISOString()}] Backend child process detected: ${backendScript}\n`);
  try {
    require(backendScript);
  } catch (err) {
    fs.appendFileSync(path.join(app.getPath('userData'), 'electron-debug.log'), `[${new Date().toISOString()}] Backend child require failed: ${err.stack || err}\n`);
    process.exit(1);
  }
  return;
}

const logPath = path.join(app.getPath('userData'), 'electron-debug.log');
function log(message) {
  const text = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, text);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
  console.log(message);
}

const isDev = !app.isPackaged;
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow;
let backendProcess;

log(`Starting Electron. isDev=${isDev}, appPath=${app.getAppPath()}, userData=${app.getPath('userData')}`);

if (!gotTheLock) {
  log('Another instance detected; quitting.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

function startBackend() {
  return new Promise((resolve, reject) => {
    const backendScript = isDev
      ? path.resolve(__dirname, '../backend/dist/index.js')
      : path.resolve(app.getAppPath(), 'backend/dist/index.js');

    log(`Resolved backend script path: ${backendScript}`);
    log(`resourcesPath: ${process.resourcesPath}`);
    log(`appPath: ${app.getAppPath()}`);
    try {
      const exists = fs.existsSync(backendScript);
      log(`Backend script exists: ${exists}`);
    } catch (err) {
      log(`Failed to check backend script exists: ${err.message || err}`);
    }

    const dbPath = path.join(app.getPath('userData'), 'bodytrack.db');
    const uploadsPath = path.join(app.getPath('userData'), 'uploads');

    const backendEnv = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      BODYTRACK_BACKEND: '1',
      BODYTRACK_DESKTOP: '1',
      DATABASE_URL: `file:${dbPath}`,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
      UPLOAD_DIR: uploadsPath,
      PORT: '3001',
      JWT_SECRET: process.env.JWT_SECRET || 'bodytrack-local-secret',
      BODYTRACK_API_URL: 'http://127.0.0.1:3001',
    };

    log(`Spawning backend process with execPath=${process.execPath}`);
    log(`Backend env sample: DATABASE_URL=${backendEnv.DATABASE_URL}, PORT=${backendEnv.PORT}, ELECTRON_RUN_AS_NODE=${backendEnv.ELECTRON_RUN_AS_NODE}`);

    backendProcess = spawn(process.execPath, [backendScript], {
      cwd: path.dirname(backendScript),
      env: backendEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const readyTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Backend did not start within 15 seconds'));
      }
    }, 15000);

    backendProcess.on('error', (err) => {
      log(`Backend process failed to start: ${err.message || err}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(readyTimeout);
        reject(err);
      }
    });

    backendProcess.stdout.on('data', (chunk) => {
      const message = chunk.toString().trim();
      log(`[backend stdout] ${message}`);
      if (!resolved && message.includes('BodyTrack API rodando')) {
        resolved = true;
        clearTimeout(readyTimeout);
        resolve();
      }
    });

    backendProcess.stderr.on('data', (chunk) => {
      log(`[backend stderr] ${chunk.toString().trim()}`);
    });

    backendProcess.on('exit', (code) => {
      log(`Backend process exited with code ${code}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(readyTimeout);
        reject(new Error(`Backend exited before ready: ${code}`));
      }
      if (!isDev) {
        // Do not quit immediately; keep app open for debugging if backend fails.
        log('Backend exited unexpectedly, keeping Electron running for inspection.');
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, 'preload.js'),
      devTools: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.resolve(__dirname, '../web/dist/index.html'));
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  log('App ready.');
  if (!isDev) {
    try {
      await startBackend();
      log('Backend started successfully.');
    } catch (err) {
      log(`Backend startup failed: ${err.message || err}`);
    }
  }
  createWindow();

  app.on('activate', () => {
    log('App activate event.');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('All windows closed.');
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.stack || error}`);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`);
});
